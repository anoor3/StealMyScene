import "server-only";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { objectStorageConfig } from "@/lib/storage/s3";
import { shareIdSchema, shareIsExpired, shareRecordSchema, type ShareRecord } from "./schema";
import { shareTokenMatches } from "./security";

const shareRoot = resolve(/* turbopackIgnore: true */ process.env.VAR_ROOT || resolve(process.cwd(), "var"), "shares");

export function shareStorageDriver() {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

function localDirectory(id: string) {
  shareIdSchema.parse(id);
  return join(/* turbopackIgnore: true */ shareRoot, basename(id));
}

function localRecordPath(id: string) {
  return join(localDirectory(id), "record.json");
}

export function localShareMediaPath(id: string) {
  const path = join(localDirectory(id), "output.mp4");
  statSync(path);
  return path;
}

async function bodyToText(body: unknown): Promise<string> {
  const candidate = body as { transformToString?: () => Promise<string> };
  if (!candidate.transformToString) throw new Error("Storage record body is unavailable");
  return candidate.transformToString();
}

export async function writeShareRecord(record: ShareRecord, create = false): Promise<void> {
  const parsed = shareRecordSchema.parse(record);
  if (shareStorageDriver() === "local") {
    const directory = localDirectory(parsed.id);
    mkdirSync(directory, { recursive: true });
    const target = localRecordPath(parsed.id);
    if (create) {
      writeFileSync(target, `${JSON.stringify(parsed, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      return;
    }
    const temporary = join(directory, `record-${process.pid}.tmp`);
    writeFileSync(temporary, `${JSON.stringify(parsed, null, 2)}\n`, { flag: "w", mode: 0o600 });
    renameSync(temporary, target);
    return;
  }
  const { bucket, client } = objectStorageConfig();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `shares/${parsed.id}/record.json`,
    Body: JSON.stringify(parsed),
    ContentType: "application/json",
    CacheControl: "no-store"
  }));
}

export async function readShareRecord(id: string): Promise<ShareRecord> {
  shareIdSchema.parse(id);
  if (shareStorageDriver() === "local") return shareRecordSchema.parse(JSON.parse(readFileSync(localRecordPath(id), "utf8")));
  const { bucket, client } = objectStorageConfig();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `shares/${id}/record.json` }));
  return shareRecordSchema.parse(JSON.parse(await bodyToText(result.Body)));
}

export async function createShareUpload(record: ShareRecord, token: string) {
  await writeShareRecord(record, true);
  if (shareStorageDriver() === "local") {
    return { uploadUrl: `/api/share-links/${record.id}/upload?token=${encodeURIComponent(token)}`, headers: { "content-type": record.contentType } };
  }
  const { bucket, client } = objectStorageConfig();
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
    Bucket: bucket,
    Key: record.mediaKey,
    ContentType: record.contentType,
    ContentLength: record.bytes,
    CacheControl: "private, no-store"
  }), { expiresIn: 15 * 60 });
  return { uploadUrl, headers: { "content-type": record.contentType } };
}

export async function saveLocalShareUpload(id: string, token: string, body: ReadableStream<Uint8Array>, declaredBytes: number) {
  if (shareStorageDriver() !== "local") throw new Error("Local share upload is disabled");
  const record = await readShareRecord(id);
  if (record.status !== "pending_upload" || !shareTokenMatches(token, record.tokenHash)) throw new Error("Invalid or expired upload authorization");
  if (shareIsExpired(record)) throw new Error("Upload authorization expired");
  if (declaredBytes !== record.bytes) throw new Error("Upload size did not match its declaration");
  const path = join(localDirectory(id), "output.mp4");
  let received = 0;
  const source = Readable.fromWeb(body as unknown as import("node:stream/web").ReadableStream<Uint8Array>);
  source.on("data", (chunk: Buffer) => {
    received += chunk.length;
    if (received > record.bytes) source.destroy(new Error("Upload exceeded its declared size"));
  });
  try {
    await pipeline(source, createWriteStream(path, { flags: "wx", mode: 0o600 }));
    if (received !== record.bytes) throw new Error("Upload size did not match its declaration");
  } catch (error) {
    rmSync(path, { force: true });
    throw error;
  }
}

export async function downloadShareMedia(record: ShareRecord, targetPath: string): Promise<{ path: string; temporary: boolean }> {
  if (shareStorageDriver() === "local") return { path: localShareMediaPath(record.id), temporary: false };
  const { bucket, client } = objectStorageConfig();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: record.mediaKey }));
  if (!result.Body) throw new Error("Uploaded share media was not found");
  await pipeline(Readable.fromWeb(result.Body.transformToWebStream() as unknown as import("node:stream/web").ReadableStream<Uint8Array>), createWriteStream(targetPath, { flags: "wx" }));
  return { path: targetPath, temporary: true };
}

export async function shareMediaUrl(record: ShareRecord): Promise<string> {
  if (shareStorageDriver() === "local") return `/api/share-links/${record.id}/media`;
  const { bucket, client } = objectStorageConfig();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: record.mediaKey, ResponseContentType: "video/mp4" }), { expiresIn: 15 * 60 });
}

export async function deleteShareMedia(record: ShareRecord): Promise<void> {
  if (shareStorageDriver() === "local") {
    rmSync(join(localDirectory(record.id), "output.mp4"), { force: true });
    return;
  }
  const { bucket, client } = objectStorageConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: record.mediaKey }));
}

export async function expireShare(record: ShareRecord): Promise<ShareRecord> {
  await deleteShareMedia(record);
  const expired = { ...record, status: "expired" as const, errorMessage: undefined };
  await writeShareRecord(expired);
  return expired;
}

export async function enforceShareExpiry(record: ShareRecord, now = Date.now()): Promise<ShareRecord> {
  return shareIsExpired(record, now) && record.status !== "expired" ? expireShare(record) : record;
}

export async function cleanupExpiredShares(now = Date.now()): Promise<{ inspected: number; expired: number }> {
  let records: ShareRecord[] = [];
  if (shareStorageDriver() === "local") {
    mkdirSync(shareRoot, { recursive: true });
    records = readdirSync(shareRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        try { return [shareRecordSchema.parse(JSON.parse(readFileSync(localRecordPath(entry.name), "utf8")))]; } catch { return []; }
      });
  } else {
    const { bucket, client } = objectStorageConfig();
    const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "shares/" }));
    const ids = [...new Set((listed.Contents ?? []).flatMap(({ Key }) => Key?.endsWith("/record.json") ? [Key.split("/")[1]] : []))];
    records = (await Promise.all(ids.map(async (id) => {
      try { return await readShareRecord(id); } catch { return undefined; }
    }))).filter((record): record is ShareRecord => Boolean(record));
  }
  let expired = 0;
  for (const record of records) {
    if (record.status !== "expired" && shareIsExpired(record, now)) {
      await expireShare(record);
      expired += 1;
    }
  }
  return { inspected: records.length, expired };
}
