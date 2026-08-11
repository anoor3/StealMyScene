import { describe, expect, it, vi } from "vitest";
import { canShareDubFile, createDubFile, shareDubFile } from "./share";

describe("dub file sharing", () => {
  it("detects supported file sharing and shares the MP4", async () => {
    const file = createDubFile(new Blob(["video"], { type: "video/mp4" }), "scene.mp4");
    const share = vi.fn().mockResolvedValue(undefined);
    const shareNavigator = { canShare: vi.fn(() => true), share };
    expect(canShareDubFile(file, shareNavigator)).toBe(true);
    await expect(shareDubFile(file!, "My scene", shareNavigator)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [file], title: "My scene" }));
  });

  it("keeps download as the fallback when file sharing is unavailable", () => {
    const file = createDubFile(new Blob(["video"]), "scene.mp4");
    expect(canShareDubFile(file, {})).toBe(false);
    expect(canShareDubFile(file, { canShare: () => false, share: vi.fn() })).toBe(false);
  });

  it("treats share-sheet cancellation as a normal outcome", async () => {
    const file = createDubFile(new Blob(["video"]), "scene.mp4")!;
    const shareNavigator = {
      canShare: () => true,
      share: vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"))
    };
    await expect(shareDubFile(file, "My scene", shareNavigator)).resolves.toBe("cancelled");
  });

  it("turns real share failures into a download recovery message", async () => {
    const file = createDubFile(new Blob(["video"]), "scene.mp4")!;
    const shareNavigator = { canShare: () => true, share: vi.fn().mockRejectedValue(new Error("broken")) };
    await expect(shareDubFile(file, "My scene", shareNavigator)).rejects.toThrow("Download the MP4 instead");
  });
});
