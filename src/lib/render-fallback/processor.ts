import "server-only";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { inspectVideo } from "@/lib/admin/local-upload";
import { shareTokenMatches } from "@/lib/shares/security";
import { deleteFallback, downloadFallbackInputs, readFallbackRecord, writeFallbackRecord } from "./storage";

const execFileAsync = promisify(execFile);

export async function processFallback(id: string, token: string): Promise<Buffer> {
  const record = await readFallbackRecord(id);
  if (!shareTokenMatches(token, record.tokenHash) || record.status !== "pending") throw new Error("Invalid fallback authorization");
  if (new Date(record.expiresAt).getTime() <= Date.now()) throw new Error("Fallback upload expired");
  await writeFallbackRecord({ ...record, status: "processing" });
  const directory = mkdtempSync(join(tmpdir(), "sms-render-"));
  const sourceExtension = record.sourceType === "video/webm" ? "webm" : record.sourceType === "video/quicktime" ? "mov" : "mp4";
  const sourcePath = join(directory, `source.${sourceExtension}`);
  const voicePath = join(directory, "voice.bin");
  const outputPath = join(directory, "output.mp4");
  try {
    const inputs = await downloadFallbackInputs(record, sourcePath, voicePath);
    const source = await inspectVideo(inputs.source);
    if (source.bytes !== record.sourceBytes || record.start + record.duration > source.duration + 0.05) throw new Error("Fallback clip range is invalid");
    const voiceProbe = await execFileAsync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", inputs.voice], { timeout: 30_000 });
    if (voiceProbe.stdout.trim() !== "audio") throw new Error("Fallback voice input has no audio stream");
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-ss", record.start.toFixed(3), "-t", record.duration.toFixed(3), "-i", inputs.source,
      "-i", inputs.voice, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-t", record.duration.toFixed(3), "-shortest", "-movflags", "+faststart", outputPath
    ], { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    const output = await inspectVideo(outputPath);
    if (output.codec !== "h264" || Math.abs(output.duration - record.duration) > 0.35) throw new Error("Fallback output validation failed");
    const outputAudio = await execFileAsync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", outputPath], { timeout: 30_000 });
    if (outputAudio.stdout.trim() !== "aac") throw new Error("Fallback output audio validation failed");
    return readFileSync(outputPath);
  } finally {
    await deleteFallback(record).catch(() => undefined);
    rmSync(directory, { recursive: true, force: true });
  }
}
