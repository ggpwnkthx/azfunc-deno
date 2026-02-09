import type {
  FunctionDefinition,
  HttpFunctionDefinition,
  TriggerFunctionDefinition,
} from "./define.ts";
import { AppError, toErrorResponse } from "./lib/errors.ts";
import { readJsonBodyLimited } from "./lib/json.ts";

interface RouterOptions {
  /**
   * Azure Functions HTTP route prefix (host.json extensions.http.routePrefix).
   * Default: "api"
   */
  routePrefix?: string;
  /** Max bytes to buffer when parsing trigger JSON payloads. Default: 1 MiB */
  maxTriggerBodyBytes?: number;
}

export interface AzureFunctionsRouter {
  handle(req: Request): Promise<Response>;
}

interface CompiledRoute {
  template: string;
  regex: RegExp;
  paramNames: readonly string[];
  specificity: number;
  methods?: readonly string[];
  fn: HttpFunctionDefinition;
}

function normalizePrefix(prefix: string): string {
  const p = prefix.trim().replace(/^\/+|\/+$/g, "");
  return p === "" ? "" : p;
}

function stripPrefix(pathname: string, prefix: string): string | null {
  const cleanPath = pathname.replace(/\/+$/g, "") || "/";
  const cleanPrefix = normalizePrefix(prefix);
  if (cleanPrefix === "") {
    return cleanPath === "/" ? "" : cleanPath.replace(/^\/+/, "");
  }

  const prefixPath = `/${cleanPrefix}`;
  if (cleanPath === prefixPath) return "";
  if (cleanPath.startsWith(prefixPath + "/")) {
    return cleanPath.slice(prefixPath.length + 1);
  }
  return null;
}

function escapeRegExp(lit: string): string {
  return lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileTemplate(template: string): {
  regex: RegExp;
  paramNames: readonly string[];
  specificity: number;
} {
  const trimmed = template.trim().replace(/^\/+|\/+$/g, "");
  if (trimmed === "") {
    return { regex: /^$/, paramNames: [], specificity: 10 };
  }

  const segments = trimmed.split("/").filter((s) => s.length > 0);
  const paramNames: string[] = [];
  const parts: string[] = [];
  let specificity = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    const catchAll = seg.match(/^\{\*([A-Za-z0-9_]+)\}$/);
    if (catchAll) {
      if (i !== segments.length - 1) {
        throw new AppError(
          "DEFINITION",
          `Route template "${template}" has a catch-all segment not in the last position.`,
        );
      }
      const name = catchAll[1];
      paramNames.push(name);
      // allow empty catch-all
      parts.push("(?:/(.*))?");
      specificity += 0;
      continue;
    }

    const optional = seg.match(/^\{([A-Za-z0-9_]+)\?\}$/);
    if (optional) {
      const name = optional[1];
      paramNames.push(name);
      parts.push("(?:/([^/]+))?");
      specificity += 1;
      continue;
    }

    const param = seg.match(/^\{([A-Za-z0-9_]+)\}$/);
    if (param) {
      const name = param[1];
      paramNames.push(name);
      parts.push("/([^/]+)");
      specificity += 2;
      continue;
    }

    parts.push("/" + escapeRegExp(seg));
    specificity += 5;
  }

  const regex = new RegExp("^" + parts.join("") + "$");
  return { regex, paramNames, specificity };
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function matchCompiledRoute(
  compiled: CompiledRoute,
  pathNoLeadingSlash: string,
): Record<string, string> | null {
  const path = pathNoLeadingSlash.replace(/^\/+|\/+$/g, "");
  const m = compiled.regex.exec(path === "" ? "" : "/" + path);
  if (!m) return null;

  const out: Record<string, string> = {};
  for (let i = 0; i < compiled.paramNames.length; i++) {
    const name = compiled.paramNames[i]!;
    const raw = m[i + 1];
    if (typeof raw === "string") out[name] = decodeParam(raw);
  }
  return out;
}

function buildHttpRoutes(
  fns: readonly HttpFunctionDefinition[],
): CompiledRoute[] {
  const routes: CompiledRoute[] = [];

  for (const fn of fns) {
    const { regex, paramNames, specificity } = compileTemplate(
      fn.httpTrigger.route,
    );
    routes.push({
      template: fn.httpTrigger.route,
      regex,
      paramNames,
      specificity,
      methods: fn.httpTrigger.methods,
      fn,
    });
  }

  // Prefer more specific routes (more literals, fewer wildcards)
  routes.sort((a, b) => b.specificity - a.specificity);
  return routes;
}

function methodAllowed(
  methods: readonly string[] | undefined,
  requestMethod: string,
): boolean {
  if (!methods || methods.length === 0) return true;
  const rm = requestMethod.toUpperCase();
  return methods.some((m) => m.toUpperCase() === rm);
}

export function buildAzureFunctionsRouter(
  functions: readonly FunctionDefinition[],
  options: RouterOptions = {},
): AzureFunctionsRouter {
  const routePrefix = normalizePrefix(options.routePrefix ?? "api");
  const maxTriggerBodyBytes = options.maxTriggerBodyBytes ?? 1024 * 1024;

  const seen = new Set<string>();
  for (const fn of functions) {
    if (seen.has(fn.dir)) {
      throw new AppError("DEFINITION", `Duplicate function dir: "${fn.dir}".`);
    }
    seen.add(fn.dir);
  }

  const triggerMap = new Map<string, TriggerFunctionDefinition>();
  const httpFns: HttpFunctionDefinition[] = [];

  for (const fn of functions) {
    if (fn.kind === "trigger") triggerMap.set(fn.dir, fn);
    else httpFns.push(fn);
  }

  const httpRoutes = buildHttpRoutes(httpFns);

  return {
    async handle(req: Request): Promise<Response> {
      try {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Non-HTTP triggers (Queue/Blob/etc): Azure custom handler posts to /<FunctionName>
        if (req.method === "POST" && pathname.startsWith("/") && pathname !== "/") {
          const functionName = pathname.slice(1);
          const triggerFn = triggerMap.get(functionName);
          if (triggerFn) {
            const payload = await readJsonBodyLimited(req, maxTriggerBodyBytes);
            const res = await triggerFn.handler(payload, {
              functionDir: triggerFn.dir,
              rawPathname: pathname,
            });
            return res;
          }
        }

        // HTTP triggers: route based on function.json httpTrigger.route
        const relA = stripPrefix(pathname, routePrefix); // e.g. "/api/users/1" -> "users/1"
        const candidates = new Set<string>();
        if (relA !== null) candidates.add(relA);
        // Be defensive: if runtime doesn't include the prefix, try raw.
        candidates.add(pathname.replace(/^\/+/, ""));

        for (const rel of candidates) {
          for (const compiled of httpRoutes) {
            if (!methodAllowed(compiled.methods, req.method)) continue;

            const params = matchCompiledRoute(compiled, rel);
            if (!params) continue;

            const out = await compiled.fn.handler(req, {
              functionDir: compiled.fn.dir,
              routePrefix,
              rawPathname: pathname,
              params,
            });
            return out;
          }
        }

        return Response.json(
          {
            error: "NotFound",
            message: "No function route matched this request.",
            request: { method: req.method, pathname },
          },
          { status: 404 },
        );
      } catch (err) {
        return toErrorResponse(err);
      }
    },
  };
}
