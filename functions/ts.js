export default async function handleTs(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400 });

  const res = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  return new Response(res.body, {
    headers: {
      "Content-Type": "video/mp2t",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
