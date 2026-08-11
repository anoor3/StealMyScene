import { z } from "zod";
import { shareIdSchema } from "@/lib/shares/schema";

export const FALLBACK_TTL_MS = 60 * 60 * 1_000;
export const FALLBACK_MAX_SOURCE_BYTES = 250 * 1024 * 1024;
export const FALLBACK_MAX_VOICE_BYTES = 25 * 1024 * 1024;

export const createFallbackSchema = z.object({
  sourceBytes: z.number().int().positive().max(FALLBACK_MAX_SOURCE_BYTES),
  sourceType: z.enum(["video/mp4", "video/quicktime", "video/webm"]),
  voiceBytes: z.number().int().positive().max(FALLBACK_MAX_VOICE_BYTES),
  voiceType: z.string().min(1).max(100).refine((type) => type.startsWith("audio/"), "Voice must be audio"),
  start: z.number().finite().min(0).max(10 * 60),
  duration: z.number().finite().min(1).max(15)
});

export const fallbackRecordSchema = createFallbackSchema.extend({
  version: z.literal(1),
  id: shareIdSchema,
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["pending", "processing"]),
  sourceKey: z.string().min(1).max(300),
  voiceKey: z.string().min(1).max(300),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});

export const finalizeFallbackSchema = z.object({ token: z.string().min(32).max(100) });
export type FallbackRecord = z.infer<typeof fallbackRecordSchema>;
