import { describe, expect, it } from "vitest";
import { moderateShareTranscript } from "./moderation";

describe("temporary share moderation", () => {
  it("allows ordinary performances", () => {
    expect(moderateShareTranscript("This is my scene now")).toEqual({ allowed: true });
  });

  it("normalizes punctuation and rejects configured phrases", () => {
    expect(moderateShareTranscript("A custom, BLOCKED phrase!", "custom blocked phrase")).toMatchObject({ allowed: false });
  });
});
