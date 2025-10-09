import m3u8Handler from "./functions/m3u8.js";
import tsHandler from "./functions/ts.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/m3u8")) return m3u8Handler(request);
    if (url.pathname.startsWith("/api/ts")) return tsHandler(request);

    // Serve static frontend files
    return env.ASSETS.fetch(request);
  },
};
