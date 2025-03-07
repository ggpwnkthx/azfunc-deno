export default {
  fetch(request: Request) {
    if (request.url.startsWith("/json")) {
      return Response.json({ hello: "world" });
    }
    return new Response("Hello world!");
  },
};
