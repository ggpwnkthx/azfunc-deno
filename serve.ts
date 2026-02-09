import router from "./src/azure/functions/router.ts";

const port = Number.parseInt(
  Deno.env.get("FUNCTIONS_CUSTOMHANDLER_PORT") ?? "8080",
  10,
);

Deno.serve({ port }, (req: Request) => router.handle(req));
