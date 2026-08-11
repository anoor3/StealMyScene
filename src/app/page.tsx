import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { SceneShelf } from "@/components/scene-shelf";
import { getPublishedScenes } from "@/lib/scenes/catalog";

export default function HomePage() {
  const scenes = getPublishedScenes();
  const featured = scenes[0];
  const phoneScene = scenes[1] ?? featured;
  const previewScenes = scenes.slice(0, 4);

  return (
    <>
      <section className="theater-hero">
        <div className="theater-hero__inner shell">
          <div className="theater-hero__copy">
            <span className="theater-hero__eyebrow">Your voice. Center stage.</span>
            <h1>
              <span>Pick a scene.</span>
              <span>Say the line.</span>
              <strong>Steal the scene.</strong>
            </h1>
            <span className="theater-hero__slash" aria-hidden="true" />
            <p>Dub original moments with your own voice. Fast, funny, and yours to keep.</p>
            <div className="button-row theater-hero__actions">
              <Link className="button theater-button" href={`/scene/${featured.slug}`}>
                Start dubbing <span aria-hidden="true">ϟ</span>
              </Link>
              <Link className="button button--secondary theater-button--secondary" href="/how-it-works">
                <span className="play-dot" aria-hidden="true">▶</span> See how it works
              </Link>
            </div>
            <p className="theater-hero__trust"><span aria-hidden="true">✓</span> No signup <i /> <span aria-hidden="true">✓</span> Nothing uploaded <i /> <span aria-hidden="true">✓</span> Unlimited retakes</p>
          </div>

          <div className="theater-product" aria-hidden="true">
            <div className="theater-monitor">
              <div className="theater-monitor__bar">
                <BrandLogo size="mock" />
                <span>Pick a scene</span>
              </div>
              <div className="theater-monitor__grid">
                {previewScenes.map((scene) => (
                  <div className="theater-monitor__card" key={scene.id}>
                    <Image src={scene.thumbnailUrl} alt="" fill sizes="160px" />
                    <span>{scene.title}</span>
                  </div>
                ))}
              </div>
              <div className="theater-monitor__take">
                <div><small>Your line</small><strong>“{featured.quote}”</strong></div>
                <span className="mock-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>
                <span className="mock-mic">●</span>
                <span className="mock-cta">Steal the scene ϟ</span>
              </div>
            </div>
            <div className="theater-monitor__neck" />
            <div className="theater-monitor__base" />

            <div className="theater-phone">
              <span className="theater-phone__notch" />
              <BrandLogo size="phone" />
              <small>Pick a scene</small>
              <div className="theater-phone__scene">
                <Image src={phoneScene.thumbnailUrl} alt="" fill sizes="190px" />
                <span className="theater-phone__play">▶</span>
                <b>{phoneScene.title}</b>
              </div>
              <div className="theater-phone__line"><small>Your line</small><strong>“{phoneScene.quote}”</strong></div>
              <span className="phone-wave" />
              <span className="phone-mic">●</span>
              <span className="phone-cta">Steal the scene ϟ</span>
            </div>
          </div>
        </div>
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
        <p>{scenes.length} original scenes. Zero signup forms.</p>
        <Link className="button" href="/explore">Find a scene <span aria-hidden="true">→</span></Link>
      </section>
    </>
  );
}
