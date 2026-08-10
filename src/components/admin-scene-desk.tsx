"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import type { WordTiming } from "@/lib/scenes/schema";

type UploadTarget =
  | { mode: "local" | "direct"; key: string; url: string; headers: Record<string, string> }
  | { mode: "multipart"; key: string; uploadId: string; parts: { partNumber: number; start: number; end: number; url: string }[] };

type Draft = {
  draftId: string;
  duration: number;
  transcript: string;
  wordTimings: WordTiming[];
  transcriptionEngine: string;
  clipUrl: string;
  thumbnailUrl: string;
  audioUrl: string;
};

async function jsonRequest<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({ error: "Invalid server response" }));
  if (!response.ok) throw new Error(body.error ?? `Request failed with ${response.status}`);
  return body;
}

async function uploadFile(file: File, target: UploadTarget, onProgress: (value: number) => void) {
  if (target.mode !== "multipart") {
    const response = await fetch(target.url, { method: "PUT", headers: target.headers, body: file });
    const body = target.mode === "local" ? await response.json().catch(() => ({})) : undefined;
    if (!response.ok) throw new Error(body?.error ?? `Upload failed with ${response.status}`);
    onProgress(1);
    return target.key;
  }

  const completed: { partNumber: number; etag: string }[] = [];
  for (const [index, part] of target.parts.entries()) {
    const response = await fetch(part.url, { method: "PUT", body: file.slice(part.start, part.end) });
    if (!response.ok) throw new Error(`Multipart upload failed on part ${part.partNumber}`);
    const etag = response.headers.get("etag");
    if (!etag) throw new Error("Storage CORS must expose the ETag response header");
    completed.push({ partNumber: part.partNumber, etag });
    onProgress((index + 1) / target.parts.length);
  }
  await jsonRequest("/api/admin/uploads/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: target.key, uploadId: target.uploadId, parts: completed })
  });
  return target.key;
}

