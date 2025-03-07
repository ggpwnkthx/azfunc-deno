export default {
  fetch(request: Request) {
    if (request.url.startsWith("/json")) {
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
  },
};
