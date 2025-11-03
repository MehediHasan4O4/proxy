// /functions/m3u8.js - Fixed Version
async function handleM3U8Request(request) {
  const url = new URL(request.url);
  const targetUrlStr = url.searchParams.get('url');

  if (!targetUrlStr) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch (e) {
    return new Response('Invalid "url" query parameter', { status: 400 });
  }

  // Lock the worker to your Vercel app
  const allowedOrigins = ['https://livetvpro.vercel.app', 'http://localhost:5173'];
  const origin = request.headers.get('Origin');
  const corsHeader = allowedOrigins.includes(origin) ? origin : 'null';

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'CloudflareWorker',
        'Referer': targetUrl.origin,
      },
    });

    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    const m3u8Content = await response.text();

    const rewrittenM3u8 = m3u8Content.split('\n').map(line => {
      line = line.trim();
      if (line.startsWith('#') || line === '') {
        // Handle encryption keys
        if (line.includes('URI=')) {
          return line.replace(/URI="([^"]+)"/g, (match, uri) => {
            const keyUrl = new URL(uri, targetUrl);
            return `URI="/ts?url=${encodeURIComponent(keyUrl.toString())}"`;
          });
        }
        return line; // Return other comments/directives as is
      }
      
      // Handle segments and sub-playlists
      if (line.endsWith('.ts')) {
        const segmentUrl = new URL(line, targetUrl);
        return `/ts?url=${encodeURIComponent(segmentUrl.toString())}`;
      } else if (line.endsWith('.m3u8')) {
        const segmentUrl = new URL(line, targetUrl);
        return `/m3u8?url=${encodeURIComponent(segmentUrl.toString())}`;
      }
      
      return line; // Return any other lines
    }).join('\n');

    const headers = new Headers({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': corsHeader,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    return new Response(rewrittenM3u8, { headers });

  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

// Export as default to match _worker.js
export default handleM3U8Request;
