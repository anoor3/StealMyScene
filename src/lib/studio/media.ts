import type { WordTiming } from "@/lib/scenes/schema";

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/webm",
  "audio/mp4"
];

export function selectRecordingMimeType(mediaRecorder: Pick<typeof MediaRecorder, "isTypeSupported"> = MediaRecorder): string | undefined {
  return preferredMimeTypes.find((type) => mediaRecorder.isTypeSupported(type));
}

export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function activeWordIndex(wordTimings: WordTiming[], time: number): number {
  return wordTimings.findIndex(({ start, end }) => time >= start && time <= end);
}

export function microphoneErrorMessage(error: unknown): { denied: boolean; message: string } {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return { denied: true, message: "StealMyScene needs microphone access to record your line." };
  }
  if (name === "NotFoundError") {
    return { denied: false, message: "No microphone was found. Connect one and try again." };
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return { denied: false, message: "Your microphone is busy in another app. Close it there, then retry." };
  }
  return { denied: false, message: "The microphone could not start. Check browser permissions and try again." };
}
