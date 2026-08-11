import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
if (!baseUrl) throw new Error("BASE_URL must point at the deployed HTTPS site");
const peakVus = Number(__ENV.PEAK_VUS || 1_000);
const requireCdn = __ENV.REQUIRE_CDN === "true";
const cacheHits = new Rate("cdn_cache_hit_ratio");
const originResponses = new Counter("origin_responses");

export const options = {
  discardResponseBodies: true,
  scenarios: {
    static_browse_spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP_DURATION || "2m", target: Math.max(1, Math.ceil(peakVus * 0.1)) },
        { duration: __ENV.SPIKE_DURATION || "3m", target: peakVus },
        { duration: __ENV.HOLD_DURATION || "5m", target: peakVus },
        { duration: "2m", target: 0 }
      ],
      gracefulRampDown: "30s"
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
    checks: ["rate>0.99"],
    ...(requireCdn ? { cdn_cache_hit_ratio: ["rate>0.95"] } : {})
  }
};

const pages = ["/", "/explore", "/trending", "/scene/wrong-door", "/scene/last-cookie", "/scene/final-voicemail"];
const assets = [
  "/data/scenes.json",
  "/scenes/v1/wrong-door.v1.jpg", "/scenes/v1/wrong-door.v1.mp4",
  "/scenes/v1/last-cookie.v1.jpg", "/scenes/v1/last-cookie.v1.mp4",
  "/scenes/v1/final-voicemail.v1.jpg", "/scenes/v1/final-voicemail.v1.mp4"
];

function cacheState(response) {
  const value = String(response.headers["Cf-Cache-Status"] || response.headers["X-Cache"] || response.headers["X-Vercel-Cache"] || "").toUpperCase();
  const hit = value.includes("HIT") || value.includes("STALE") || Number(response.headers.Age || 0) > 0;
  const miss = value.includes("MISS") || value.includes("BYPASS") || value.includes("DYNAMIC");
  if (hit || miss) cacheHits.add(hit);
  if (miss) originResponses.add(1);
}

export default function browseStaticSurface() {
  const page = pages[Math.floor(Math.random() * pages.length)];
  const asset = assets[Math.floor(Math.random() * assets.length)];
  const responses = http.batch([
    ["GET", `${baseUrl}${page}`, null, { tags: { surface: "page" } }],
    ["GET", `${baseUrl}${asset}`, null, { tags: { surface: "asset" } }]
  ]);
  for (const response of responses) {
    check(response, { "status is 200": (result) => result.status === 200 });
    cacheState(response);
  }
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const output = __ENV.SUMMARY_PATH || "test-results/load/phase2-k6-summary.json";
  return { [output]: JSON.stringify(data, null, 2), stdout: `\nPhase 2 k6 summary written to ${output}\n` };
}
