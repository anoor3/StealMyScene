import { describe, expect, it } from "vitest";
import {
  clipRangeError,
  createUniformWordTimings,
  hasSupportedVideoSignature,
  LOCAL_VIDEO_MAX_BYTES,
  localVideoTitle,
  validateLocalVideoMetadata
} from "./local-video";

describe("local video validation", () => {
  it("accepts supported metadata and rejects empty, oversized, and disguised files", () => {
    expect(() => validateLocalVideoMetadata({ name: "take.mp4", size: 1024, type: "video/mp4" })).not.toThrow();
    expect(() => validateLocalVideoMetadata({ name: "take.mp4", size: 0, type: "video/mp4" })).toThrow("empty");
    expect(() => validateLocalVideoMetadata({ name: "take.mp4", size: LOCAL_VIDEO_MAX_BYTES + 1, type: "video/mp4" })).toThrow("250 MB");
    expect(() => validateLocalVideoMetadata({ name: "take.exe", size: 1024, type: "video/mp4" })).toThrow("MP4");
    expect(() => validateLocalVideoMetadata({ name: "take.mp4", size: 1024, type: "text/plain" })).toThrow("MP4");
  });

  it("recognizes MP4/MOV and WebM magic bytes", () => {
    expect(hasSupportedVideoSignature(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]), "take.mp4")).toBe(true);
    expect(hasSupportedVideoSignature(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), "take.webm")).toBe(true);
    expect(hasSupportedVideoSignature(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]), "take.mp4")).toBe(false);
  });

  it("enforces a one to fifteen second clip within a ten minute source", () => {
    expect(clipRangeError(2, 12, 30)).toBeUndefined();
    expect(clipRangeError(2, 2.5, 30)).toContain("1 second");
    expect(clipRangeError(2, 20, 30)).toContain("15 seconds");
    expect(clipRangeError(0, 10, 601)).toContain("10 minutes");
    expect(clipRangeError(20, 31, 30)).toContain("inside");
  });
});

describe("local transcript timing", () => {
  it("normalizes a line into ordered timings spanning the clip", () => {
    expect(createUniformWordTimings("  Make   this scene mine ", 4)).toEqual([
      { word: "Make", start: 0, end: 1 },
      { word: "this", start: 1, end: 2 },
      { word: "scene", start: 2, end: 3 },
      { word: "mine", start: 3, end: 4 }
    ]);
    expect(() => createUniformWordTimings("   ", 4)).toThrow("Enter the line");
  });

  it("creates a clean display title from a file name", () => {
    expect(localVideoTitle("my_funny-scene.mp4")).toBe("my funny scene");
  });
});
