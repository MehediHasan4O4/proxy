import m3u8Handler from "./functions/m3u8.js";
import tsHandler from "./functions/ts.js";

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HLS Proxy Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    body { background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    video { width: 80%; max-width: 800px; border: 2px solid #666; border-radius: 10px; }
  </style>
</head>
<body>
  <video id="video" controls autoplay></video>
  <script>
    const video = document.getElementById('video');
    const m3u8Url = "https://nxtlive.net/sliv/stream.m3u8?id=1000009246";
    const refererUrl = "https://nxtlive.net/sliv/stream.m3u8?id=1000009246";
    const src = \`/api/m3u8?url=\${encodeURIComponent(m3u8Url)}&referer=\${encodeURIComponent(refererUrl)}\`;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      alert('Your browser does not support HLS playback.');
    }
  </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/m3u8")) return m3u8Handler(request);
    if (url.pathname.startsWith("/api/ts")) return tsHandler(request);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html" }
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
