export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing ?url= parameter", { status: 400 });
    }

    // Allow only .m3u8 files for safety
    if (!target.endsWith(".m3u8")) {
      return new Response("Only .m3u8 URLs are allowed", { status: 403 });
    }

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    try {
      const response = await fetch(target, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (HLS Proxy)",
          "Accept": "*/*",
          "Referer": target,
        },
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "*");
      newHeaders.set("Content-Type", "application/vnd.apple.mpegurl");

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response("Proxy error: " + err.message, { status: 500 });
    }
  },
};
