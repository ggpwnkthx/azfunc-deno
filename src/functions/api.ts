import {
  type AppContext,
  bindings,
  defineHttpFunction,
  type HttpContext,
} from "@azure/functions";
import { compileDiagnostics } from "@azure/functions/lib/debug.ts";

export default defineHttpFunction({
  name: "api",
  config: {
    bindings: [
      bindings.httpTrigger({
        name: "req",
        route: "{*route}",
        authLevel: "anonymous",
      }),
      bindings.httpOut({ name: "res" }),
    ],
  },
  handler(request: Request, ctx: HttpContext, appCtx: AppContext): Response {
    const routeRaw = ctx.params.route ?? "";
    const route = "/" + routeRaw.replace(/^\/+/, "");

    // Diagnostic endpoint
    if (route === "/diagnostics" || routeRaw === "diagnostics") {
      const diagnostics = compileDiagnostics(appCtx, request, ctx);

      return Response.json(diagnostics, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    }

    const body = route === "/json" ? { hello: "world" } : {
      deno: { version: Deno.version.deno },
      request: { url: request.url, method: request.method },
      matched: {
        function: ctx.functionDir,
        routePrefix: ctx.routePrefix,
        rawPathname: ctx.rawPathname,
        params: ctx.params,
      },
    };

    return Response.json(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  },
});
