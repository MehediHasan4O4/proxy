// worker.js - Cloudflare Worker proxy for .m3u8 and .mpd streaming
export default {
  async fetch(request) {
    const reqUrl = new URL(request.url);
    if (request.method === "OPTIONS") {
      // Handle CORS preflight
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Expect target either as ?url=<url> or path like /proxy?url=...
    const rawTarget = reqUrl.searchParams.get("url");
    if (!rawTarget) {
      return new Response("Missing ?url= parameter", { status: 400, headers: corsHeaders() });
    }

    // Parse a pipe-suffix pattern: "https://..../stream.m3u8|Referer=https://example.com"
    // Support multiple pipe params if needed (we only look for Referer now)
    function splitPipe(s) {
      const [urlPart, ...rest] = s.split("|");
      const params = {};
      for (const r of rest) {
        const [k, ...v] = r.split("=");
        if (!k) continue;
        params[k.trim()] = decodeURIComponent(v.join("=").trim());
      }
      return { url: urlPart.trim(), params };
    }

    const { url: targetUrlRaw, params } = splitPipe(rawTarget);
    let target;
    try {
      target = new URL(targetUrlRaw);
    } catch (e) {
      return new Response("Invalid target URL", { status: 400, headers: corsHeaders() });
    }

    // Build fetch headers: forward Range, User-Agent, Accept, and optionally Referer
    const forwardHeaders = new Headers();
    const incoming = request.headers;
    const forwardList = ["range", "user-agent", "accept", "accept-language", "cookie", "authorization"];
    for (const h of forwardList) {
      const v = incoming.get(h);
      if (v) forwardHeaders.set(h, v);
    }
    // If referer provided through pipe param, set it. Otherwise optional caller header.
    if (params.Referer || params.Referer) {
      forwardHeaders.set("referer", params.Referer || params.Referer);
    } else if (incoming.get("referer")) {
      forwardHeaders.set("referer", incoming.get("referer"));
    }

    // Some servers require an Origin or specific headers. Do NOT force a wrong origin.
    // Optionally set Origin to blank to emulate some players (you can change/remove this).
    forwardHeaders.set("origin", "null");

    // Use same method as original (GET/HEAD)
    const method = request.method === "HEAD" ? "HEAD" : "GET";

    // Fetch the target
    let fetched;
    try {
      fetched = await fetch(target.toString(), {
        method,
        headers: forwardHeaders,
        redirect: "follow",
      });
    } catch (err) {
      return new Response("Upstream fetch failed: " + err.message, { status: 502, headers: corsHeaders() });
    }

    // Copy response headers, but adjust CORS and some security headers
    const newHeaders = new Headers(fetched.headers);

    // Remove any restrictive CORS headers from upstream to avoid conflicts
    newHeaders.delete("access-control-allow-origin");
    newHeaders.delete("access-control-allow-methods");
    newHeaders.delete("access-control-allow-headers");

    // Set allowed CORS headers for browser usage
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "Range, User-Agent, Accept, Content-Type");
    // Expose Range headers if the player needs them
    newHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

    // If content is an .m3u8 playlist (HLS), rewrite playlist links so they point back to this proxy
    const contentType = (fetched.headers.get("content-type") || "").toLowerCase();
    const pathnameLower = target.pathname.toLowerCase();

    const isM3U8 =
      contentType.includes("application/vnd.apple.mpegurl") ||
      contentType.includes("application/x-mpegurl") ||
      pathnameLower.endsWith(".m3u8") ||
      target.toString().toLowerCase().includes(".m3u8");

    if (isM3U8) {
      const bodyText = await fetched.text();

      // The origin + path to proxy back to this worker
      const base = new URL(request.url).origin;

      // Rewrite absolute http/https URLs in playlist to point back to the proxy
      // We also keep any existing pipe-suffix (if upstream links already had them)
      const rewritten = bodyText.replace(
        /^(https?:\/\/[^\s#\r\n]+)$/gim,
        (match) => {
          // If match already contains a pipe param, don't double-encode; include as-is
          // But safest is to pass original url as ?url=<encoded>|Referer=<encoded upstream>
          const encoded = encodeURIComponent(match);
          // Pass referer as the original target host by default
          const upstreamReferer = target.origin;
          return `${base}/?url=${encoded}|Referer=${encodeURIComponent(upstreamReferer)}`;
        }
      );

      // Return rewritten playlist
      // content-length changed; avoid setting it manually
      newHeaders.set("content-type", "application/vnd.apple.mpegurl");
      return new Response(rewritten, {
        status: fetched.status,
        headers: newHeaders,
      });
    }

    // For other content (segments, mpd, mp4), return streamed response while keeping CORS headers
    // Use response.body (stream) to avoid buffering
    return new Response(fetched.body, {
      status: fetched.status,
      headers: newHeaders,
    });
  },
};

// Helper: standard CORS headers used for preflight
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, User-Agent, Accept, Content-Type",
  };
}
