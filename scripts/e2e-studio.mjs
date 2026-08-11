import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright-core";

const origin = "http://127.0.0.1:3100";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const artifacts = "test-results/studio";
mkdirSync(artifacts, { recursive: true });

async function assertAccessible(page, label) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  if (results.violations.length > 0) {
    const summary = results.violations.map(({ id, impact, nodes }) =>
      `${id} (${impact}): ${nodes.map((node) => `${node.target.join(" ")} — ${node.failureSummary}`).join(" | ")}`
    ).join(", ");
    throw new Error(`${label} accessibility violations: ${summary}`);
  }
}

async function waitForServer(attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Production server did not become ready");
}

const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3100"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, RATE_LIMIT_DRIVER: "memory" }
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

let browser;
let page;
const browserErrors = [];
try {
  await waitForServer();
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream"
    ]
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    permissions: ["microphone"],
    viewport: { width: 1440, height: 1000 }
  });
  page = await context.newPage();
  await page.addInitScript(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return;
    mediaDevices.getUserMedia = async () => {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      oscillator.frequency.value = 220;
      gain.gain.value = 0.025;
      oscillator.connect(gain).connect(destination);
      oscillator.start();
      Object.assign(globalThis, { __smsFakeAudio: { audioContext, oscillator } });
      return destination.stream;
    };
  });
  const externalRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin && !url.protocol.startsWith("blob")) externalRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) browserErrors.push(`HTTP ${response.status()} ${response.url()}`);
  });

  await page.goto(`${origin}/dub/scene_001`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add your voice" }).waitFor();
  if (!(await page.evaluate(() => crossOriginIsolated))) throw new Error("Cross-origin isolation is not active");
  await assertAccessible(page, "Ready studio");
  await page.screenshot({ path: `${artifacts}/ready-desktop.png`, fullPage: true });
  await page.getByRole("button", { name: "Add your voice" }).click();
  await page.getByText("Take recorded. Preview it or create the final scene.").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${artifacts}/recorded-desktop.png`, fullPage: true });
  await page.getByRole("button", { name: "Preview take" }).click();
  await page.getByRole("button", { name: "Create my scene" }).click();
  await page.getByText("Your scene is ready.").waitFor({ timeout: 120_000 });
  const result = page.getByLabel("Finished dubbed scene");
  if (!(await result.isVisible())) throw new Error("Rendered result video is not visible");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download MP4" }).click();
  const download = await downloadPromise;
  if (!download.suggestedFilename().endsWith(".mp4")) throw new Error("Download did not produce an MP4 filename");
  const downloadPath = `${artifacts}/downloaded-dub.mp4`;
  await download.saveAs(downloadPath);
  const probe = JSON.parse(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name",
    "-show_entries", "format=duration",
    "-of", "json",
    downloadPath
  ], { encoding: "utf8" }));
  const streams = Object.fromEntries(probe.streams.map((stream) => [stream.codec_type, stream.codec_name]));
  if (streams.video !== "h264" || streams.audio !== "aac" || Number(probe.format.duration) < 4) {
    throw new Error(`Unexpected rendered media: ${JSON.stringify(probe)}`);
  }
  await page.screenshot({ path: `${artifacts}/finished-desktop.png`, fullPage: true });
  await assertAccessible(page, "Finished studio");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/explore`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `${artifacts}/explore-mobile.png`, fullPage: true });
  if (!(await page.getByRole("heading", { name: "Find your line." }).isVisible())) throw new Error("Mobile explore content is not visible");
  await assertAccessible(page, "Mobile explore");

  const denialPage = await context.newPage();
  await denialPage.addInitScript(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied for acceptance test", "NotAllowedError"); };
    }
  });
  await denialPage.goto(`${origin}/dub/scene_002`, { waitUntil: "domcontentloaded" });
  await denialPage.getByRole("button", { name: "Add your voice" }).click();
  await denialPage.getByText("Microphone permission denied.").waitFor();
  if (!(await denialPage.getByRole("button", { name: "Allow microphone & retry" }).isVisible())) throw new Error("Permission retry path is not visible");
  await assertAccessible(denialPage, "Permission-denied studio");
  await denialPage.close();

  const actionableErrors = browserErrors.filter((message) =>
    !message.includes("favicon") && !message.startsWith("Failed to load resource: the server responded with a status of 404")
  );
  if (actionableErrors.length > 0) throw new Error(`Browser errors: ${actionableErrors.join(" | ")}`);
  if (externalRequests.length > 0) throw new Error(`Unexpected external requests: ${externalRequests.join(", ")}`);

  console.log("E2E passed: permission → countdown → timed recording → preview → local FFmpeg render → MP4 download");
  console.log("E2E passed: cross-origin isolation, no external requests, and 390px mobile explore layout");
  console.log("E2E passed: WCAG A/AA automated scans and microphone-denied recovery path");
} catch (error) {
  if (page) {
    await page.screenshot({ path: `${artifacts}/failure.png`, fullPage: true }).catch(() => undefined);
    console.error("Studio status at failure:", await page.locator(".status-message").textContent().catch(() => "unavailable"));
    console.error("Browser errors:", browserErrors);
  }
  console.error(serverLog);
  throw error;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
