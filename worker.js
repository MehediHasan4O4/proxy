export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing ?url= parameter", { status: 400 });
    }

    const response = await fetch(target, {
      headers: {
        "Referer": target,
        "Origin": "null",
      },
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "*");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
