export default async function handleM3U8(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  const referer = searchParams.get("referer"); // --- Get the Referer from the query ---

  if (!target) return new Response("Missing url", { status: 400 });

  // --- Prepare headers, adding the Referer if it exists ---
  const headers = { "User-Agent": "Mozilla/5.0" };
  if (referer) {
    headers["Referer"] = referer;
  }

  let res;
  try {
    res = await fetch(target, { headers });
  } catch (e) {
    console.error(e);
    return new Response(`Failed to fetch upstream URL: ${target}`, { status: 502 });
  }

  if (!res.ok) return new Response("Upstream failed", { status: res.status });

  let body = await res.text();
  const base = new URL(target);

  body = body
    .split("\n")
    .map((line) => {
      if (line.startsWith("#") || !line.trim()) return line;
      const abs = new URL(line, base).href;
      
      // --- Rewrite the .ts URL and pass the referer along to the /api/ts endpoint ---
      let newTsUrl = `/api/ts?url=${encodeURIComponent(abs)}`;
      if (referer) {
        newTsUrl += `&referer=${encodeURIComponent(referer)}`;
      }
      return newTsUrl;
    })
    .join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
