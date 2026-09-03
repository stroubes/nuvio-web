import assert from "node:assert/strict";
import test from "node:test";
import { chromecastAudioRisk } from "../src/lib/playback.ts";

test("audio a Chromecast cannot decode is named from the stream text", () => {
  assert.equal(chromecastAudioRisk("Silo.S01E02.2160p.WEBMux.DV.HEVC.Atmos-SGF.mkv"), "TrueHD/Atmos audio");
  assert.equal(chromecastAudioRisk("Movie.2024.1080p.BluRay.TrueHD.7.1.mkv"), "TrueHD/Atmos audio");
  assert.equal(chromecastAudioRisk("Movie.2024.1080p.BluRay.DTS-HD.MA.5.1.mkv"), "DTS audio");
  assert.equal(chromecastAudioRisk("Silo.S01E02.2160p.ATVP.WEB-DL.DDP5.1.DV.HDR.H.265.mkv"), "Dolby Digital Plus audio");
  assert.equal(chromecastAudioRisk("Show.S01E01.1080p.WEB-DL.EAC3.5.1.mkv"), "Dolby Digital Plus audio");
});

test("AAC and plain AC3 streams raise no warning", () => {
  assert.equal(chromecastAudioRisk("Show.S01E01.1080p.WEB-DL.AAC2.0.H.264.mp4"), null);
  assert.equal(chromecastAudioRisk("Movie.2024.1080p.BluRay.AC3.5.1.x264.mkv"), null);
  assert.equal(chromecastAudioRisk("Movie.2024.1080p.DD5.1.x264.mkv"), null);
});
