import { writeFileSync } from "node:fs";

const baseUrl = process.env.CDN_BASE_URL?.replace(/\/$/, "");
if (!baseUrl) {
  console.log("Using repository scene manifest (CDN_BASE_URL is not configured)");
  process.exit(0);
}

const response = await fetch(`${baseUrl}/data/scenes.json`, { cache: "no-store" });
if (!response.ok) throw new Error(`Could not sync scene catalog: CDN returned ${response.status}`);
const manifest = await response.json();
if (!Number.isInteger(manifest.version) || !Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
  throw new Error("Could not sync scene catalog: invalid manifest shape");
}
writeFileSync("public/data/scenes.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Synced scene manifest v${manifest.version} with ${manifest.scenes.length} scenes`);
