// @vitest-environment node
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FallbackRecord } from "./schema";

describe("server render fallback", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sms-fallback-test-"));
    process.env.VAR_ROOT = root;
    process.env.STORAGE_DRIVER = "local";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.VAR_ROOT;
    delete process.env.STORAGE_DRIVER;
    rmSync(root, { recursive: true, force: true });
  });

  it("renders synchronized H.264/AAC output and removes all temporary inputs", async () => {
    const sourcePath = resolve("public/scenes/v1/wrong-door.v1.mp4");
    const voicePath = join(root, "voice.webm");
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:a", "libopus", voicePath]);
    const source = readFileSync(sourcePath);
    const voice = readFileSync(voicePath);
    const id = "kCNob7RWo4O2oGzQ-8uB7w";
    const token = "fallback-token-that-is-long-enough-for-validation";
    const { hashShareToken } = await import("@/lib/shares/security");
    const record: FallbackRecord = {
      version: 1, id, tokenHash: hashShareToken(token), status: "pending",
      sourceBytes: source.byteLength, sourceType: "video/mp4", voiceBytes: voice.byteLength, voiceType: "audio/webm",
      start: 0.5, duration: 2, sourceKey: `render-fallback/${id}/source.mp4`, voiceKey: `render-fallback/${id}/voice.webm`,
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString()
    };
    const storage = await import("./storage");
    await storage.createFallbackUploads(record, token);
    await storage.saveLocalFallbackAsset(id, token, "source", new Blob([source]).stream(), source.byteLength);
    await storage.saveLocalFallbackAsset(id, token, "voice", new Blob([voice]).stream(), voice.byteLength);
    const { processFallback } = await import("./processor");
    const output = await processFallback(id, token);
    const outputPath = join(root, "verified-output.mp4");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(outputPath, output);
    const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", outputPath], { encoding: "utf8" }));
    expect(probe.streams.find((stream: { codec_type: string }) => stream.codec_type === "video").codec_name).toBe("h264");
    expect(probe.streams.find((stream: { codec_type: string }) => stream.codec_type === "audio").codec_name).toBe("aac");
    expect(Number(probe.format.duration)).toBeCloseTo(2, 1);
    expect(statSync(outputPath).size).toBeGreaterThan(1_000);
    expect(existsSync(join(root, "render-fallback", id))).toBe(false);
  });

  it("deletes abandoned uploads after their one-hour expiry", async () => {
    const id = "QzN7ouIYkJ1mYkp6KnF2kg";
    const token = "another-fallback-token-long-enough-to-be-valid";
    const { hashShareToken } = await import("@/lib/shares/security");
    const record: FallbackRecord = {
      version: 1, id, tokenHash: hashShareToken(token), status: "pending",
      sourceBytes: 100, sourceType: "video/mp4", voiceBytes: 100, voiceType: "audio/webm", start: 0, duration: 2,
      sourceKey: `render-fallback/${id}/source.mp4`, voiceKey: `render-fallback/${id}/voice.webm`,
      createdAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(), expiresAt: new Date(Date.now() - 60_000).toISOString()
    };
    const storage = await import("./storage");
    await storage.createFallbackUploads(record, token);
    await expect(storage.cleanupExpiredFallbacks()).resolves.toEqual({ inspected: 1, expired: 1 });
    expect(existsSync(join(root, "render-fallback", id))).toBe(false);
  });
});
