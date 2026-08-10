import { z } from "zod";

export const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const MAX_SOURCE_BYTES = 500 * 1024 * 1024;

export const presignUploadSchema = z.object({
  fileName: z.string().min(1).max(240),
  mimeType: z.enum(allowedVideoTypes),
  size: z.number().int().positive().max(MAX_SOURCE_BYTES)
});

export const completeUploadSchema = z.object({
  key: z.string().regex(/^incoming\/[a-f0-9-]{36}\.(?:mp4|webm|mov)$/),
  uploadId: z.string().min(1).max(1000),
  parts: z.array(z.object({ partNumber: z.number().int().min(1).max(10_000), etag: z.string().min(1).max(300) })).min(1).max(10_000)
});

export type PresignUpload = z.infer<typeof presignUploadSchema>;

export function extensionForUpload(fileName: string, mimeType: PresignUpload["mimeType"]): "mp4" | "webm" | "mov" {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (mimeType === "video/webm" && extension === "webm") return "webm";
  if (mimeType === "video/quicktime" && extension === "mov") return "mov";
  return "mp4";
}
