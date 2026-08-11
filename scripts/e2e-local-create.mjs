import { strict as assert } from "node:assert";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright-core";

const origin = "http://127.0.0.1:3102";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const artifacts = "test-results/local-create";
mkdirSync(artifacts, { recursive: true });

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

async function assertAccessible(page, label) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  assert.equal(result.violations.length, 0, `${label}: ${result.violations.map(({ id }) => id).join(", ")}`);
}

const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3102"], {
  stdio: ["ignore", "pipe", "pipe"]
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

let browser;
const browserErrors = [];
try {
  await waitForServer();
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  });
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["microphone"], viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
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
    if (url.origin !== origin && url.protocol !== "blob:") externalRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) browserErrors.push(`HTTP ${response.status()} ${response.url()}`);
  });

  await page.goto(`${origin}/create`, { waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => crossOriginIsolated), true);
  await assertAccessible(page, "local upload setup");

  await page.locator('input[type="file"]').setInputFiles({ name: "fake.mp4", mimeType: "video/mp4", buffer: Buffer.from("not a video") });
  const uploadError = page.locator('.form-error[role="alert"]');
  await uploadError.waitFor();
  assert.match(await uploadError.innerText(), /does not match/);

  await page.locator('input[type="file"]').setInputFiles("public/scenes/v1/wrong-door.v1.mp4");
  await page.getByLabel("Local source video preview").waitFor();
  await page.locator("textarea").fill("This is my scene now");
  await page.getByRole("button", { name: /Open dubbing studio/ }).click();
  await page.getByRole("button", { name: "Add your voice" }).click();
  await page.getByRole("button", { name: "Create my scene" }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Create my scene" }).click();
  await page.getByRole("button", { name: "Download MP4" }).waitFor({ timeout: 120_000 });
  await assertAccessible(page, "finished local dub");
  await page.screenshot({ path: `${artifacts}/finished-desktop.png`, fullPage: true });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download MP4" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  assert.ok(downloadPath);
  const media = JSON.parse(execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,format_name:stream=codec_name,codec_type",
    "-of", "json",
    downloadPath
  ], { encoding: "utf8" }));
  assert.equal(media.streams.find(({ codec_type }) => codec_type === "video")?.codec_name, "h264");
  assert.equal(media.streams.find(({ codec_type }) => codec_type === "audio")?.codec_name, "aac");
  assert.ok(Number(media.format.duration) >= 1 && Number(media.format.duration) <= 15.1);
  assert.equal(externalRequests.length, 0, `Unexpected external requests: ${externalRequests.join(", ")}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/create`, { waitUntil: "networkidle" });
  await assertAccessible(page, "mobile local upload setup");
  await page.screenshot({ path: `${artifacts}/setup-mobile.png`, fullPage: true });

  assert.deepEqual(browserErrors, []);
  console.log("Local create E2E passed: validation → trim setup → record → local render → valid MP4 download");
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
