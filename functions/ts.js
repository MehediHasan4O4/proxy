// /functions/ts.js - Fixed Version
async function handleTsRequest(request) {
  const url = new URL(request.url);
  const targetUrlStr = url.searchParams.get('url');

  if (!targetUrlStr) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  // Lock the worker to your Vercel app
  const allowedOrigins = ['https://livetvpro.vercel.app', 'http://localhost:5173'];
  const origin = request.headers.get('Origin');
  const corsHeader = allowedOrigins.includes(origin) ? origin : 'null';

  try {
    const response = await fetch(targetUrlStr, {
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'CloudflareWorker',
      },
    });

    const headers = new Headers({
      'Content-Type': response.headers.get('Content-Type') || 'video/mp2t',
.      'Access-Control-Allow-Origin': corsHeader,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=600', // Cache segments for 10 mins
    });

    return new Response(response.body, {
      status: response.status,
      headers: headers,
    });

  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

// Export as default to match _worker.js
export default handleTsRequest;
