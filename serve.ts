const port = parseInt(Deno.env.get("FUNCTIONS_CUSTOMHANDLER_PORT") || "8000");

Deno.serve({ port }, (request: Request) => {
  // Remove "/api" from path
  const route = (new URL(request.url)).pathname.substring(4);

  if (route === "/json") {
    return Response.json({ hello: "world" });
  }

  return Response.json({
    deno: {
      version: Deno.version.deno
    },
    request: {
      url: request.url
    }
  });
});
