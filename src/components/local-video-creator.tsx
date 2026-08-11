"use client";

import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Scene } from "@/lib/scenes/schema";
import {
  clipRangeError,
  createUniformWordTimings,
  LOCAL_VIDEO_MAX_CLIP_DURATION,
  LOCAL_VIDEO_MAX_SOURCE_DURATION,
  localVideoTitle,
  validateLocalVideoFile
} from "@/lib/studio/local-video";
import { DubStudio } from "./dub-studio";

type LocalScene = { scene: Scene; start: number; reencodeVideo: boolean };

export function LocalVideoCreator() {
  const [file, setFile] = useState<File>();
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [sourceDuration, setSourceDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [line, setLine] = useState("");
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [configured, setConfigured] = useState<LocalScene>();
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewingRef = useRef(false);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  const trimDuration = useMemo(() => Math.max(0, trimEnd - trimStart), [trimEnd, trimStart]);

  async function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    setChecking(true);
    setError(undefined);
    setConfigured(undefined);
    setSourceDuration(0);
    try {
      await validateLocalVideoFile(nextFile);
      setFile(nextFile);
      setSourceUrl(URL.createObjectURL(nextFile));
      setLine("");
    } catch (caught) {
      setFile(undefined);
      setSourceUrl(undefined);
      setError(caught instanceof Error ? caught.message : "That video could not be opened.");
    } finally {
      setChecking(false);
    }
  }

  function loadedMetadata() {
    const duration = previewRef.current?.duration ?? 0;
    if (!Number.isFinite(duration) || duration <= 0 || duration > LOCAL_VIDEO_MAX_SOURCE_DURATION) {
      setError(duration > LOCAL_VIDEO_MAX_SOURCE_DURATION
        ? "Choose a source video that is 10 minutes or shorter."
        : "The browser could not read this video's duration.");
      setSourceDuration(0);
      return;
    }
    setError(undefined);
    setSourceDuration(duration);
    setTrimStart(0);
    setTrimEnd(Math.min(LOCAL_VIDEO_MAX_CLIP_DURATION, duration));
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void chooseFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void chooseFile(event.dataTransfer.files[0]);
  }

  async function previewSelection() {
    const video = previewRef.current;
    const rangeError = clipRangeError(trimStart, trimEnd, sourceDuration);
    if (!video || rangeError) {
      setError(rangeError ?? "The preview is unavailable.");
      return;
    }
    video.pause();
    video.currentTime = trimStart;
    previewingRef.current = true;
    await video.play().catch(() => setError("Press play in the video once, then preview the selection again."));
  }

  function trackPreview() {
    const video = previewRef.current;
    if (video && previewingRef.current && video.currentTime >= trimEnd - 0.02) {
      video.pause();
      video.currentTime = trimStart;
      previewingRef.current = false;
    }
  }

  function openStudio() {
    if (!file || !sourceUrl) return;
    const rangeError = clipRangeError(trimStart, trimEnd, sourceDuration);
    if (rangeError) {
      setError(rangeError);
      return;
    }
    try {
      const duration = trimEnd - trimStart;
      const transcript = line.trim().replace(/\s+/g, " ");
      const timestamp = new Date().toISOString();
      setConfigured({
        start: trimStart,
        reencodeVideo: file.type === "video/webm" || file.name.toLowerCase().endsWith(".webm"),
        scene: {
          id: "scene_local_upload",
          slug: "your-video",
          title: localVideoTitle(file.name),
          quote: transcript,
          sourceTitle: file.name,
          sourceType: "user-submitted",
          category: "Your video",
          videoUrl: sourceUrl,
          thumbnailUrl: "/icon.svg",
          duration,
          transcript,
          wordTimings: createUniformWordTimings(transcript, duration),
          dubCount: 0,
          viewCount: 0,
          rightsStatus: "pending",
          rightsOwner: "Local user",
          rightsBasis: "Private local processing only",
          published: false,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      });
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The dubbing studio could not be prepared.");
    }
  }

  if (configured) {
    return (
      <DubStudio
        scene={configured.scene}
        sourceClip={{ start: configured.start, duration: configured.scene.duration, reencodeVideo: configured.reencodeVideo }}
        sourcePoster={null}
        onExit={() => setConfigured(undefined)}
      />
    );
  }

  return (
    <div className="local-create page shell">
      <header className="page-heading local-create__heading">
        <span className="eyebrow">Your clip. Your performance.</span>
        <h1>Dub your own video.</h1>
        <p>Drop a video, choose up to 15 seconds, perform the line, and download the result. Quick mode stays on this device unless you explicitly choose fallback after a local render failure.</p>
      </header>

      <section className="local-create__panel" aria-labelledby="local-source-title">
        <div className="admin-panel__heading">
          <span>01</span>
          <div><h2 id="local-source-title">Choose a local video</h2><p>MP4, MOV, or WebM. Maximum 250 MB and 10 minutes.</p></div>
        </div>

        <label
          className={dragging ? "drop-zone local-drop-zone is-dragging" : "drop-zone local-drop-zone"}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
        >
          <strong>{checking ? "Checking video…" : file ? file.name : "Drop your video here"}</strong>
          <span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · choose another` : "or click to choose a file"}</span>
          <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={handleFileInput} disabled={checking} />
        </label>

        {error && <p className="form-error form-error--panel" role="alert">{error}</p>}

        {sourceUrl && (
          <div className="trim-workspace local-trim-workspace">
            <video ref={previewRef} src={sourceUrl} controls playsInline preload="metadata" onLoadedMetadata={loadedMetadata} onTimeUpdate={trackPreview} aria-label="Local source video preview" />
            <div className="trim-controls">
              <label><span>Start · {trimStart.toFixed(1)}s</span><input type="range" min="0" max={Math.max(0, sourceDuration - 1)} step="0.1" value={trimStart} onChange={(event) => setTrimStart(Math.min(Number(event.target.value), trimEnd - 1))} disabled={!sourceDuration} /></label>
              <label><span>End · {trimEnd.toFixed(1)}s</span><input type="range" min="1" max={sourceDuration || 1} step="0.1" value={trimEnd} onChange={(event) => setTrimEnd(Math.min(sourceDuration, Math.max(Number(event.target.value), trimStart + 1)))} disabled={!sourceDuration} /></label>
              <strong>Selected: {trimDuration.toFixed(1)} seconds</strong>
              <button className="button button--secondary button--full" type="button" onClick={() => void previewSelection()} disabled={!sourceDuration}>▶ Preview selected clip</button>
              <label className="field"><span>Your line <small>Words are timed evenly across the selected clip</small></span><textarea value={line} maxLength={300} onChange={(event) => setLine(event.target.value)} placeholder="Type the line you want to perform" /></label>
              <button className="button button--full" type="button" onClick={openStudio} disabled={!sourceDuration || !line.trim()}>Open dubbing studio <span aria-hidden="true">→</span></button>
            </div>
          </div>
        )}
      </section>

      <aside className="local-create__privacy">
        <strong><span aria-hidden="true">⌁</span> Private quick mode</strong>
        <p>The selected video and microphone recording stay in browser memory during quick mode. They are never added to the public catalog. If you explicitly choose server fallback, temporary encrypted uploads are deleted after rendering.</p>
      </aside>
    </div>
  );
}
