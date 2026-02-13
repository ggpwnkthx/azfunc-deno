import { join as joinPath } from "@std/path";
import type {
  AppContext,
  FunctionDefinition,
  HttpFunctionDefinition,
} from "./define.ts";
import type { AzureFunctionsApp } from "./app.ts";
import {
  asAzureHttpRequestData,
  type InvokeRequest,
  type InvokeResponse,
  invokeResponseFromHttpResponse,
  parseInvokeRequest,
  toDenoRequest,
} from "./invoke.ts";
import { readJsonBodyLimited } from "./lib/json.ts";
import { toErrorPayload } from "./lib/errors.ts";

export interface RouterOptions {
  routePrefix?: string;
  maxInvokeBodyBytes?: number;
  maxHttpResponseBodyBytes?: number;
}

export interface AzureFunctionsRouter {
  handle(req: Request): Promise<Response>;
}

/**
 * Create an AppContext from an AzureFunctionsApp instance.
 */
function createAppContext(app: AzureFunctionsApp): AppContext {
  return {
    app: {
      list: () => app.list(),
    },
  };
}

function normalizePrefix(prefix: string): string {
  const p = prefix.trim().replace(/^\/+|\/+$/g, "");
  return p === "" ? "" : p;
}

function extractFunctionName(pathname: string): string {
  return pathname.replace(/^\/+/, "").split("/")[0] ?? "";
}

export function resolveRoutePrefixFromEnv(): string | undefined {
  return Deno.env.get("AzureFunctionsJobHost__extensions__http__routePrefix") ??
    Deno.env.get("FUNCTIONS_HTTP_ROUTE_PREFIX");
}

interface HostJsonConfig {
  extensions?: {
    http?: {
      routePrefix?: string;
    };
  };
}

export function resolveRoutePrefixFromHostJson(
  hostJsonPath: string = joinPath(Deno.cwd(), "host.json"),
): string | undefined {
  try {
    const content = Deno.readTextFileSync(hostJsonPath);
    const config: HostJsonConfig = JSON.parse(content);
    const prefix = config.extensions?.http?.routePrefix;
    return typeof prefix === "string" ? normalizePrefix(prefix) : undefined;
  } catch {
    return undefined;
  }
}

async function coerceHttpHandlerResult(
  fn: HttpFunctionDefinition,
  out: Response | InvokeResponse,
  maxBodyBytes: number,
): Promise<InvokeResponse> {
  if (out instanceof Response) {
    return await invokeResponseFromHttpResponse(fn.http.outName, out, {
      maxBodyBytes,
    });
  }
  return out;
}

/**
 * Non-proxying custom handler behavior:
 * For HTTP-trigger functions, always return 200 to the host with an InvokeResponse,
 * encoding the caller-visible error into the http output binding.
 */
async function httpInvokeErrorResponse(
  fn: HttpFunctionDefinition,
  err: unknown,
  maxBodyBytes: number,
): Promise<Response> {
  const p = toErrorPayload(err);
  const callerRes = Response.json(p.body, { status: p.status });

  const invokeRes = await invokeResponseFromHttpResponse(
    fn.http.outName,
    callerRes,
    { maxBodyBytes },
  );

  return Response.json(invokeRes, { status: 200 });
}

export function buildAzureFunctionsRouter(
  functions: readonly FunctionDefinition[],
  options: RouterOptions = {},
  app?: AzureFunctionsApp,
): AzureFunctionsRouter {
  const routePrefix = normalizePrefix(options.routePrefix ?? "api");
  const maxInvokeBodyBytes = options.maxInvokeBodyBytes ?? 1024 * 1024;
  const maxHttpResponseBodyBytes = options.maxHttpResponseBodyBytes ??
    4 * 1024 * 1024;

  const appCtx = app ? createAppContext(app) : undefined;

  const map = new Map<string, FunctionDefinition>();
  for (const fn of functions) map.set(fn.name, fn);

  return {
    async handle(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const fnName = extractFunctionName(url.pathname);

      if (req.method !== "POST") {
        return Response.json(
          {
            error: "MethodNotAllowed",
            message:
              "Custom handler endpoints are invoked by the Functions host using POST.",
            request: { method: req.method, pathname: url.pathname },
          },
          { status: 405 },
        );
      }

      const fn = map.get(fnName);
      if (!fn) {
        return Response.json(
          {
            error: "NotFound",
            message: "No function matched this invocation path.",
            request: { pathname: url.pathname },
            knownFunctions: [...map.keys()].sort(),
          },
          { status: 404 },
        );
      }

      try {
        const raw = await readJsonBodyLimited(req, maxInvokeBodyBytes);
        const invokeReq = parseInvokeRequest(raw);

        if (fn.kind === "trigger") {
          const ctx = { functionDir: fn.name, rawPathname: url.pathname };
          const out = await invokeTriggerHandler(
            fn.handler as unknown as (...args: unknown[]) => unknown,
            invokeReq,
            ctx,
            appCtx,
          );
          return Response.json(out, { status: 200 });
        }

        const httpFn = fn as HttpFunctionDefinition;

        const httpReqData = asAzureHttpRequestData(
          invokeReq.Data[httpFn.http.triggerName],
        );
        const denoReq = toDenoRequest(httpReqData);
        const rawPathname = new URL(httpReqData.Url).pathname;

        const ctx = {
          functionDir: httpFn.name,
          routePrefix,
          rawPathname,
          params: httpReqData.Params ?? {},
        };

        const out = await invokeHandler(
          httpFn.handler as unknown as (...args: unknown[]) => unknown,
          denoReq,
          ctx,
          appCtx,
        );

        const invokeRes = await coerceHttpHandlerResult(
          httpFn,
          out as Response | InvokeResponse,
          maxHttpResponseBodyBytes,
        );

        return Response.json(invokeRes, { status: 200 });
      } catch (err) {
        if (fn.kind === "http") {
          return await httpInvokeErrorResponse(
            fn as HttpFunctionDefinition,
            err,
            maxHttpResponseBodyBytes,
          );
        }

        // Non-HTTP triggers: fail the invocation (host can retry / record failure)
        const p = toErrorPayload(err);
        return Response.json(p.body, {
          status: p.status >= 400 ? p.status : 500,
        });
      }
    },
  };
}

/**
 * Invoke a handler with variable arity support.
 * Handlers can receive 1-3 parameters depending on their signature.
 */
async function invokeHandler(
  handler: (...args: unknown[]) => unknown,
  req: Request,
  ctx: import("./define.ts").HttpContext,
  appCtx?: AppContext,
): Promise<Response | InvokeResponse> {
  const arity = handler.length;
  if (arity >= 3 && appCtx) {
    return await handler(req, ctx, appCtx) as Response | InvokeResponse;
  } else if (arity === 2) {
    return await handler(req, ctx) as Response | InvokeResponse;
  } else {
    return await handler(req) as Response | InvokeResponse;
  }
}

/**
 * Invoke a trigger handler with variable arity support.
 */
async function invokeTriggerHandler(
  handler: (...args: unknown[]) => unknown,
  payload: InvokeRequest,
  ctx: import("./define.ts").TriggerContext,
  appCtx?: AppContext,
): Promise<InvokeResponse> {
  const arity = handler.length;
  if (arity >= 3 && appCtx) {
    return await handler(payload, ctx, appCtx) as InvokeResponse;
  } else if (arity === 2) {
    return await handler(payload, ctx) as InvokeResponse;
  } else {
    return await handler(payload) as InvokeResponse;
  }
}
