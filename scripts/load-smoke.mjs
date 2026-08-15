import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const origin = "http://127.0.0.1:3104";
const concurrency = Number(process.env.LOAD_CONCURRENCY || 50);
const requestCount = Number(process.env.LOAD_REQUESTS || 2_000);
const paths = ["/", "/explore", "/trending", "/scene/unexpected-sermon", "/scene/moon-landing", "/data/scenes.json", "/scenes/v3/unexpected-sermon.v3.jpg", "/scenes/v3/unexpected-sermon.v3.mp4"];
const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3104"], {
  stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, RATE_LIMIT_DRIVER: "memory" }
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(origin)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Load smoke server did not start");
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

try {
  await waitForServer();
  for (const path of paths) await fetch(`${origin}${path}`);
  let next = 0;
  let errors = 0;
  let bytes = 0;
  const durations = [];
  const cachePolicies = new Set();
  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = next++;
      if (index >= requestCount) return;
      const path = paths[index % paths.length];
      const start = performance.now();
      try {
        const response = await fetch(`${origin}${path}`);
        const body = await response.arrayBuffer();
        durations.push(performance.now() - start);
        bytes += body.byteLength;
        if (!response.ok) errors += 1;
        if (path.startsWith("/scenes/")) cachePolicies.add(response.headers.get("cache-control"));
      } catch { errors += 1; durations.push(performance.now() - start); }
    }
  }));
  const elapsedMs = performance.now() - startedAt;
  durations.sort((a, b) => a - b);
  const report = {
    kind: "local-origin-smoke-not-cdn-proof", generatedAt: new Date().toISOString(), origin, concurrency, requests: requestCount,
    p50Ms: Number(percentile(durations, 0.5).toFixed(2)), p95Ms: Number(percentile(durations, 0.95).toFixed(2)), p99Ms: Number(percentile(durations, 0.99).toFixed(2)),
    errorRate: errors / requestCount, requestsPerSecond: Number((requestCount / (elapsedMs / 1_000)).toFixed(2)), transferredBytes: bytes,
    immutableSceneCachePolicy: [...cachePolicies]
  };
  assert.equal(errors, 0);
  assert.ok(report.p95Ms < 1_000);
  assert.deepEqual(report.immutableSceneCachePolicy, ["public, max-age=31536000, immutable"]);
  mkdirSync("test-results/load", { recursive: true });
  writeFileSync("test-results/load/phase2-local-smoke.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  server.kill("SIGTERM");
}