export function AdminSceneDesk() {
  const router = useRouter();
  const [file, setFile] = useState<File>();
  const [fileUrl, setFileUrl] = useState<string>();
  const [sourceDuration, setSourceDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [transcriptHint, setTranscriptHint] = useState("");
  const [draft, setDraft] = useState<Draft>();
  const [transcript, setTranscript] = useState("");
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"select" | "uploading" | "processing" | "review" | "publishing" | "published">("select");
  const [error, setError] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  function chooseFile(next?: File) {
    if (!next) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(next.type)) {
      setError("Choose an MP4, WebM, or MOV video.");
      return;
    }
    if (next.size > 500 * 1024 * 1024) {
      setError("The source video must be 500 MB or smaller.");
      return;
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(next);
    setFileUrl(URL.createObjectURL(next));
    setDraft(undefined);
    setStage("select");
    setError("");
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0]);
  }

  async function ingest() {
    if (!file || trimEnd - trimStart < 1 || trimEnd - trimStart > 30) {
      setError("Choose a source and a trim between 1 and 30 seconds.");
      return;
    }
    setError("");
    setStage("uploading");
    setProgress(0);
    try {
      const target = await jsonRequest<UploadTarget>("/api/admin/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size })
      });
      const uploadKey = await uploadFile(file, target, setProgress);
      setStage("processing");
      const processed = await jsonRequest<Draft>("/api/admin/scenes/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadKey, start: trimStart, end: trimEnd, transcriptHint: transcriptHint || undefined })
      });
      setDraft(processed);
      setTranscript(processed.transcript);
      setWordTimings(processed.wordTimings);
      setStage("review");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Ingestion failed");
      setStage("select");
    }
  }

  function updateWord(index: number, field: keyof WordTiming, value: string) {
    setWordTimings((current) => current.map((timing, itemIndex) => itemIndex === index
      ? { ...timing, [field]: field === "word" ? value : Number(value) }
      : timing));
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    setStage("publishing");
    setError("");
    try {
      const result = await jsonRequest<{ scene: { slug: string } }>("/api/admin/scenes/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, draftId: draft.draftId, transcript, wordTimings })
      });
      setPublishedSlug(result.scene.slug);
      setStage("published");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Publication failed");
      setStage("review");
    }
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const trimDuration = useMemo(() => Math.max(0, trimEnd - trimStart), [trimEnd, trimStart]);

  return (
    <div className="admin-desk">
      <header className="admin-desk__header">
        <div><span className="eyebrow">Internal tool</span><h1>Scene ingestion desk</h1><p>Upload → trim → transcribe → review → rights check → publish.</p></div>
        <button className="quiet-button" type="button" onClick={() => void logout()}>Sign out</button>
      </header>

      {stage === "published" ? (
        <div className="admin-success"><span>✓</span><h2>Scene published.</h2><p>The rights gate passed and the manifest was updated.</p><a className="button" href={`/scene/${publishedSlug}`}>Open scene</a></div>
      ) : (
        <>
          <section className="admin-panel">
            <div className="admin-panel__heading"><span>01</span><div><h2>Source and trim</h2><p>Source bytes go directly to local validation or S3/R2—not through the app server in production.</p></div></div>
            <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={drop}>
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0])} />
              <strong>{file ? file.name : "Drop a source video here"}</strong>
              <span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · choose another` : "or click to choose MP4, WebM, or MOV · max 500 MB"}</span>
            </label>
            {fileUrl && (
              <div className="trim-workspace">
                <video src={fileUrl} controls playsInline onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration;
                  setSourceDuration(duration);
                  setTrimStart(0);
                  setTrimEnd(Math.min(10, duration));
                }} />
                <div className="trim-controls">
                  <label><span>Start · {trimStart.toFixed(1)}s</span><input type="range" min="0" max={Math.max(0, sourceDuration - 1)} step="0.1" value={trimStart} onChange={(event) => setTrimStart(Math.min(Number(event.target.value), trimEnd - 1))} /></label>
                  <label><span>End · {trimEnd.toFixed(1)}s</span><input type="range" min="1" max={sourceDuration} step="0.1" value={trimEnd} onChange={(event) => setTrimEnd(Math.max(Number(event.target.value), trimStart + 1))} /></label>
                  <strong>Selected: {trimDuration.toFixed(1)} seconds</strong>
                  <label className="field"><span>Expected line <small>(optional aid in local test mode)</small></span><input value={transcriptHint} maxLength={500} onChange={(event) => setTranscriptHint(event.target.value)} placeholder="WhisperX will transcribe the clip automatically" /></label>
                  <button className="button" type="button" onClick={() => void ingest()} disabled={stage === "uploading" || stage === "processing"}>
                    {stage === "uploading" ? `Uploading ${Math.round(progress * 100)}%` : stage === "processing" ? "Trimming & transcribing…" : "Process selected clip"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {draft && (
            <form onSubmit={publish}>
              <section className="admin-panel">
                <div className="admin-panel__heading"><span>02</span><div><h2>Human transcript review</h2><p>Listen against the waveform/audio and correct every word boundary before publishing. Engine: {draft.transcriptionEngine}.</p></div></div>
                <div className="draft-preview"><video src={draft.clipUrl} controls playsInline /><audio src={draft.audioUrl} controls /></div>
                <label className="field"><span>Full transcript</span><textarea required maxLength={500} value={transcript} onChange={(event) => setTranscript(event.target.value)} /></label>
                <div className="timing-table" role="table" aria-label="Word timings">
                  <div role="row" className="timing-row timing-row--header"><span>Word</span><span>Start</span><span>End</span></div>
                  {wordTimings.map((timing, index) => (
                    <div role="row" className="timing-row" key={`${index}-${timing.word}`}>
                      <input aria-label={`Word ${index + 1}`} required value={timing.word} onChange={(event) => updateWord(index, "word", event.target.value)} />
                      <input aria-label={`Start ${index + 1}`} required type="number" min="0" max={draft.duration} step="0.001" value={timing.start} onChange={(event) => updateWord(index, "start", event.target.value)} />
                      <input aria-label={`End ${index + 1}`} required type="number" min="0" max={draft.duration} step="0.001" value={timing.end} onChange={(event) => updateWord(index, "end", event.target.value)} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel__heading"><span>03</span><div><h2>Metadata and rights gate</h2><p>Publication is impossible until ownership/licensing evidence is explicit.</p></div></div>
                <div className="field-grid">
                  <label className="field"><span>Title</span><input name="title" required maxLength={100} /></label>
                  <label className="field"><span>URL slug</span><input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="lowercase-with-dashes" /></label>
                  <label className="field field--wide"><span>Featured quote</span><input name="quote" required maxLength={300} defaultValue={transcript} /></label>
                  <label className="field"><span>Source title</span><input name="sourceTitle" required maxLength={160} /></label>
                  <label className="field"><span>Source type</span><select name="sourceType" required defaultValue=""><option value="" disabled>Choose type</option><option value="original">Original</option><option value="user-submitted">Creator-submitted</option><option value="movie">Movie</option><option value="tv">TV</option></select></label>
                  <label className="field"><span>Category</span><input name="category" required maxLength={50} /></label>
                  <label className="field"><span>Rights status</span><select name="rightsStatus" required defaultValue=""><option value="" disabled>Not publishable</option><option value="cleared">Cleared</option><option value="licensed">Licensed</option></select></label>
                  <label className="field"><span>Rights owner</span><input name="rightsOwner" required maxLength={160} /></label>
                  <label className="field field--wide"><span>Rights basis / evidence</span><textarea name="rightsBasis" required minLength={10} maxLength={300} placeholder="Who owns it, what permission exists, and where the evidence is stored" /></label>
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="button" type="submit" disabled={stage === "publishing"}>{stage === "publishing" ? "Publishing…" : "Publish rights-cleared scene"}</button>
              </section>
            </form>
          )}

          {error && !draft && <p className="form-error form-error--panel" role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}
