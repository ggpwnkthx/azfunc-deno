import { join as joinPath } from "@std/path";
import type { Context, FunctionDefinition } from "./define.ts";
import type { AzureFunctionsApp } from "./app.ts";
import { isHttpTriggerBinding } from "./bindings/index.ts";
import {
  type InvokeResponse,
  invokeResponseFromHttpResponse,
  parseInvokeRequest,
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

const json = (status: number, body: unknown): Response =>
  Response.json(body, { status });

function createAppContext(
  functions: readonly FunctionDefinition[],
  app?: AzureFunctionsApp,
): Readonly<Pick<Context, "app">> {
  return { app: { list: () => app?.list() ?? functions } };
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
  extensions?: { http?: { routePrefix?: string } };
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

function getHttpOutputName(fn: FunctionDefinition): string {
  return fn.bindings.byType.get("http")?.[0]?.name ?? "$return";
}

export function buildAzureFunctionsRouter(
  functions: readonly FunctionDefinition[],
  options: RouterOptions = {},
  app?: AzureFunctionsApp,
): AzureFunctionsRouter {
  const maxInvokeBodyBytes = options.maxInvokeBodyBytes ?? 1024 * 1024;
  const maxHttpResponseBodyBytes = options.maxHttpResponseBodyBytes ??
    4 * 1024 * 1024;

  const appCtx = createAppContext(functions, app);

  const byName = new Map<string, FunctionDefinition>();
  for (const fn of functions) byName.set(fn.name, fn);

  const toInvokeHttpJson = async (
    fn: FunctionDefinition,
    res: Response,
  ): Promise<Response> => {
    const outName = getHttpOutputName(fn);
    const invokeRes = await invokeResponseFromHttpResponse(outName, res, {
      maxBodyBytes: maxHttpResponseBodyBytes,
    });
    return json(200, invokeRes);
  };

  return {
    async handle(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const fnName = extractFunctionName(url.pathname);

      if (req.method !== "POST") {
        return json(405, {
          error: "MethodNotAllowed",
          message:
            "Custom handler endpoints are invoked by the Functions host using POST.",
          request: { method: req.method, pathname: url.pathname },
        });
      }

      const fn = byName.get(fnName);
      if (!fn) {
        return json(404, {
          error: "NotFound",
          message: "No function matched this invocation path.",
          request: { pathname: url.pathname },
          knownFunctions: [...byName.keys()].sort(),
        });
      }

      const trigger = fn.bindings.trigger;
      const isHttp = !!trigger && isHttpTriggerBinding(trigger);

      try {
        const raw = await readJsonBodyLimited(req, maxInvokeBodyBytes);
        const invokeReq = parseInvokeRequest(raw);

        const ctx: Context = { functionName: fn.name, ...appCtx };

        const out = await fn.handler(invokeReq, ctx);

        if (out instanceof Response) {
          if (!isHttp) {
            return json(500, {
              error: "BadResponseType",
              message: "Non-HTTP triggers must return an InvokeResponse.",
            });
          }
          return await toInvokeHttpJson(fn, out);
        }

        return json(200, out as InvokeResponse);
      } catch (err) {
        const p = toErrorPayload(err);

        if (isHttp) {
          return await toInvokeHttpJson(fn, json(p.status, p.body));
        }

        return json(p.status >= 400 ? p.status : 500, p.body);
      }
    },
  };
}
