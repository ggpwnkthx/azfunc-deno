import {
  type AppContext,
  bind,
  defineTriggerFunction,
  type InvokeRequest,
  type TriggerContext,
} from "@azure/functions";
import type { AzureHttpRequestData } from "@azure/functions";
import { compileDiagnostics } from "@azure/functions/lib/debug.ts";

type HttpData = {
  req: AzureHttpRequestData;
};

export default defineTriggerFunction<InvokeRequest<HttpData>, Response>({
  name: "api",
  bindings: [
    bind.http.trigger({
      name: "req",
      route: "{*route}",
      authLevel: "anonymous",
    }),
    bind.http.output({ name: "res" }),
  ],
  handler(
    payload: InvokeRequest<HttpData>,
    ctx: TriggerContext,
    appCtx: AppContext,
  ): Response {
    const req = payload.Data.req;
    const routeRaw = ctx.params?.route ?? "";
    const route = "/" + routeRaw.replace(/^\/+/, "");

    if (route === "/diagnostics" || routeRaw === "diagnostics") {
      return Response.json(compileDiagnostics(appCtx, req, ctx));
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
