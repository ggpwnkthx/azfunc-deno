import type {
  FunctionDefinition,
  HttpFunctionDefinition,
  TriggerFunctionDefinition,
} from "./define.ts";
import {
  asAzureHttpRequestData,
  type InvokeResponse,
  invokeResponseFromHttpResponse,
  parseInvokeRequest,
  toDenoRequest,
} from "./invoke.ts";
import { toErrorResponse } from "./lib/errors.ts";
import { readJsonBodyLimited } from "./lib/json.ts";
import { discoverFunctions } from "./scanner.ts";

interface RouterOptions {
  /**
   * Azure Functions HTTP route prefix (host.json extensions.http.routePrefix).
   * Default: "api"
   *
   * Note: In non-proxying custom handler mode, routing to the handler is
   * performed by function name (folder name), but this is still useful context.
   */
  routePrefix?: string;

  /** Max bytes to buffer when parsing invocation JSON payloads. Default: 1 MiB */
  maxInvokeBodyBytes?: number;

  /**
   * Max bytes to buffer when converting a returned `Response` into
   * Outputs.<httpOut>.body. Default: 4 MiB.
   */
  maxHttpResponseBodyBytes?: number;
}

export interface CreateRouterOptions extends RouterOptions {
  /** Where function folders live (default: Deno.cwd()) */
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
  // Azure uses double-underscore for nested config keys.
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
    const httpOutName = fn.httpOutput?.name ?? "res";
    return await invokeResponseFromHttpResponse(httpOutName, out, {
      maxBodyBytes,
    });
  }
  return out;
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
      try {
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

        const raw = await readJsonBodyLimited(req, maxInvokeBodyBytes);
        const invokeReq = parseInvokeRequest(raw);

        if (fn.kind === "trigger") {
          const triggerFn = fn as TriggerFunctionDefinition;
          const out = await triggerFn.handler(invokeReq as never, {
            functionDir: triggerFn.dir,
            rawPathname: url.pathname,
          });
          return Response.json(out);
        }

        const httpFn = fn as HttpFunctionDefinition;
        const triggerName = httpFn.httpTrigger.name;
        const httpReqData = asAzureHttpRequestData(invokeReq.Data[triggerName]);

        const denoReq = toDenoRequest(httpReqData);
        const rawPathname = new URL(httpReqData.Url).pathname;

        const ctx = {
          functionDir: httpFn.dir,
          routePrefix,
          rawPathname,
          params: httpReqData.Params ?? {},
        };

        const out = await httpFn.handler(
          denoReq,
          ctx,
        );

        const invokeRes = await coerceHttpHandlerResult(
          httpFn,
          out as Response | InvokeResponse,
          maxHttpResponseBodyBytes,
        );

        return Response.json(invokeRes);
      } catch (err) {
        return toErrorResponse(err);
      }
    },
  };
}

/**
 * Async factory: discovers functions, then builds the router.
 * IMPORTANT: no top-level await in this module (prevents discovery deadlocks during scanning).
 */
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
