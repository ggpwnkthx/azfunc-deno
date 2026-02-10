import type {
  FunctionDefinition,
  HttpFunctionDefinition,
  HttpHandler,
  TriggerFunctionDefinition,
  TriggerHandler,
} from "./define.ts";
import {
  asAzureHttpRequestData,
  type InvokeResponse,
  invokeResponseFromHttpResponse,
  parseInvokeRequest,
  toDenoRequest,
} from "./invoke.ts";
import { readJsonBodyLimited } from "./lib/json.ts";
import { toErrorPayload } from "./lib/errors.ts";
import { discoverFunctions } from "./scanner.ts";

interface RouterOptions {
  routePrefix?: string;
  maxInvokeBodyBytes?: number;
  maxHttpResponseBodyBytes?: number;
}

export interface CreateRouterOptions extends RouterOptions {
  rootDir?: string;
}

export interface AzureFunctionsRouter {
  handle(req: Request): Promise<Response>;
}

function normalizePrefix(prefix: string): string {
  const p = prefix.trim().replace(/^\/+|\/+$/g, "");
  return p === "" ? "" : p;
}

function extractFunctionName(pathname: string): string {
  return pathname.replace(/^\/+/, "").split("/")[0] ?? "";
}

export function resolveRoutePrefixFromEnv(fallback = "api"): string {
  return Deno.env.get("AzureFunctionsJobHost__extensions__http__routePrefix") ??
    Deno.env.get("FUNCTIONS_HTTP_ROUTE_PREFIX") ??
    fallback;
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
    {
      maxBodyBytes,
    },
  );

  return Response.json(invokeRes, { status: 200 });
}

export function buildAzureFunctionsRouter(
  functions: readonly FunctionDefinition[],
  options: RouterOptions = {},
): AzureFunctionsRouter {
  const routePrefix = normalizePrefix(options.routePrefix ?? "api");
  const maxInvokeBodyBytes = options.maxInvokeBodyBytes ?? 1024 * 1024;
  const maxHttpResponseBodyBytes = options.maxHttpResponseBodyBytes ??
    4 * 1024 * 1024;

  const map = new Map<string, FunctionDefinition>();
  for (const fn of functions) map.set(fn.dir, fn);

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
          const triggerFn = fn as TriggerFunctionDefinition;
          const ctx = { functionDir: triggerFn.dir, rawPathname: url.pathname };
          const out = await (triggerFn.handler as TriggerHandler)(
            invokeReq as never,
            ctx,
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
          functionDir: httpFn.dir,
          routePrefix,
          rawPathname,
          params: httpReqData.Params ?? {},
        };

        const out = await (httpFn.handler as HttpHandler)(denoReq, ctx);

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

export async function createAzureFunctionsRouter(
  options: CreateRouterOptions = {},
): Promise<AzureFunctionsRouter> {
  const rootDir = options.rootDir ?? Deno.cwd();
  const routePrefix = options.routePrefix ?? resolveRoutePrefixFromEnv("api");
  const functions = await discoverFunctions(rootDir);

  return buildAzureFunctionsRouter(functions, {
    routePrefix,
    maxInvokeBodyBytes: options.maxInvokeBodyBytes,
    maxHttpResponseBodyBytes: options.maxHttpResponseBodyBytes,
  });
}
