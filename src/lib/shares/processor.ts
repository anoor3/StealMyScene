import "server-only";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { inspectVideo } from "@/lib/admin/local-upload";
import { transcribeWithWhisperX } from "@/lib/admin/transcription";
import { moderateShareTranscript } from "./moderation";
import { publicShareStatus, SHARE_TTL_MS, shareIsExpired, type ShareRecord } from "./schema";
import { shareTokenMatches } from "./security";
import { deleteShareMedia, downloadShareMedia, expireShare, readShareRecord, writeShareRecord } from "./storage";

const execFileAsync = promisify(execFile);

export async function processTemporaryShare(id: string, token: string, transcriptHint?: string) {
  const original = await readShareRecord(id);
  if (!shareTokenMatches(token, original.tokenHash)) throw new Error("Invalid share authorization");
  if (shareIsExpired(original)) return publicShareStatus(await expireShare(original));
  if (original.status !== "pending_upload") return publicShareStatus(original);

  const processing: ShareRecord = { ...original, status: "processing" };
  await writeShareRecord(processing);
  const directory = mkdtempSync(join(tmpdir(), "sms-share-"));
  const sourcePath = join(directory, "output.mp4");
  const audioPath = join(directory, "voice.wav");

  try {
    const source = await downloadShareMedia(processing, sourcePath);
    const media = await inspectVideo(source.path);
    if (media.bytes !== processing.bytes) throw new Error("Uploaded share size did not match its declaration");
    if (media.duration > 30) throw new Error("Temporary shares must be 30 seconds or shorter");
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", source.path,
      "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audioPath
    ], { timeout: 60_000 });
    const transcription = await transcribeWithWhisperX(audioPath, directory, media.duration, transcriptHint);
    const moderation = moderateShareTranscript(transcription.transcript);
    const now = Date.now();
    if (!moderation.allowed) {
      await deleteShareMedia(processing);
      const rejected: ShareRecord = {
        ...processing,
        status: "rejected",
        moderation: "rejected",
        rejectionReason: moderation.reason,
        expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString()
      };
      await writeShareRecord(rejected);
      return publicShareStatus(rejected);
    }

    const ready: ShareRecord = {
      ...processing,
      status: "ready",
      moderation: "passed",
      expiresAt: new Date(now + SHARE_TTL_MS).toISOString()
    };
    await writeShareRecord(ready);
    return publicShareStatus(ready);
  } catch (error) {
    await deleteShareMedia(processing).catch(() => undefined);
    const failed: ShareRecord = {
      ...processing,
      status: "error",
      errorMessage: "The temporary link could not be prepared. Downloaded files are still available on your device.",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    await writeShareRecord(failed).catch(() => undefined);
    throw error;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
