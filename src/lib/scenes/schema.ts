import { z } from "zod";

export const wordTimingSchema = z
  .object({
    word: z.string().min(1).max(80),
    start: z.number().nonnegative(),
    end: z.number().positive()
  })
  .refine(({ start, end }) => end > start, "Word end must be after its start");

export const sceneSchema = z
  .object({
    id: z.string().regex(/^scene_[a-zA-Z0-9_-]+$/),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1).max(100),
    quote: z.string().min(1).max(300),
    sourceTitle: z.string().min(1).max(160),
    sourceType: z.enum(["movie", "tv", "original", "user-submitted"]),
    category: z.string().min(1).max(50),
    videoUrl: z.union([z.string().startsWith("/"), z.string().url()]),
    thumbnailUrl: z.union([z.string().startsWith("/"), z.string().url()]),
    duration: z.number().positive().max(30),
    transcript: z.string().min(1).max(500),
    wordTimings: z.array(wordTimingSchema).min(1),
    dialogueStemUrl: z.union([z.string().startsWith("/"), z.string().url()]).optional(),
    musicFxStemUrl: z.union([z.string().startsWith("/"), z.string().url()]).optional(),
    dubCount: z.number().int().nonnegative(),
    viewCount: z.number().int().nonnegative(),
    rightsStatus: z.enum(["draft", "cleared", "licensed", "pending"]),
    rightsOwner: z.string().min(1).max(160),
    rightsBasis: z.string().min(1).max(300),
    published: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .superRefine((scene, context) => {
    const publishable = scene.rightsStatus === "cleared" || scene.rightsStatus === "licensed";
    if (scene.published && !publishable) {
      context.addIssue({
        code: "custom",
        message: "Published scenes require cleared or licensed rights",
        path: ["rightsStatus"]
      });
    }

    let previousEnd = 0;
    for (const [index, timing] of scene.wordTimings.entries()) {
      if (timing.start < previousEnd) {
        context.addIssue({
          code: "custom",
          message: "Word timings must be ordered and non-overlapping",
          path: ["wordTimings", index, "start"]
        });
      }
      if (timing.end > scene.duration + 0.05) {
        context.addIssue({
          code: "custom",
          message: "Word timing exceeds scene duration",
          path: ["wordTimings", index, "end"]
        });
      }
      previousEnd = timing.end;
    }
  });

export const sceneManifestSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  scenes: z.array(sceneSchema).min(1)
});

export type WordTiming = z.infer<typeof wordTimingSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type SceneManifest = z.infer<typeof sceneManifestSchema>;
