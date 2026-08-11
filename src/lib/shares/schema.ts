import { z } from "zod";

export const SHARE_MAX_BYTES = 25 * 1024 * 1024;
export const SHARE_TTL_MS = 72 * 60 * 60 * 1000;
export const SHARE_UPLOAD_TTL_MS = 60 * 60 * 1000;

export const shareIdSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);

export const createShareSchema = z.object({
  fileName: z.string().min(1).max(160).regex(/\.mp4$/i),
  contentType: z.literal("video/mp4"),
  size: z.number().int().positive().max(SHARE_MAX_BYTES),
  title: z.string().trim().min(1).max(100)
});

export const finalizeShareSchema = z.object({
  token: z.string().min(32).max(100),
  transcriptHint: z.string().trim().min(1).max(500).optional()
});

export const shareRecordSchema = z.object({
  version: z.literal(1),
  id: shareIdSchema,
  status: z.enum(["pending_upload", "processing", "ready", "rejected", "expired", "error"]),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().min(1).max(100),
  fileName: z.string().min(1).max(160),
  contentType: z.literal("video/mp4"),
  bytes: z.number().int().positive().max(SHARE_MAX_BYTES),
  mediaKey: z.string().min(1).max(300),
  createdAt: z.string().datetime(),
  uploadExpiresAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  rejectionReason: z.string().max(200).optional(),
  errorMessage: z.string().max(200).optional(),
  moderation: z.enum(["pending", "passed", "rejected"]).default("pending")
});

export type ShareRecord = z.infer<typeof shareRecordSchema>;
export type CreateShareInput = z.infer<typeof createShareSchema>;

export function publicShareStatus(record: ShareRecord) {
  return {
    id: record.id,
    status: record.status,
    title: record.title,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    rejectionReason: record.rejectionReason,
    errorMessage: record.errorMessage,
    ...(record.status === "ready" ? { url: `/s/${record.id}` } : {})
  };
}

export function shareIsExpired(record: ShareRecord, now = Date.now()): boolean {
  const deadline = record.status === "pending_upload" ? record.uploadExpiresAt : record.expiresAt;
  return Boolean(deadline && new Date(deadline).getTime() <= now);
}
