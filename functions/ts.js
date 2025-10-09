export default async function handleTs(request) {
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
    return new Response(`Failed to fetch upstream segment: ${target}`, { status: 502 });
  }


  return new Response(res.body, {
    headers: {
      "Content-Type": "video/mp2t",
      "Access-Control-Allow-Origin": "*",
      "status": res.status, // Pass through the original status
    },
  });
}
