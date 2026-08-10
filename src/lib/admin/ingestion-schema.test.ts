import { describe, expect, it } from "vitest";
import { processSceneSchema, publishSceneSchema } from "./ingestion-schema";

const wordTimings = [{ word: "hello", start: 0.1, end: 0.8 }];

describe("scene ingestion contracts", () => {
  it("requires a one-to-thirty-second trim", () => {
    const base = { uploadKey: "incoming/00000000-0000-4000-8000-000000000000.mp4", start: 0 };
    expect(processSceneSchema.safeParse({ ...base, end: 1 }).success).toBe(true);
    expect(processSceneSchema.safeParse({ ...base, end: 0.5 }).success).toBe(false);
    expect(processSceneSchema.safeParse({ ...base, end: 31 }).success).toBe(false);
  });

  it("makes pending and draft rights impossible to publish", () => {
    const base = {
      draftId: "00000000-0000-4000-8000-000000000000",
      slug: "safe-scene",
      title: "Safe scene",
      quote: "hello",
      sourceTitle: "Original",
      sourceType: "original",
      category: "Comedy",
      transcript: "hello",
      wordTimings,
      rightsOwner: "StealMyScene",
      rightsBasis: "Original footage created in-house"
    };
    expect(publishSceneSchema.safeParse({ ...base, rightsStatus: "cleared" }).success).toBe(true);
    expect(publishSceneSchema.safeParse({ ...base, rightsStatus: "pending" }).success).toBe(false);
    expect(publishSceneSchema.safeParse({ ...base, rightsStatus: "draft" }).success).toBe(false);
  });
});
