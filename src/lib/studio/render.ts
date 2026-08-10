import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { extensionForMimeType } from "./media";

let ffmpeg: FFmpeg | undefined;
let loadedMode: "single" | "multi" | undefined;

function renderingMode(): "single" | "multi" {
  return globalThis.crossOriginIsolated && (navigator.hardwareConcurrency ?? 1) > 1 ? "multi" : "single";
}

async function getFFmpeg(): Promise<FFmpeg> {
  const mode = renderingMode();
  if (!ffmpeg) ffmpeg = new FFmpeg();
  if (!ffmpeg.loaded || loadedMode !== mode) {
    if (ffmpeg.loaded) ffmpeg.terminate();
    const base = `/ffmpeg/${mode}`;
    await ffmpeg.load({
      coreURL: `${base}/ffmpeg-core.js`,
      wasmURL: `${base}/ffmpeg-core.wasm`,
      ...(mode === "multi" ? { workerURL: `${base}/ffmpeg-core.worker.js` } : {})
    });
    loadedMode = mode;
  }
  return ffmpeg;
}

export type RenderOptions = {
  videoUrl: string;
  recording: Blob;
  timeoutMs?: number;
  onProgress?: (progress: number) => void;
};

export async function renderDub({ videoUrl, recording, timeoutMs = 90_000, onProgress }: RenderOptions): Promise<Blob> {
  const engine = await getFFmpeg();
  const token = crypto.randomUUID();
  const videoName = `scene-${token}.mp4`;
  const audioName = `voice-${token}.${extensionForMimeType(recording.type)}`;
  const outputName = `dub-${token}.mp4`;
  const progressHandler = ({ progress }: { progress: number }) => onProgress?.(Math.max(0, Math.min(1, progress)));
  engine.on("progress", progressHandler);

  try {
    await engine.writeFile(videoName, await fetchFile(videoUrl));
    await engine.writeFile(audioName, await fetchFile(recording));
    const exitCode = await engine.exec([
      "-i", videoName,
      "-i", audioName,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "160k",
      "-shortest",
      "-movflags", "+faststart",
      outputName
    ], timeoutMs);
    if (exitCode !== 0) throw new Error(exitCode === 1 ? "The local render timed out." : "The local renderer could not create the MP4.");
    const output = await engine.readFile(outputName);
    if (typeof output === "string") throw new Error("The local renderer returned an invalid file.");
    return new Blob([output.slice().buffer], { type: "video/mp4" });
  } finally {
    engine.off("progress", progressHandler);
    await Promise.allSettled([videoName, audioName, outputName].map((file) => engine.deleteFile(file)));
  }
}

export function resetRendererForTests() {
  ffmpeg?.terminate();
  ffmpeg = undefined;
  loadedMode = undefined;
}
