import { z } from "zod";

export const analyticsEventNameSchema = z.enum([
  "page_view",
  "scene_open",
  "record_start",
  "record_finish",
  "preview_start",
  "retake",
  "render_finish",
  "render_fallback",
  "share",
  "link_create",
  "link_rejected",
  "download",
  "second_scene_dub"
]);

export const analyticsEventSchema = z.object({
  name: analyticsEventNameSchema,
  timestamp: z.number().int().positive(),
  sessionId: z.string().uuid(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({})
});

export const analyticsBatchSchema = z.object({
  batchId: z.string().uuid(),
  events: z.array(analyticsEventSchema).min(1).max(30)
});

export type AnalyticsEventName = z.infer<typeof analyticsEventNameSchema>;
