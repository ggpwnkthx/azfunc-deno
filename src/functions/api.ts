import { bind, defineFunction } from "@azure/functions";
import { compileDiagnostics } from "@azure/functions/lib/debug/mod.ts";

export default defineFunction({
  name: "api",
  bindings: [
    bind.http.trigger({
      name: "req",
      route: "{*route}",
      authLevel: "anonymous",
    }),
    bind.http.output({ name: "res" }),
  ],
  async handler(payload, ctx) {
    const req = payload.Data.req;
    const params = req.Params ?? {};
    const routeRaw = params.route ?? "";
    const route = "/" + routeRaw.replace(/^\/+/, "");

    if (route === "/diagnostics" || routeRaw === "diagnostics") {
      return Response.json(await compileDiagnostics(payload, ctx));
    }

    const body = route === "/json" ? { hello: "world" } : {
      deno: { version: Deno.version.deno },
      request: { url: req.Url, method: req.Method },
      matched: {
        function: ctx.functionName,
        params: params,
      },
    };

    return Response.json(body);
  },
});
