import Link from "next/link";
import { SceneShelf } from "@/components/scene-shelf";
import { getPublishedScenes } from "@/lib/scenes/catalog";

export default function HomePage() {
  const scenes = getPublishedScenes();
  const featured = scenes[0];

  return (
    <>
      <section className="hero shell">
        <div className="hero__copy">
          <span className="eyebrow">Your voice. Their scene.</span>
          <h1>Say the line.<br /><em>Steal the scene.</em></h1>
          <p>Pick a moment, follow the words, and make it yours. Your recording stays on your device.</p>
          <div className="button-row">
            <Link className="button" href={`/scene/${featured.slug}`}><span aria-hidden="true">●</span> Dub this scene</Link>
            <Link className="button button--secondary" href="/explore">Browse all scenes</Link>
          </div>
          <p className="privacy-note"><span aria-hidden="true">⌁</span> No signup. No upload. Unlimited retakes.</p>
        </div>
        <Link className="hero__scene" href={`/scene/${featured.slug}`} aria-label={`Try ${featured.title}`}>
          <video src={featured.videoUrl} poster={featured.thumbnailUrl} autoPlay muted loop playsInline />
          <span className="hero__badge">Original scene</span>
          <span className="hero__quote">“{featured.quote}”</span>
          <span className="hero__play" aria-hidden="true">▶</span>
        </Link>
      </section>

      <SceneShelf eyebrow="Fresh lines" title="Pick your next scene" scenes={scenes.slice(1, 9)} />

      <section className="how shell" aria-labelledby="how-title">
        <div className="section-heading section-heading--center">
          <div><span className="eyebrow">Three beats. Under a minute.</span><h2 id="how-title">How it works</h2></div>
        </div>
        <ol className="steps">
          <li><span>01</span><h3>Pick a scene</h3><p>Choose an original prompt that fits your energy.</p></li>
          <li><span>02</span><h3>Perform the line</h3><p>Follow the word timing while the scene plays silently.</p></li>
          <li><span>03</span><h3>Keep your take</h3><p>Preview, retry, render, and download locally.</p></li>
        </ol>
      </section>

      <section className="final-cta shell">
        <span className="eyebrow">The stage is waiting</span>
        <h2>Give us your best take.</h2>
        <p>Twenty-four original scenes. Zero signup forms.</p>
        <Link className="button" href="/explore">Find a scene <span aria-hidden="true">→</span></Link>
      </section>
    </>
  );
}
