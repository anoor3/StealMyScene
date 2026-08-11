import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { webkit } from "playwright-core";

const origin = "http://127.0.0.1:3102";
const artifacts = "test-results/webkit";
mkdirSync(artifacts, { recursive: true });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(origin)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("WebKit E2E server did not become ready");
}

const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3102"], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, RATE_LIMIT_DRIVER: "memory" } });
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

let browser;
let page;
const errors = [];
try {
  await waitForServer();
  browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
  page = await context.newPage();
  await page.addInitScript(() => {
    const syntheticStream = async () => {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      gain.gain.value = 0.02;
      oscillator.connect(gain).connect(destination);
      oscillator.start();
      Object.assign(globalThis, { __smsWebKitAudio: { audioContext, oscillator } });
      return destination.stream;
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: syntheticStream }
    });
  });
  const externalRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin && !url.protocol.startsWith("blob")) externalRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const messageText = message.text();
    const isCancelledNextPrefetch = messageText.includes("?_rsc=")
      && messageText.endsWith("due to access control checks.");
    if (message.type() === "error" && !isCancelledNextPrefetch) errors.push(messageText);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Say the line/ }).waitFor();
  await page.goto(`${origin}/explore`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Find your line." }).waitFor();
  await page.goto(`${origin}/scene/wrong-door`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /Add your voice/ }).click();
  await page.getByRole("button", { name: "Add your voice" }).waitFor();
  await page.screenshot({ path: `${artifacts}/studio-ready-mobile.png`, fullPage: true });
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  if (accessibility.violations.length > 0) throw new Error(`WebKit accessibility violations: ${accessibility.violations.map(({ id }) => id).join(", ")}`);

  await page.getByRole("button", { name: "Add your voice" }).click();
  await page.getByText("Take recorded. Preview it or create the final scene.").waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Preview take" }).click();
  await page.getByRole("button", { name: "Create my scene" }).click();
  await page.getByText("Your scene is ready.").waitFor({ timeout: 120_000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download MP4" }).click();
  const download = await downloadPromise;
  const path = `${artifacts}/webkit-dub.mp4`;
  await download.saveAs(path);
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name", "-of", "json", path], { encoding: "utf8" }));
  if (!probe.streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "aac")) throw new Error("WebKit dub does not contain AAC audio");
  await page.screenshot({ path: `${artifacts}/studio-finished-mobile.png`, fullPage: true });

  await page.goto(`${origin}/create`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="file"]').setInputFiles("public/scenes/v1/wrong-door.v1.mp4");
  await page.getByLabel("Local source video preview").waitFor();
  await page.locator("textarea").fill("WebKit takes the scene");
  await page.screenshot({ path: `${artifacts}/local-create-setup-mobile.png`, fullPage: true });
  const createAccessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  if (createAccessibility.violations.length > 0) throw new Error(`WebKit local-create accessibility violations: ${createAccessibility.violations.map(({ id }) => id).join(", ")}`);
  await page.getByRole("button", { name: /Open dubbing studio/ }).click();
  await page.getByRole("button", { name: "Add your voice" }).click();
  await page.getByText("Take recorded. Preview it or create the final scene.").waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Create my scene" }).click();
  await page.getByText("Your scene is ready.").waitFor({ timeout: 120_000 });
  if (!(await page.getByRole("button", { name: "Download MP4" }).isVisible())) throw new Error("WebKit download fallback is not visible");
  const localDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download MP4" }).click();
  const localDownload = await localDownloadPromise;
  const localPath = `${artifacts}/webkit-local-upload.mp4`;
  await localDownload.saveAs(localPath);
  const localProbe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name", "-of", "json", localPath], { encoding: "utf8" }));
  if (!localProbe.streams.some((stream) => stream.codec_type === "video" && stream.codec_name === "h264")) throw new Error("WebKit local upload does not contain H.264 video");
  if (!localProbe.streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "aac")) throw new Error("WebKit local upload does not contain AAC audio");
  await page.screenshot({ path: `${artifacts}/local-create-finished-mobile.png`, fullPage: true });

  if (externalRequests.length > 0) throw new Error(`WebKit made unexpected external requests: ${externalRequests.join(", ")}`);
  if (errors.length > 0) throw new Error(`WebKit browser errors: ${errors.join(" | ")}`);
  console.log("WebKit E2E passed: mobile discovery → scene → recording → preview → local FFmpeg render → validated MP4 download");
  console.log("WebKit E2E passed: local upload → trim setup → recording → fallback download");
  console.log("WebKit E2E passed: WCAG A/AA scan and zero external recording requests");
} catch (error) {
  if (page) {
    await page.screenshot({ path: `${artifacts}/failure.png`, fullPage: true }).catch(() => undefined);
    console.error("WebKit browser errors:", errors);
    console.error("WebKit stylesheets:", await page.evaluate(() => Array.from(document.styleSheets).map((sheet) => {
      try { return { href: sheet.href, rules: sheet.cssRules.length }; } catch (styleError) { return { href: sheet.href, error: String(styleError) }; }
    })).catch(() => []));
  }
  console.error(serverLog);
  throw error;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
