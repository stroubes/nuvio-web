import assert from "node:assert/strict";
import test from "node:test";
import { fileShapedUrl, infusePlaybackUrl, mediaMimeType, shortcutReturnUrl, webVideoCasterUrl } from "../src/lib/externalPlayer.ts";

test("Infuse handoff encodes signed stream URLs and a useful filename", () => {
  const result = infusePlaybackUrl(
    "https://media.example/movie.mkv?token=a+b&part=1",
    "House / Dragon: S1E1",
  );
  const parsed = new URL(result);

  assert.equal(parsed.protocol, "infuse:");
  assert.equal(parsed.pathname, "/play");
  assert.equal(
    parsed.searchParams.get("url"),
    "https://media.example/movie.mkv?token=a+b&part=1",
  );
  assert.equal(parsed.searchParams.get("filename"), "House _ Dragon_ S1E1.mkv");
});

test("the Shortcut return address keeps the trailing slash and a literal space", () => {
  const url = shortcutReturnUrl(
    "https://nuvio.example/",
    "?nuvio-external=stopped",
  );
  assert.ok(url.startsWith("shortcuts://run-shortcut?"));
  // "+" would be read as a plus by anything not decoding a form, and the name
  // has to match the installed Shortcut exactly.
  assert.ok(!url.includes("+"));
  assert.ok(url.includes("name=Open%20Nuvio"));
  const params = new URLSearchParams(url.split("?").slice(1).join("?"));
  assert.equal(params.get("name"), "Open Nuvio");
  assert.equal(
    params.get("text"),
    "webapp://nuvio.example/?nuvio-external=stopped",
  );
});

test("the Shortcut return address follows wherever the app is served from", () => {
  const pages = new URLSearchParams(
    shortcutReturnUrl("https://lucaboox.github.io/nuvio-web/", "?nuvio-external=finished")
      .split("?").slice(1).join("?"),
  );
  assert.equal(
    pages.get("text"),
    "webapp://lucaboox.github.io/nuvio-web/?nuvio-external=finished",
  );
  // A missing trailing slash is added: without it iOS does not find the app.
  const bare = new URLSearchParams(
    shortcutReturnUrl("https://example.com", "?nuvio-external=stopped")
      .split("?").slice(1).join("?"),
  );
  assert.equal(bare.get("text"), "webapp://example.com/?nuvio-external=stopped");
});

test("Web Video Caster handoff encodes the stream, title and subtitle", () => {
  const result = webVideoCasterUrl(
    "https://media.example/movie.mkv?token=a+b&part=1",
    "House / Dragon: S1E1",
    { subtitleUrl: "https://subs.example/en.srt?x=1&y=2" },
  );
  assert.ok(result.startsWith("wvc-x-callback://open?"));
  const params = new URLSearchParams(result.slice(result.indexOf("?") + 1));
  assert.equal(params.get("url"), "https://media.example/movie.mkv?token=a+b&part=1");
  assert.equal(params.get("title"), "House / Dragon: S1E1");
  assert.equal(params.get("subtitle"), "https://subs.example/en.srt?x=1&y=2");
  // The raw stream URL must not appear unencoded, or its "&" would split
  // the callback's own query.
  assert.ok(!result.includes("?token=a+b&part=1"));
});

test("Web Video Caster is told the type and never loads the link as a page", () => {
  const result = webVideoCasterUrl(
    "https://cdn.example/dl/a0e39abd-4493",
    "Silo",
    {
      filename: "Silo.S01E02.2160p.WEB-DL.mkv",
      posterUrl: "https://img.example/silo.jpg",
      headers: { Referer: "https://addon.example/" },
    },
  );
  const params = new URLSearchParams(result.slice(result.indexOf("?") + 1));
  assert.equal(params.get("skip_page_load"), "true");
  assert.equal(params.get("mime_type"), "video/x-matroska");
  assert.equal(params.get("poster"), "https://img.example/silo.jpg");
  assert.deepEqual(params.getAll("header"), ["Referer: https://addon.example/"]);
  // The stream address is the final parameter, as the caster's examples show.
  assert.ok(result.endsWith(`&url=${encodeURIComponent("https://cdn.example/dl/a0e39abd-4493")}`));
});

test("the media type comes from the file name, then the URL, then nowhere", () => {
  assert.equal(mediaMimeType("https://cdn.example/dl/abc", "Show.S01E01.mkv"), "video/x-matroska");
  assert.equal(mediaMimeType("https://cdn.example/movie.mp4?token=1"), "video/mp4");
  assert.equal(mediaMimeType("https://cdn.example/live/master.m3u8"), "application/x-mpegURL");
  assert.equal(mediaMimeType("https://cdn.example/dl/abc"), undefined);
});

test("a debrid link gets a file-shaped address that decodes back to itself", () => {
  const stream = "https://nexus-222.cdn.example/dl/a0e39abd-4493?token=a+b/c=";
  const result = fileShapedUrl("https://nuvio.example/", stream, "Silo S1E2", "Silo.S01E02.2160p.WEB-DL.mkv");
  assert.ok(result.startsWith("https://nuvio.example/v/"));
  assert.ok(result.endsWith("/Silo.S01E02.2160p.WEB-DL.mkv"));
  const encoded = result.split("/")[4];
  assert.ok(/^[A-Za-z0-9_-]+$/.test(encoded));
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encoded.length % 4)) % 4);
  assert.equal(Buffer.from(padded, "base64").toString("utf8"), stream);
});

test("without a file name the title and a guessed extension name the file", () => {
  assert.ok(fileShapedUrl("https://nuvio.example/", "https://cdn.example/dl/abc", "House / Dragon: S1E1").endsWith("/House._.Dragon_.S1E1.mkv"));
  assert.ok(fileShapedUrl("https://nuvio.example/", "https://cdn.example/movie.mp4?x=1", "Movie").endsWith("/Movie.mp4"));
});
