import { describe, expect, it } from "vitest";
import { activeWordIndex, extensionForMimeType, microphoneErrorMessage, selectRecordingMimeType } from "./media";

describe("studio media utilities", () => {
  it("selects the first supported recording format", () => {
    const mediaRecorder = { isTypeSupported: (type: string) => type === "audio/mp4;codecs=mp4a.40.2" };
    expect(selectRecordingMimeType(mediaRecorder)).toBe("audio/mp4;codecs=mp4a.40.2");
  });

  it("maps recording formats to FFmpeg-safe extensions", () => {
    expect(extensionForMimeType("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForMimeType("audio/mp4")).toBe("m4a");
    expect(extensionForMimeType("audio/ogg")).toBe("ogg");
  });

  it("finds only the active transcript word", () => {
    const timings = [{ word: "hello", start: 0.2, end: 0.7 }, { word: "there", start: 0.8, end: 1.2 }];
    expect(activeWordIndex(timings, 0.5)).toBe(0);
    expect(activeWordIndex(timings, 0.75)).toBe(-1);
    expect(activeWordIndex(timings, 1)).toBe(1);
  });

  it("turns browser microphone failures into actionable messages", () => {
    expect(microphoneErrorMessage(new DOMException("denied", "NotAllowedError")).denied).toBe(true);
    expect(microphoneErrorMessage(new DOMException("missing", "NotFoundError")).message).toContain("No microphone");
  });
});
