import {
  bindings,
  defineTriggerFunction,
  type HttpContext,
  type InvokeResponse,
} from "@azure/functions";

export const api = defineTriggerFunction({
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
  handler(request: Request, ctx: HttpContext): InvokeResponse {
    const routeRaw = ctx.params.route ?? "";
    const route = "/" + routeRaw.replace(/^\/+/, "");

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

    // Custom handler HTTP output binding: set Outputs.<httpOutBindingName>
    return {
      Outputs: {
        res: {
          statusCode: 200,
          headers: {
            "Content-Type": ["application/json; charset=utf-8"],
          },
          body: JSON.stringify(body),
        },
      },
    };
  },
});
