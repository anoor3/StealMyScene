import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <div className="page shell prose-page">
      <header className="page-heading">
        <span className="eyebrow">No editing timeline required</span>
        <h1>One scene. One line. Your take.</h1>
        <p>StealMyScene turns a tiny performance into a downloadable video without sending your recording to us.</p>
      </header>
      <ol className="explanation-list">
        <li><span>01</span><div><h2>Choose</h2><p>Browse short, rights-cleared original scenes and open the one you want to perform.</p></div></li>
        <li><span>02</span><div><h2>Rehearse</h2><p>Watch the scene and read the line. Word-level cues show exactly when each word lands.</p></div></li>
        <li><span>03</span><div><h2>Record</h2><p>Allow microphone access. After a three-second countdown, the muted clip and recording start together and stop together.</p></div></li>
        <li><span>04</span><div><h2>Preview</h2><p>Hear your voice against the picture immediately. Retake as many times as you want.</p></div></li>
        <li><span>05</span><div><h2>Download</h2><p>Your browser replaces the audio locally. The finished MP4 downloads directly to your device.</p></div></li>
      </ol>
      <aside className="privacy-panel"><h2>Your voice stays yours.</h2><p>During Phase 1, recordings are held only in browser memory and never uploaded or saved by StealMyScene.</p></aside>
      <Link className="button" href="/explore">Pick a scene <span aria-hidden="true">→</span></Link>
    </div>
  );
}
