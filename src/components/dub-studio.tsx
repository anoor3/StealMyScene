"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { analytics } from "@/lib/analytics/client";
import type { Scene } from "@/lib/scenes/schema";
import { activeWordIndex, microphoneErrorMessage, selectRecordingMimeType } from "@/lib/studio/media";
import { renderDub } from "@/lib/studio/render";
import { initialStudioState, studioReducer } from "@/lib/studio/state";
import { Waveform } from "./waveform";

function stopStream(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function DubStudio({ scene }: { scene: Scene }) {
  const [state, dispatch] = useReducer(studioReducer, initialStudioState);
  const [recording, setRecording] = useState<Blob>();
  const [recordingUrl, setRecordingUrl] = useState<string>();
  const [resultUrl, setResultUrl] = useState<string>();
  const [analyser, setAnalyser] = useState<AnalyserNode>();
  const [activeWord, setActiveWord] = useState(-1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanCapture = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
    setAnalyser(undefined);
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  useEffect(() => () => {
    cleanCapture();
  }, [cleanCapture]);

  useEffect(() => () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  useEffect(() => () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);

  const resetOutput = useCallback(() => {
    setRecording(undefined);
    setRecordingUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return undefined;
    });
    setResultUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return undefined;
    });
    setActiveWord(-1);
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, []);

  const trackRecordingTime = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const time = Math.min(video.currentTime, scene.duration);
    dispatch({ type: "TICK", elapsed: time });
    setActiveWord(activeWordIndex(scene.wordTimings, time));
    if (time >= scene.duration - 0.02) stopRecording();
  }, [scene.duration, scene.wordTimings, stopRecording]);

  async function startRecording() {
    dispatch({ type: "REQUEST_PERMISSION" });
    resetOutput();

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      dispatch({ type: "FAIL", message: "This browser cannot record audio. Use a current version of Safari, Chrome, Firefox, or Edge." });
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
    } catch (error) {
      cleanCapture();
      const failure = microphoneErrorMessage(error);
      dispatch(failure.denied ? { type: "PERMISSION_DENIED" } : { type: "FAIL", message: failure.message });
      return;
    }

    try {
      streamRef.current = stream;
      const AudioContextClass = window.AudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const nextAnalyser = audioContext.createAnalyser();
      nextAnalyser.fftSize = 128;
      source.connect(nextAnalyser);
      setAnalyser(nextAnalyser);

      for (let count = 3; count >= 1; count -= 1) {
        dispatch({ type: "COUNTDOWN", value: count });
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (!stream.active) throw new DOMException("Microphone disconnected", "NotReadableError");
      }

      const mimeType = selectRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", ({ data }) => {
        if (data.size > 0) chunks.push(data);
      });
      recorder.addEventListener("error", () => dispatch({ type: "FAIL", message: "The recording stopped unexpectedly. Please retake the scene." }));
      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        cleanCapture();
        if (blob.size === 0) {
          dispatch({ type: "FAIL", message: "The microphone returned an empty recording. Check its input level and try again." });
          return;
        }
        setRecording(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        dispatch({ type: "RECORDING_READY" });
        analytics.track("record_finish", { sceneId: scene.id, bytes: blob.size });
      }, { once: true });

      const video = videoRef.current;
      if (!video) throw new Error("The scene player is unavailable.");
      video.pause();
      video.currentTime = 0;
      video.muted = true;
      recorder.start(250);
      dispatch({ type: "START_RECORDING" });
      analytics.track("record_start", { sceneId: scene.id });
      await video.play();
      stopTimerRef.current = setTimeout(stopRecording, (scene.duration + 0.75) * 1000);
    } catch (error) {
      cleanCapture();
      const detail = error instanceof DOMException
        ? `${error.name}: ${error.message}`
        : error instanceof Error ? error.message : "unknown browser failure";
      dispatch({ type: "FAIL", message: `Recording could not start (${detail}). Reload the scene and try again.` });
    }
  }

  async function previewRecording() {
    const video = videoRef.current;
    const audio = previewAudioRef.current;
    if (!video || !audio || !recordingUrl) return;
    video.pause();
    audio.pause();
    video.currentTime = 0;
    audio.currentTime = 0;
    video.muted = true;
    await Promise.all([video.play(), audio.play()]);
    analytics.track("preview_start", { sceneId: scene.id });
  }

  function retake() {
    cleanCapture();
    videoRef.current?.pause();
    previewAudioRef.current?.pause();
    resetOutput();
    dispatch({ type: "RESET" });
    analytics.track("retake", { sceneId: scene.id });
  }

  async function processRecording() {
    if (!recording) return;
    dispatch({ type: "PROCESS" });
    try {
      const output = await renderDub({
        videoUrl: scene.videoUrl,
        recording,
        onProgress: (value) => dispatch({ type: "PROGRESS", value })
      });
      setResultUrl(URL.createObjectURL(output));
      dispatch({ type: "FINISH" });
      analytics.track("render_finish", { sceneId: scene.id, bytes: output.size });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown render failure";
      dispatch({ type: "FAIL", message: `${detail} Your recording is still available, so you can retry or retake.` });
    }
  }

  function download() {
    if (!resultUrl) return;
    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `steal-my-scene-${scene.slug}.mp4`;
    link.rel = "noopener";
    link.click();
    analytics.track("download", { sceneId: scene.id });
    const completed = Number(sessionStorage.getItem("sms_completed_dubs") ?? "0") + 1;
    sessionStorage.setItem("sms_completed_dubs", String(completed));
    if (completed === 2) analytics.track("second_scene_dub", { sceneId: scene.id });
  }

  const statusLabel = useMemo(() => {
    switch (state.status) {
      case "requesting_permission": return "Waiting for microphone permission…";
      case "countdown": return `Recording starts in ${state.countdown}`;
      case "recording": return `Recording ${state.elapsed.toFixed(1)} of ${scene.duration.toFixed(1)} seconds`;
      case "recorded": return "Take recorded. Preview it or create the final scene.";
      case "processing": return `Creating your scene… ${Math.round(state.renderProgress * 100)}%`;
      case "finished": return "Your scene is ready.";
      case "permission_denied": return "Microphone permission denied.";
      case "error": return state.message ?? "Something went wrong.";
      default: return "Ready to record.";
    }
  }, [scene.duration, state]);

  const showingResult = state.status === "finished" && resultUrl;

  return (
    <div className="studio shell">
      <header className="studio__header">
        <Link className="back-link" href={`/scene/${scene.slug}`}>← Back to scene</Link>
        <div><span className="eyebrow">Dub studio</span><h1>{scene.title}</h1></div>
        <span className="local-badge">⌁ Local only</span>
      </header>

      <div className="studio__layout">
        <section className="studio__stage" aria-label="Scene preview and transcript">
          {showingResult ? (
            <video key={resultUrl} src={resultUrl} controls playsInline autoPlay aria-label="Finished dubbed scene" />
          ) : (
            <video
              ref={videoRef}
              src={scene.videoUrl}
              poster={scene.thumbnailUrl}
              controls={state.status === "ready" || state.status === "recorded" || state.status === "error"}
              playsInline
              preload="auto"
              onEnded={state.status === "recording" ? stopRecording : undefined}
              onTimeUpdate={state.status === "recording" ? trackRecordingTime : undefined}
              aria-label={`${scene.title} source scene`}
            />
          )}

          {(state.status === "countdown" || state.status === "requesting_permission") && (
            <div className="countdown" role="status"><span>{state.status === "countdown" ? state.countdown : "…"}</span><small>Get ready</small></div>
          )}
          {state.status === "processing" && (
            <div className="processing-overlay" role="status">
              <span className="spinner" aria-hidden="true" />
              <strong>Creating your scene…</strong>
              <small>Keep this tab open. The render is happening on your device.</small>
            </div>
          )}

          {!showingResult && (
            <div className="transcript" aria-label="Timed transcript">
              {scene.wordTimings.map((timing, index) => (
                <span key={`${timing.word}-${index}`} className={index === activeWord ? "is-active" : index < activeWord ? "is-past" : undefined}>
                  {timing.word}{" "}
                </span>
              ))}
            </div>
          )}
          {recordingUrl && <audio ref={previewAudioRef} src={recordingUrl} onEnded={() => videoRef.current?.pause()} />}
        </section>

        <aside className="studio__controls" aria-labelledby="controls-title">
          <span className="eyebrow">Your take</span>
          <h2 id="controls-title">
            {state.status === "finished" ? "Scene stolen." : state.status === "recorded" ? "How did that feel?" : "Ready when you are."}
          </h2>
          <p className={`status-message status-message--${state.status}`} aria-live="polite">{statusLabel}</p>

          {state.status === "recording" && (
            <>
              <div className="recording-time"><span>● REC</span><strong>{state.elapsed.toFixed(1)} / {scene.duration.toFixed(1)}</strong></div>
              <Waveform analyser={analyser} active />
              <button className="button button--secondary button--full" type="button" onClick={stopRecording}>Finish early</button>
            </>
          )}

          {(state.status === "ready" || state.status === "permission_denied") && (
            <button className="record-button" type="button" onClick={() => void startRecording()}>
              <span aria-hidden="true">●</span>
              {state.status === "permission_denied" ? "Allow microphone & retry" : "Add your voice"}
            </button>
          )}

          {state.status === "recorded" && (
            <div className="control-stack">
              <button className="button button--secondary button--full" type="button" onClick={() => void previewRecording()}>▶ Preview take</button>
              <button className="button button--full" type="button" onClick={() => void processRecording()}>Create my scene <span aria-hidden="true">→</span></button>
              <button className="quiet-button" type="button" onClick={retake}>↻ Retake</button>
            </div>
          )}

          {state.status === "processing" && <progress max="1" value={state.renderProgress}>{state.renderProgress * 100}%</progress>}

          {state.status === "finished" && (
            <div className="control-stack">
              <button className="button button--full" type="button" onClick={download}>↓ Download MP4</button>
              <button className="quiet-button" type="button" onClick={retake}>↻ Record another take</button>
              <Link className="quiet-button" href="/explore">Try another scene →</Link>
            </div>
          )}

          {state.status === "error" && (
            <div className="control-stack">
              {recording && <button className="button button--full" type="button" onClick={() => void processRecording()}>Retry render</button>}
              <button className="button button--secondary button--full" type="button" onClick={retake}>Start over</button>
            </div>
          )}

          <div className="studio-tips">
            <strong>For the cleanest take</strong>
            <ul><li>Turn your speaker volume down</li><li>Keep the microphone a hand away</li><li>Follow the highlighted words</li></ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
