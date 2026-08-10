import "server-only";
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { downloadUpload } from "./storage";
import { type ProcessedDraft, type ProcessSceneInput, processedDraftSchema } from "./ingestion-schema";
import { inspectVideo } from "./local-upload";
import { transcribeWithWhisperX } from "./transcription";

const execFileAsync = promisify(execFile);
const workRoot = resolve(process.env.VAR_ROOT || resolve(process.cwd(), "var"), "drafts");

export async function processScene(input: ProcessSceneInput): Promise<ProcessedDraft & { engine: string }> {
  const draftId = randomUUID();
  const directory = join(workRoot, draftId);
  mkdirSync(directory, { recursive: true });
  const downloadedSource = join(directory, `source.${input.uploadKey.split(".").pop()}`);
  const source = await downloadUpload(input.uploadKey, downloadedSource);
  try {
    const sourceMedia = await inspectVideo(source.path);
    if (input.end > sourceMedia.duration + 0.05) throw new Error("Trim end exceeds the uploaded video duration");
    const clipPath = join(directory, "clip.mp4");
    const thumbnailPath = join(directory, "thumbnail.jpg");
    const audioPath = join(directory, "audio.wav");
    const duration = Number((input.end - input.start).toFixed(3));

    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-ss", String(input.start), "-to", String(input.end), "-i", source.path,
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", clipPath
    ], { timeout: 2 * 60_000 });
    await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(duration / 2), "-i", clipPath, "-frames:v", "1", "-q:v", "2", thumbnailPath], { timeout: 60_000 });
    await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", clipPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audioPath], { timeout: 60_000 });

    const transcription = await transcribeWithWhisperX(audioPath, directory, duration, input.transcriptHint);
    const draft = processedDraftSchema.parse({
      draftId,
      uploadKey: input.uploadKey,
      duration,
      transcript: transcription.transcript,
      wordTimings: transcription.wordTimings,
      clipPath,
      thumbnailPath,
      audioPath,
      createdAt: new Date().toISOString()
    });
    writeFileSync(join(directory, "draft.json"), `${JSON.stringify(draft, null, 2)}\n`, { flag: "wx" });
    return { ...draft, engine: transcription.engine };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  } finally {
    if (source.temporary) rmSync(downloadedSource, { force: true });
  }
}

export function readDraft(draftId: string): ProcessedDraft {
  if (!/^[a-f0-9-]{36}$/.test(draftId)) throw new Error("Invalid draft ID");
  const path = join(workRoot, draftId, "draft.json");
  return processedDraftSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
