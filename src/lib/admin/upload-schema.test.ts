import { describe, expect, it } from "vitest";
import { extensionForUpload, MAX_SOURCE_BYTES, presignUploadSchema } from "./upload-schema";

describe("admin upload validation", () => {
  it("accepts expected video metadata and rejects oversized or misleading types", () => {
    expect(presignUploadSchema.safeParse({ fileName: "scene.mp4", mimeType: "video/mp4", size: 1000 }).success).toBe(true);
    expect(presignUploadSchema.safeParse({ fileName: "scene.exe", mimeType: "application/octet-stream", size: 1000 }).success).toBe(false);
    expect(presignUploadSchema.safeParse({ fileName: "scene.mp4", mimeType: "video/mp4", size: MAX_SOURCE_BYTES + 1 }).success).toBe(false);
  });

  it("normalizes storage extensions from both name and declared type", () => {
    expect(extensionForUpload("scene.WEBM", "video/webm")).toBe("webm");
    expect(extensionForUpload("iphone.MOV", "video/quicktime")).toBe("mov");
    expect(extensionForUpload("wrong.mov", "video/mp4")).toBe("mp4");
  });
});
