addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === "/m3u8-proxy") {
    return handleM3U8Proxy(request);
  } else if (url.pathname === "/ts-proxy") {
    return handleTsProxy(request);
  }

  return new Response("Not Found", { status: 404 });
}

// CORS config
const options = {
  originBlacklist: [],
  originWhitelist: ["*"],
};

const isOriginAllowed = (origin, options) => {
  if (options.originWhitelist.includes("*")) return true;
  if (
    options.originWhitelist.length &&
    !options.originWhitelist.includes(origin)
  )
    return false;
  if (
    options.originBlacklist.length &&
    options.originBlacklist.includes(origin)
  )
    return false;
  return true;
};

// ---------- M3U8 Handler ----------
async function handleM3U8Proxy(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const headers = JSON.parse(searchParams.get("headers") || "{}");
  const origin = request.headers.get("Origin") || "";

  if (!isOriginAllowed(origin, options)) {
    return new Response(`The origin "${origin}" is not allowed.`, {
      status: 403,
    });
  }
  if (!targetUrl) {
    return new Response("Missing ?url=", { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
        ...headers,
      },
    });

    if (!response.ok) {
      return new Response("Failed to fetch playlist", { status: response.status });
    }

    let m3u8 = await response.text();

    // Remove audio-only tracks to simplify
    m3u8 = m3u8
      .split("\n")
      .filter((line) => !line.startsWith("#EXT-X-MEDIA:TYPE=AUDIO"))
      .join("\n");

    const base = new URL(targetUrl);
    const lines = m3u8.split("\n");
    const proxied = lines.map((line) => {
      if (line.startsWith("#")) {
        if (line.startsWith("#EXT-X-KEY:")) {
          const match = line.match(/URI="([^"]+)"/);
          if (match) {
            const keyUrl = new URL(match[1], base).href;
            const newKeyUrl = `/ts-proxy?url=${encodeURIComponent(
              keyUrl
            )}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
            return line.replace(match[1], newKeyUrl);
          }
        }
        return line;
      } else if (line.trim().length > 0) {
        const segUrl = new URL(line, base).href;
        return `/ts-proxy?url=${encodeURIComponent(
          segUrl
        )}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
      } else {
        return line;
      }
    });

    return new Response(proxied.join("\n"), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (error) {
    return new Response("M3U8 proxy error: " + error.message, { status: 500 });
  }
}

// ---------- TS Handler ----------
async function handleTsProxy(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const headers = JSON.parse(searchParams.get("headers") || "{}");
  const origin = request.headers.get("Origin") || "";

  if (!isOriginAllowed(origin, options)) {
    return new Response(`The origin "${origin}" is not allowed.`, {
      status: 403,
    });
  }
  if (!targetUrl) {
    return new Response("Missing ?url=", { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
        ...headers,
      },
    });

    if (!response.ok) {
      return new Response("Failed to fetch TS segment", {
        status: response.status,
      });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return new Response("TS proxy error: " + error.message, { status: 500 });
  }
}
