import { browser } from "k6/browser";
import { Rate, Trend } from "k6/metrics";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
if (!baseUrl) throw new Error("BASE_URL must point at the deployed HTTPS site");

const firstFrame = new Trend("video_first_frame_ms", true);
const firstFrameSuccess = new Rate("video_first_frame_success");
const scenes = ["unexpected-sermon", "moon-landing", "cartoon-moon", "park-entrance"];

export const options = {
  scenarios: {
    browser_first_frame: {
      executor: "shared-iterations",
      vus: Number(__ENV.BROWSER_VUS || 5),
      iterations: Number(__ENV.BROWSER_ITERATIONS || 50),
      maxDuration: __ENV.BROWSER_MAX_DURATION || "10m",
      options: { browser: { type: "chromium" } }
    }
  },
  thresholds: {
    video_first_frame_success: ["rate>0.99"],
    video_first_frame_ms: ["p(95)<1200", "p(99)<2000"],
    browser_http_req_failed: ["rate<0.01"]
  }
};

export default async function measureVideoFirstFrame() {
  const page = await browser.newPage();
  try {
    const slug = scenes[__ITER % scenes.length];
    await page.goto(`${baseUrl}/scene/${slug}`, { waitUntil: "domcontentloaded" });
    const timeToFrame = await page.evaluate(async () => {
      const video = document.querySelector("video");
      if (!(video instanceof HTMLVideoElement)) throw new Error("Scene video was not found");
      video.muted = true;
      const frame = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("First video frame timed out")), 15_000);
        if (typeof video.requestVideoFrameCallback === "function") {
          video.requestVideoFrameCallback(() => { clearTimeout(timeout); resolve(performance.now()); });
        } else {
          video.addEventListener("playing", () => { clearTimeout(timeout); resolve(performance.now()); }, { once: true });
        }
      });
      await video.play();
      return frame;
    });
    firstFrame.add(Number(timeToFrame), { scene: slug });
    firstFrameSuccess.add(true, { scene: slug });
  } catch (error) {
    firstFrameSuccess.add(false);
    throw error;
  } finally {
    await page.close();
  }
}

export function handleSummary(data) {
  const output = __ENV.BROWSER_SUMMARY_PATH || "test-results/load/phase2-browser-summary.json";
  return { [output]: JSON.stringify(data, null, 2), stdout: `\nPhase 2 browser first-frame summary written to ${output}\n` };
}
