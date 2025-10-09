export default async function handleTs(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  const referer = searchParams.get("referer");

  if (!target) return new Response("Missing url", { status: 400 });

  const headers = { "User-Agent": "Mozilla/5.0" };
  if (referer) {
    headers["Referer"] = referer;
  }
  
  let res;
  try {
    res = await fetch(target, { headers });
  } catch (e) {
    console.error(e);
    return new Response(`Failed to fetch upstream segment: ${target}`, { status: 502 });
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "video/mp2t",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
