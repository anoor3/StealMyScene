import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destination = join(root, "public", "ffmpeg");
const cores = [
  ["@ffmpeg/core", "single", ["ffmpeg-core.js", "ffmpeg-core.wasm"]],
  ["@ffmpeg/core-mt", "multi", ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"]]
];

mkdirSync(destination, { recursive: true });

for (const [packageName, directory, files] of cores) {
  const target = join(destination, directory);
  mkdirSync(target, { recursive: true });
  for (const file of files) {
    copyFileSync(join(root, "node_modules", packageName, "dist", "umd", file), join(target, file));
  }
}

console.log("Prepared self-hosted FFmpeg WASM cores in public/ffmpeg");
