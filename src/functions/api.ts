import { bind, defineFunction } from "@azure/functions";

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
  handler(payload, ctx) {
    const req = payload.Data.req;
    const routeRaw = ctx.params?.route ?? "";
    const route = "/" + routeRaw.replace(/^\/+/, "");

    if (route === "/diagnostics" || routeRaw === "diagnostics") {
      // Diagnostics endpoint - return empty for now
      return Response.json({ error: "diagnostics not available" });
    }

    const body = route === "/json" ? { hello: "world" } : {
      deno: { version: Deno.version.deno },
      request: { url: req.Url, method: req.Method },
      matched: {
        function: ctx.functionDir,
        routePrefix: ctx.routePrefix,
        rawPathname: ctx.rawPathname,
        params: ctx.params,
      },
    };

    return Response.json(body);
  },
});
