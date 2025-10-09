import m3u8Handler from "./functions/m3u8.js";
import tsHandler from "./functions/ts.js";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>M3U8 Proxy</title>
  <meta name="title" content="M3U8 Proxy" />
  <meta name="description" content="Playground for testing m3u8 proxy." />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      font-family: Arial, sans-serif;
    }
    .container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      padding-bottom: 60px;
    }
    #player {
      width: 100%;
      max-width: 890px;
      height: 100%;
      max-height: 500px;
      background: black;
    }
    .test {
      width: 100%;
      max-width: 800px;
      display: flex;
      gap: 10px;
      justify-content: center;
      align-items: center;
      padding: 20px;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .result-label {
      font-weight: bold;
      font-size: 18px;
      color: #333;
    }
    #url, #referer {
      width: 100%;
      max-width: 400px;
      font-size: 15px;
      border: 2px solid #333;
      padding: 10px;
      box-sizing: border-box;
    }
    .btn {
      padding: 10px 20px;
      font-size: 15px;
      border: 2px solid #333;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    .btn-play {
      background-color: #007bff;
      color: white;
    }
    .btn-play:hover {
      background-color: #0056b3;
    }
    .btn-clear {
      background-color: #dc3545;
      color: white;
    }
    .btn-clear:hover {
      background-color: #c82333;
    }
    #labelurl {
      font-size: 20px;
      font-weight: bold;
    }
    #result {
      width: 100%;
      max-width: 800px;
      overflow-wrap: break-word;
      margin: 20px auto;
      padding: 10px;
      padding-inline: 30px;
      background-color: #f9f9f9;
      border: 1px solid #ccc;
      border-radius: 5px;
      box-sizing: border-box;
      display: none;
    }
    footer {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 10px;
      background-color: #333;
      color: white;
      position: fixed;
      bottom: 0;
      width: 100%;
      box-sizing: border-box;
    }
    footer a {
      color: white;
      text-decoration: none;
    }
    footer .github-icon {
      width: 20px;
      height: 20px;
      vertical-align: middle;
      margin-left: 10px;
    }
    .details {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
      width: 100%;
      max-width: 400px;
    }
    .input-group label {
      font-size: 14px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="test">
    <label for="url" id="labelurl">URL</label>
    <div class="input-group">
      <input type="text" id="url" placeholder="Enter M3U8 URL" />
      <input type="text" id="referer" placeholder="Referer (optional)" />
    </div>
    <button onclick="play()" class="btn btn-play">PLAY</button>
    <button onclick="clearFields()" class="btn btn-clear">CLEAR</button>
  </div>

  <div id="result"></div>
  <div class="container">
    <video id="player" controls></video>
  </div>

  <footer>
    <div class="details">
      HLS Proxy Player 🎥
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <script type="text/javascript">
    let hls;

    function play() {
      const url = document.getElementById("url").value;
      const referer = document.getElementById("referer").value;
      const resultDiv = document.getElementById("result");

      if (!url) {
        alert("Please enter a URL");
        return;
      }

      let proxyUrl = \`/api/m3u8?url=\${encodeURIComponent(url)}\`;
      if (referer) {
        proxyUrl += \`&referer=\${encodeURIComponent(referer)}\`;
      }

      resultDiv.style.display = "block";
      resultDiv.innerHTML = \`<span class="result-label">PROXIED_URL: </span><a href="\${proxyUrl}" target="_blank">\${window.location.origin}\${proxyUrl}</a>\`;

      const video = document.getElementById("player");
      if (hls) {
        hls.destroy();
      }

      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(proxyUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          video.play();
        });
        hls.on(Hls.Events.ERROR, function (event, data) {
          console.error("HLS Error:", data);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = proxyUrl;
        video.addEventListener("loadedmetadata", function () {
          video.play();
        });
      }
    }

    function clearFields() {
      document.getElementById("url").value = "";
      document.getElementById("referer").value = "";
      document.getElementById("result").style.display = "none";
      document.getElementById("result").innerHTML = "";
      const video = document.getElementById("player");
      if (hls) {
        hls.destroy();
      }
      video.src = "";
    }

    // Auto-play if URL parameters are present
    window.addEventListener("DOMContentLoaded", function() {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("url");
      const referer = params.get("referer");
      
      if (url) {
        document.getElementById("url").value = url;
        if (referer) {
          document.getElementById("referer").value = referer;
        }
        play();
      }
    });
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
