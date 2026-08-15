import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync } from "node:fs";
import { get } from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicDomainSources } from "./public-domain-sources.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = process.env.PUBLIC_DOMAIN_SOURCE_DIR || join(root, "var", "public-domain-sources");

function checksum(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function isValid(path, source) {
  return existsSync(path) && statSync(path).size === source.bytes && checksum(path) === source.sha256;
}

function download(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = get(url, { headers: { "User-Agent": "StealMyScene catalog builder/1.0" } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects >= 5) return reject(new Error(`Too many redirects for ${url}`));
        return resolve(download(new URL(response.headers.location, url).toString(), destination, redirects + 1));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Download failed with HTTP ${response.statusCode} for ${url}`));
      }
      const stream = createWriteStream(destination);
      response.pipe(stream);
      stream.on("finish", () => stream.close(resolve));
      stream.on("error", reject);
    });
    request.on("error", reject);
  });
}

mkdirSync(sourceDir, { recursive: true });

for (const source of publicDomainSources) {
  const destination = join(sourceDir, source.fileName);
  if (isValid(destination, source)) {
    console.log(`Verified ${source.fileName}`);
    continue;
  }

  const partial = `${destination}.partial`;
  if (existsSync(partial)) unlinkSync(partial);
  console.log(`Downloading ${source.title}`);
  await download(source.downloadUrl, partial);
  if (!isValid(partial, source)) {
    unlinkSync(partial);
    throw new Error(`Checksum or size verification failed for ${source.title}`);
  }
  renameSync(partial, destination);
}

console.log(`Verified ${publicDomainSources.length} public-domain masters in ${sourceDir}`);
