import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifest = JSON.parse(readFileSync(resolve("public/data/scenes.json"), "utf8"));
if (manifest.scenes.length !== 75) throw new Error(`Expected 75 scenes, received ${manifest.scenes.length}`);

for (const scene of manifest.scenes) {
  if (scene.sourceType !== "movie" || scene.rightsStatus !== "cleared" || scene.rightsOwner !== "Public domain") {
    throw new Error(`${scene.slug} is missing public-domain rights metadata`);
  }
  if (!scene.rightsBasis.includes("commons.wikimedia.org/wiki/File:")) {
    throw new Error(`${scene.slug} is missing a Wikimedia Commons evidence link`);
  }
  for (const url of [scene.videoUrl, scene.thumbnailUrl]) {
    const path = resolve("public", url.slice(1));
    if (!existsSync(path)) throw new Error(`${scene.slug} references missing media: ${path}`);
  }

  const videoPath = resolve("public", scene.videoUrl.slice(1));
  const probe = JSON.parse(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,pix_fmt,sample_rate,channels",
    "-of", "json",
    videoPath
  ], { encoding: "utf8" }));
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  const audio = probe.streams.find((stream) => stream.codec_type === "audio");
  if (video?.codec_name !== "h264" || video.width !== 640 || video.height !== 360 || video.pix_fmt !== "yuv420p") {
    throw new Error(`${scene.slug} is not a 640x360 H.264 yuv420p asset`);
  }
  if (audio?.codec_name !== "aac" || audio.sample_rate !== "48000" || audio.channels !== 2) {
    throw new Error(`${scene.slug} is not a stereo 48 kHz AAC asset`);
  }
  if (Math.abs(Number(probe.format.duration) - scene.duration) > 0.15) {
    throw new Error(`${scene.slug} media duration does not match its manifest record`);
  }
}

if (!existsSync(resolve("public/scenes/v3/SOURCES.md"))) throw new Error("Catalog source ledger is missing");
console.log("Verified 75 real public-domain scenes, source evidence, files, codecs, and durations");
