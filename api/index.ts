import { bindings, defineHttpFunction } from "@azure/functions";

export const api = defineHttpFunction({
  dir: "api",
  functionJson: {
    bindings: [
      bindings.httpTrigger({
        name: "req",
        route: "{route}",
        authLevel: "anonymous",
      }),
      bindings.httpOut({ name: "res" }),
    ],
  },
  handler(request, ctx) {
    console.debug(request);
    const routeRaw = ctx.params.route ?? "";
    const route = "/" + routeRaw.replace(/^\/+/, "");

    if (route === "/json") {
      return Response.json({ ReturnValue: { hello: "world" } });
    }

    return Response.json({
      ReturnValue: {
        deno: { version: Deno.version.deno },
        request: { url: request.url },
        matched: {
          function: ctx.functionDir,
          routePrefix: ctx.routePrefix,
          route,
        },
      },
    });
  },
});
