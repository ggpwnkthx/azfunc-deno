import { buildAzureFunctionsRouter } from "./src/azure/router.ts";

const port = Number.parseInt(
  Deno.env.get("FUNCTIONS_CUSTOMHANDLER_PORT") ?? "8000",
  10,
);

const routePrefix =
  Deno.env.get("AzureFunctionsJobHost__extensions__http__routePrefix") ??
    Deno.env.get("FUNCTIONS_HTTP_ROUTE_PREFIX") ??
    "api";

const router = buildAzureFunctionsRouter(functions, { routePrefix });

console.log(
  `Custom handler listening on :${port} (http routePrefix="${routePrefix}")`,
);

Deno.serve({ port }, (req: Request) => router.handle(req));
