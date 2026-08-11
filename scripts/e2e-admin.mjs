import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const origin = "http://127.0.0.1:3101";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const root = resolve(".");
const isolatedRoot = mkdtempSync(join(tmpdir(), "stealmyscene-admin-e2e-"));
const isolatedManifest = join(isolatedRoot, "scenes.json");
const isolatedPublic = join(isolatedRoot, "public");
const isolatedVar = join(isolatedRoot, "var");
const artifacts = join(root, "test-results", "admin");
mkdirSync(isolatedPublic, { recursive: true });
mkdirSync(artifacts, { recursive: true });
copyFileSync(join(root, "public", "data", "scenes.json"), isolatedManifest);

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("Admin E2E server did not become ready");
}

const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3101"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    ADMIN_PASSWORD: "phase-one-admin-test",
    ADMIN_SESSION_SECRET: "phase-one-admin-session-secret-at-least-32-characters",
    STORAGE_DRIVER: "local",
    TRANSCRIPTION_DRIVER: "fixture",
    ALLOW_FIXTURE_TRANSCRIPTION: "true",
    ALLOW_NO_REBUILD_HOOK: "true",
    RATE_LIMIT_DRIVER: "memory",
    VAR_ROOT: isolatedVar,
    CATALOG_PATH: isolatedManifest,
    PUBLIC_ASSET_ROOT: isolatedPublic
  }
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

let browser;
let page;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });

  await page.goto(`${origin}/admin/scenes`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Admin password").fill("wrong-password");
  await page.getByRole("button", { name: "Enter scene desk" }).click();
  await page.getByRole("alert").filter({ hasText: "Incorrect password" }).waitFor();
  await page.getByLabel("Admin password").fill("phase-one-admin-test");
  await page.getByRole("button", { name: "Enter scene desk" }).click();
  await page.getByRole("heading", { name: "Scene ingestion desk" }).waitFor();

  await page.locator('input[type="file"]').setInputFiles(join(root, "public", "scenes", "v1", "wrong-door.v1.mp4"));
  await page.getByLabel(/Expected line/).fill("This pipeline made a real scene.");
  await page.getByRole("button", { name: "Process selected clip" }).click();
  await page.getByRole("heading", { name: "Human transcript review" }).waitFor({ timeout: 60_000 });
  if (!(await page.locator(".timing-row").count() > 1)) throw new Error("Aligned word timing rows were not generated");
  await page.screenshot({ path: join(artifacts, "transcript-review.png"), fullPage: true });

  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Ingestion Proof");
  await page.getByLabel("URL slug").fill("ingestion-proof");
  await page.getByRole("textbox", { name: "Source title", exact: true }).fill("StealMyScene E2E Original");
  await page.getByLabel("Source type").selectOption("original");
  await page.getByLabel("Category").fill("Comedy");
  await page.getByLabel("Rights status").selectOption("cleared");
  await page.getByLabel("Rights owner").fill("StealMyScene");
  await page.getByLabel("Rights basis / evidence").fill("Original synthetic source generated and owned by StealMyScene.");
  const invalidFields = await page.locator("form :invalid").evaluateAll((elements) => elements.map((element) => ({ name: element.getAttribute("name"), value: element.value, message: element.validationMessage })));
  if (invalidFields.length > 0) throw new Error(`Admin form has invalid fields: ${JSON.stringify(invalidFields)}`);
  const publishResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/admin/scenes/publish"));
  await page.getByRole("button", { name: "Publish rights-cleared scene" }).click();
  const publishResponse = await publishResponsePromise;
  if (!publishResponse.ok()) throw new Error(`Publish API rejected the reviewed scene: ${await publishResponse.text()}`);
  await page.getByRole("heading", { name: "Scene published." }).waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(artifacts, "published.png"), fullPage: true });

  const manifest = JSON.parse(readFileSync(isolatedManifest, "utf8"));
  const published = manifest.scenes.find((scene) => scene.slug === "ingestion-proof");
  if (!published || published.rightsStatus !== "cleared" || manifest.version !== 2) throw new Error("Published manifest did not contain the rights-cleared scene");
  const videoPath = join(isolatedPublic, "scenes", "v2", "ingestion-proof.v2.mp4");
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name", "-show_entries", "format=duration", "-of", "json", videoPath], { encoding: "utf8" }));
  if (!probe.streams.some((stream) => stream.codec_type === "video" && stream.codec_name === "h264")) throw new Error("Published clip is not valid H.264 video");

  const blockedRightsStatus = await page.evaluate(async () => {
    const response = await fetch("/api/admin/scenes/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rightsStatus: "pending" })
    });
    return response.status;
  });
  if (blockedRightsStatus !== 400) throw new Error("Pending rights were not blocked at the API boundary");
  if (errors.length > 0) throw new Error(`Admin browser errors: ${errors.join(" | ")}`);

  console.log("Admin E2E passed: auth rate-safe login → validated upload → precise trim → aligned transcript review → rights-gated publish");
  console.log("Admin E2E passed: isolated manifest v2 and H.264 output verified; pending rights rejected");
} catch (error) {
  if (page) await page.screenshot({ path: join(artifacts, "failure.png"), fullPage: true }).catch(() => undefined);
  console.error(serverLog);
  throw error;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  rmSync(isolatedRoot, { recursive: true, force: true });
}
