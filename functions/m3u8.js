export default async function handleM3U8(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) return new Response("Missing url", { status: 400 });

  let res;
  try {
    // --- TRY to fetch the target URL ---
    res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
  } catch (e) {
    // --- CATCH any network errors and return a custom response ---
    console.error(e);
    return new Response(`Failed to fetch upstream URL: ${target}`, { status: 502 }); // 502 Bad Gateway is appropriate here
  }


  if (!res.ok) return new Response("Upstream failed", { status: res.status });

  let body = await res.text();
  const base = new URL(target);

  body = body
    .split("\n")
    .map((line) => {
      if (line.startsWith("#") || !line.trim()) return line;
      const abs = new URL(line, base).href;
      return `/api/ts?url=${encodeURIComponent(abs)}`;
    })
    .join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
