import "server-only";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import type { WordTiming } from "@/lib/scenes/schema";

const execFileAsync = promisify(execFile);

function fixtureTimings(text: string, duration: number): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const available = Math.max(0.5, duration - 0.4);
  const step = available / words.length;
  return words.map((word, index) => ({
    word,
    start: Number((0.2 + index * step).toFixed(3)),
    end: Number((index === words.length - 1 ? duration - 0.2 : 0.2 + (index + 1) * step - 0.05).toFixed(3))
  }));
}

type TranscriptionResult = {
  transcript: string;
  wordTimings: WordTiming[];
  engine: "fixture" | "whisperx";
};

export async function transcribeWithWhisperX(audioPath: string, outputDirectory: string, duration: number, transcriptHint?: string): Promise<TranscriptionResult> {
  if (process.env.TRANSCRIPTION_DRIVER === "fixture") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_FIXTURE_TRANSCRIPTION !== "true") {
      throw new Error("Fixture transcription is forbidden in production");
    }
    if (!transcriptHint?.trim()) throw new Error("Fixture transcription requires a transcript hint");
    return { transcript: transcriptHint.trim(), wordTimings: fixtureTimings(transcriptHint, duration), engine: "fixture" as const };
  }

  const command = process.env.WHISPERX_COMMAND || "whisperx";
  const model = process.env.WHISPERX_MODEL || "small";
  try {
    await execFileAsync(command, [
      audioPath,
      "--model", model,
      "--output_dir", outputDirectory,
      "--output_format", "json",
      "--compute_type", process.env.WHISPERX_COMPUTE_TYPE || "int8"
    ], { maxBuffer: 10 * 1024 * 1024, timeout: 10 * 60_000 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown process failure";
    throw new Error(`WhisperX transcription failed: ${detail}`);
  }

  const resultPath = join(outputDirectory, `${basename(audioPath, ".wav")}.json`);
  if (!existsSync(resultPath)) throw new Error("WhisperX did not produce its expected JSON output");
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  const rawWords = (result.segments ?? []).flatMap((segment: { words?: unknown[] }) => segment.words ?? []);
  const wordTimings = rawWords
    .filter((word: { word?: unknown; start?: unknown; end?: unknown }) => typeof word.word === "string" && typeof word.start === "number" && typeof word.end === "number")
    .map((word: { word: string; start: number; end: number }) => ({ word: word.word.trim(), start: word.start, end: word.end }))
    .filter((word: WordTiming) => word.word && word.end > word.start);
  if (wordTimings.length === 0) throw new Error("WhisperX produced no aligned words; this clip needs a different source or manual transcription outside publication");
  const transcript = wordTimings.map(({ word }: WordTiming) => word).join(" ");
  return { transcript, wordTimings, engine: "whisperx" as const };
}
