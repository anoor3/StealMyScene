import type { WordTiming } from "@/lib/scenes/schema";

export const LOCAL_VIDEO_MAX_BYTES = 250 * 1024 * 1024;
export const LOCAL_VIDEO_MAX_SOURCE_DURATION = 10 * 60;
export const LOCAL_VIDEO_MIN_CLIP_DURATION = 1;
export const LOCAL_VIDEO_MAX_CLIP_DURATION = 15;

const supportedExtensions = new Set(["mp4", "mov", "webm"]);
const supportedMimeTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

function extension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function validateLocalVideoMetadata(file: Pick<File, "name" | "size" | "type">): void {
  if (file.size <= 0) throw new Error("That video is empty.");
  if (file.size > LOCAL_VIDEO_MAX_BYTES) throw new Error("Choose a video smaller than 250 MB.");
  if (!supportedExtensions.has(extension(file.name)) || (file.type && !supportedMimeTypes.has(file.type))) {
    throw new Error("Choose an MP4, MOV, or WebM video.");
  }
}

export function hasSupportedVideoSignature(bytes: Uint8Array, name: string): boolean {
  if (extension(name) === "webm") {
    return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  return bytes.length >= 8 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

export async function validateLocalVideoFile(file: File): Promise<void> {
  validateLocalVideoMetadata(file);
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!hasSupportedVideoSignature(bytes, file.name)) {
    throw new Error("The file extension does not match a supported video file.");
  }
}

export function clipRangeError(start: number, end: number, sourceDuration: number): string | undefined {
  if (![start, end, sourceDuration].every(Number.isFinite) || sourceDuration <= 0) return "The video duration is unavailable.";
  if (sourceDuration > LOCAL_VIDEO_MAX_SOURCE_DURATION) return "Choose a source video that is 10 minutes or shorter.";
  if (start < 0 || end > sourceDuration + 0.05 || end <= start) return "Choose a valid clip inside the source video.";
  const duration = end - start;
  if (duration < LOCAL_VIDEO_MIN_CLIP_DURATION) return "Choose at least 1 second.";
  if (duration > LOCAL_VIDEO_MAX_CLIP_DURATION + 0.05) return "Choose no more than 15 seconds.";
  return undefined;
}

export function createUniformWordTimings(line: string, duration: number): WordTiming[] {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) throw new Error("Enter the line you want to perform.");
  if (line.trim().length > 300) throw new Error("Keep the line under 300 characters.");
  const slot = duration / words.length;
  return words.map((word, index) => ({
    word,
    start: Number((index * slot).toFixed(3)),
    end: Number(((index + 1) * slot).toFixed(3))
  }));
}

export function localVideoTitle(name: string): string {
  const title = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return title.slice(0, 100) || "Your video";
}
