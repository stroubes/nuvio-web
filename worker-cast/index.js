/**
 * A file-shaped address for a stream that has none.
 *
 * Casters decide what a link is by how it ends. A debrid link ends in an
 * opaque id, so Web Video Caster opened one in its browser and showed the
 * bytes as text. `/v/<url as base64url>/<filename>.mkv` ends the way a file
 * does, and answers with a redirect to the real address. The device that
 * follows it — the phone, or the Chromecast — is the one that fetches the
 * stream, so a link tied to a home IP still works and nothing here carries
 * video.
 *
 * Only http(s) targets, and only names ending in a video extension, are
 * answered; anything else falls through to the site.
 */
const VIDEO_PATH = /^\/v\/([A-Za-z0-9_-]+)\/[^/]+\.(?:mkv|mp4|m4v|mov|webm|avi|ts|m3u8)$/i;

function decodeTarget(encoded) {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encoded.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  const target = new URL(new TextDecoder().decode(bytes));
  if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error("scheme");
  return target;
}

export default {
  async fetch(request, env) {
    const match = VIDEO_PATH.exec(new URL(request.url).pathname);
    if (!match) return env.ASSETS.fetch(request);
    let target;
    try {
      target = decodeTarget(match[1]);
    } catch {
      return new Response("Not a stream link", { status: 400 });
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: target.toString(),
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  },
};
