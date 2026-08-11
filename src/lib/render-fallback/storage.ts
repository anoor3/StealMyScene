import "server-only";
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { objectStorageConfig } from "@/lib/storage/s3";
import { shareTokenMatches } from "@/lib/shares/security";
import { fallbackRecordSchema, type FallbackRecord } from "./schema";

const root = resolve(/* turbopackIgnore: true */ process.env.VAR_ROOT || resolve(process.cwd(), "var"), "render-fallback");
type Asset = "source" | "voice";

function driver() { return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local"; }
function directory(id: string) { return join(root, basename(id)); }
function recordPath(id: string) { return join(directory(id), "record.json"); }
function localAssetPath(record: FallbackRecord, asset: Asset) {
  return join(directory(record.id), basename(asset === "source" ? record.sourceKey : record.voiceKey));
}

async function bodyText(body: unknown): Promise<string> {
  const value = body as { transformToString?: () => Promise<string> };
  if (!value.transformToString) throw new Error("Fallback object body is unavailable");
  return value.transformToString();
}

export async function writeFallbackRecord(record: FallbackRecord, create = false) {
  const parsed = fallbackRecordSchema.parse(record);
  if (driver() === "local") {
    mkdirSync(directory(parsed.id), { recursive: true });
    writeFileSync(recordPath(parsed.id), `${JSON.stringify(parsed)}\n`, { flag: create ? "wx" : "w", mode: 0o600 });
    return;
  }
  const { bucket, client } = objectStorageConfig();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: `render-fallback/${parsed.id}/record.json`, Body: JSON.stringify(parsed), ContentType: "application/json", CacheControl: "no-store", ...(create ? { IfNoneMatch: "*" } : {}) }));
}

export async function readFallbackRecord(id: string) {
  if (driver() === "local") return fallbackRecordSchema.parse(JSON.parse(readFileSync(recordPath(id), "utf8")));
  const { bucket, client } = objectStorageConfig();
  return fallbackRecordSchema.parse(JSON.parse(await bodyText((await client.send(new GetObjectCommand({ Bucket: bucket, Key: `render-fallback/${id}/record.json` }))).Body)));
}

export async function createFallbackUploads(record: FallbackRecord, token: string) {
  await writeFallbackRecord(record, true);
  if (driver() === "local") return {
    source: { url: `/api/render-fallback/${record.id}/upload/source?token=${encodeURIComponent(token)}`, headers: { "content-type": record.sourceType } },
    voice: { url: `/api/render-fallback/${record.id}/upload/voice?token=${encodeURIComponent(token)}`, headers: { "content-type": record.voiceType } }
  };
  const { bucket, client } = objectStorageConfig();
  const sign = (Key: string, ContentType: string, ContentLength: number) => getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key, ContentType, ContentLength, CacheControl: "private, no-store" }), { expiresIn: 15 * 60 });
  return {
    source: { url: await sign(record.sourceKey, record.sourceType, record.sourceBytes), headers: { "content-type": record.sourceType } },
    voice: { url: await sign(record.voiceKey, record.voiceType, record.voiceBytes), headers: { "content-type": record.voiceType } }
  };
}

export async function saveLocalFallbackAsset(id: string, token: string, asset: Asset, body: ReadableStream<Uint8Array>, declaredBytes: number) {
  if (driver() !== "local") throw new Error("Local fallback upload is disabled");
  const record = await readFallbackRecord(id);
  if (!shareTokenMatches(token, record.tokenHash) || record.status !== "pending" || new Date(record.expiresAt).getTime() <= Date.now()) throw new Error("Invalid fallback upload authorization");
  const expected = asset === "source" ? record.sourceBytes : record.voiceBytes;
  if (declaredBytes !== expected) throw new Error("Upload size did not match its declaration");
  let received = 0;
  const stream = Readable.fromWeb(body as unknown as import("node:stream/web").ReadableStream<Uint8Array>);
  stream.on("data", (chunk: Buffer) => { received += chunk.length; if (received > expected) stream.destroy(new Error("Upload exceeded its declaration")); });
  const path = localAssetPath(record, asset);
  try {
    await pipeline(stream, createWriteStream(path, { flags: "wx", mode: 0o600 }));
    if (received !== expected) throw new Error("Upload size did not match its declaration");
  } catch (error) { rmSync(path, { force: true }); throw error; }
}

export async function downloadFallbackInputs(record: FallbackRecord, sourcePath: string, voicePath: string) {
  if (driver() === "local") {
    const source = localAssetPath(record, "source");
    const voice = localAssetPath(record, "voice");
    if (statSync(source).size !== record.sourceBytes || statSync(voice).size !== record.voiceBytes) throw new Error("Fallback inputs are incomplete");
    return { source, voice };
  }
  const { bucket, client } = objectStorageConfig();
  for (const [key, path] of [[record.sourceKey, sourcePath], [record.voiceKey, voicePath]] as const) {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) throw new Error("Fallback input is missing");
    await pipeline(Readable.fromWeb(result.Body.transformToWebStream() as unknown as import("node:stream/web").ReadableStream<Uint8Array>), createWriteStream(path, { flags: "wx" }));
  }
  return { source: sourcePath, voice: voicePath };
}

export async function deleteFallback(record: FallbackRecord) {
  if (driver() === "local") { rmSync(directory(record.id), { recursive: true, force: true }); return; }
  const { bucket, client } = objectStorageConfig();
  await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: [{ Key: record.sourceKey }, { Key: record.voiceKey }, { Key: `render-fallback/${record.id}/record.json` }] } }));
}

export async function cleanupExpiredFallbacks(now = Date.now()) {
  let records: FallbackRecord[] = [];
  if (driver() === "local") {
    mkdirSync(root, { recursive: true });
    records = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((entry) => {
      try { return [fallbackRecordSchema.parse(JSON.parse(readFileSync(recordPath(entry.name), "utf8")))]; } catch { return []; }
    });
  } else {
    const { bucket, client } = objectStorageConfig();
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "render-fallback/", ContinuationToken: continuationToken }));
      keys.push(...(listed.Contents ?? []).flatMap(({ Key }) => Key?.endsWith("/record.json") ? [Key] : []));
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
    records = (await Promise.all(keys.map(async (key) => {
      try {
        return fallbackRecordSchema.parse(JSON.parse(await bodyText((await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).Body)));
      } catch { return undefined; }
    }))).filter((record): record is FallbackRecord => Boolean(record));
  }
  const expired = records.filter((record) => new Date(record.expiresAt).getTime() <= now);
  await Promise.all(expired.map((record) => deleteFallback(record)));
  return { inspected: records.length, expired: expired.length };
}
