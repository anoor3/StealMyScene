"use client";

import { useState } from "react";
import { analytics } from "@/lib/analytics/client";

type LinkState =
  | { status: "idle" }
  | { status: "uploading"; message: string }
  | { status: "ready"; url: string; expiresAt: string }
  | { status: "rejected"; message: string }
  | { status: "error"; message: string };

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "The temporary link request failed.");
  return body as T;
}

export function HostedLinkControls({ output, filename, title, transcriptHint, sceneId }: { output: Blob; filename: string; title: string; transcriptHint: string; sceneId: string }) {
  const [state, setState] = useState<LinkState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setState({ status: "uploading", message: "Preparing secure upload…" });
    try {
      const target = await responseJson<{ id: string; token: string; uploadUrl: string; headers: Record<string, string> }>(await fetch("/api/share-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: filename, contentType: "video/mp4", size: output.size, title })
      }));
      setState({ status: "uploading", message: "Uploading the finished dub…" });
      const uploadUrl = new URL(target.uploadUrl, window.location.origin);
      const upload = await fetch(uploadUrl, { method: "PUT", headers: target.headers, body: output });
      if (!upload.ok) throw new Error("The temporary upload failed. Your local download is unaffected.");
      setState({ status: "uploading", message: "Running the safety check…" });
      const finalizeResponse = await fetch(`/api/share-links/${target.id}/finalize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: target.token, transcriptHint })
      });
      const finalized = await finalizeResponse.json().catch(() => ({})) as { status?: string; url?: string; expiresAt?: string; rejectionReason?: string; error?: string };
      if (finalized.status === "rejected") {
        setState({ status: "rejected", message: finalized.rejectionReason ?? "The recording did not pass the safety check." });
        analytics.track("link_rejected", { sceneId });
        return;
      }
      if (!finalizeResponse.ok) throw new Error(finalized.error ?? "The temporary link could not be processed.");
      if (finalized.status !== "ready" || !finalized.url || !finalized.expiresAt) throw new Error("The temporary link is still processing. Try again shortly.");
      const url = new URL(finalized.url, window.location.origin).href;
      setState({ status: "ready", url, expiresAt: finalized.expiresAt });
      analytics.track("link_create", { sceneId });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "The temporary link could not be created." });
    }
  }

  async function copyLink() {
    if (state.status !== "ready") return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (state.status === "ready") {
    return (
      <div className="hosted-link hosted-link--ready">
        <strong>Temporary link ready</strong>
        <a href={state.url}>{state.url}</a>
        <button className="button button--secondary button--full" type="button" onClick={() => void copyLink()}>{copied ? "✓ Copied" : "Copy link"}</button>
        <small>Expires {new Date(state.expiresAt).toLocaleString()}</small>
      </div>
    );
  }

  return (
    <div className="hosted-link">
      <button className="quiet-button hosted-link__trigger" type="button" onClick={() => void createLink()} disabled={state.status === "uploading"}>
        {state.status === "uploading" ? state.message : "Get a temporary link"}
      </button>
      <small>Optional: uploads this finished dub for a safety check, then deletes it after 72 hours.</small>
      {(state.status === "error" || state.status === "rejected") && <p className="form-error" role="alert">{state.message}</p>}
    </div>
  );
}
