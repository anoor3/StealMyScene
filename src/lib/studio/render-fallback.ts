import type { RenderOptions } from "./render";

type UploadTarget = { url: string; headers: Record<string, string> };
type FallbackSession = { id: string; token: string; uploads: { source: UploadTarget; voice: UploadTarget } };

async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? fallback;
}

function sourceType(blob: Blob): "video/mp4" | "video/quicktime" | "video/webm" {
  if (blob.type === "video/webm") return "video/webm";
  if (blob.type === "video/quicktime") return "video/quicktime";
  return "video/mp4";
}

export async function renderDubOnServer({ videoUrl, recording, sourceClip, onProgress }: RenderOptions): Promise<Blob> {
  const sourceResponse = await fetch(videoUrl);
  if (!sourceResponse.ok) throw new Error("The source video could not be prepared for fallback.");
  const source = await sourceResponse.blob();
  onProgress?.(0.1);
  const created = await fetch("/api/render-fallback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sourceBytes: source.size,
      sourceType: sourceType(source),
      voiceBytes: recording.size,
      voiceType: recording.type || "audio/webm",
      start: sourceClip?.start ?? 0,
      duration: sourceClip?.duration ?? 15
    })
  });
  if (!created.ok) throw new Error(await errorMessage(created, "Server fallback could not start."));
  const session = await created.json() as FallbackSession;
  const upload = async (target: UploadTarget, body: Blob) => {
    const response = await fetch(target.url, { method: "PUT", headers: target.headers, body });
    if (!response.ok) throw new Error(await errorMessage(response, "A fallback upload failed."));
  };
  await Promise.all([upload(session.uploads.source, source), upload(session.uploads.voice, recording)]);
  onProgress?.(0.55);
  const finalized = await fetch(`/api/render-fallback/${session.id}/finalize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: session.token })
  });
  if (!finalized.ok) throw new Error(await errorMessage(finalized, "Server fallback could not render this scene."));
  const output = await finalized.blob();
  if (output.type !== "video/mp4" || output.size === 0) throw new Error("Server fallback returned an invalid file.");
  onProgress?.(1);
  return output;
}
