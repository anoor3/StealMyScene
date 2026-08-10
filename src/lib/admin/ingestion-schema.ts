import { z } from "zod";
import { wordTimingSchema } from "@/lib/scenes/schema";

export const processSceneSchema = z
  .object({
    uploadKey: z.string().regex(/^incoming\/[a-f0-9-]{36}\.(?:mp4|webm|mov)$/),
    start: z.number().nonnegative(),
    end: z.number().positive(),
    transcriptHint: z.string().max(500).optional()
  })
  .refine(({ start, end }) => end > start && end - start >= 1 && end - start <= 30, {
    message: "The selected clip must be between 1 and 30 seconds",
    path: ["end"]
  });

export const processedDraftSchema = z.object({
  draftId: z.string().uuid(),
  uploadKey: z.string(),
  duration: z.number().positive().max(30.1),
  transcript: z.string().min(1).max(500),
  wordTimings: z.array(wordTimingSchema).min(1),
  clipPath: z.string(),
  thumbnailPath: z.string(),
  audioPath: z.string(),
  createdAt: z.string().datetime()
});

export const publishSceneSchema = z.object({
  draftId: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(100),
  quote: z.string().min(1).max(300),
  sourceTitle: z.string().min(1).max(160),
  sourceType: z.enum(["movie", "tv", "original", "user-submitted"]),
  category: z.string().min(1).max(50),
  transcript: z.string().min(1).max(500),
  wordTimings: z.array(wordTimingSchema).min(1),
  rightsStatus: z.enum(["cleared", "licensed"]),
  rightsOwner: z.string().min(1).max(160),
  rightsBasis: z.string().min(10).max(300)
});

export type ProcessSceneInput = z.infer<typeof processSceneSchema>;
export type ProcessedDraft = z.infer<typeof processedDraftSchema>;
export type PublishSceneInput = z.infer<typeof publishSceneSchema>;
