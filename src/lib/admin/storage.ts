import "server-only";
import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  UploadPartCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { objectStorageConfig } from "@/lib/storage/s3";
import { extensionForUpload, type PresignUpload } from "./upload-schema";

const MULTIPART_THRESHOLD = 10 * 1024 * 1024;
const PART_SIZE = 8 * 1024 * 1024;

export function storageDriver() {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

export async function createUploadTarget(input: PresignUpload) {
  const extension = extensionForUpload(input.fileName, input.mimeType);
  const key = `incoming/${randomUUID()}.${extension}`;
  if (storageDriver() === "local") {
    if (input.size > 100 * 1024 * 1024) throw new Error("Local development uploads are limited to 100 MB; use S3/R2 for larger sources");
    return { mode: "local" as const, key, url: `/api/admin/uploads/local?key=${encodeURIComponent(key)}`, headers: { "content-type": input.mimeType } };
  }

  const { bucket, client } = objectStorageConfig();
  if (input.size <= MULTIPART_THRESHOLD) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: input.mimeType,
      ContentLength: input.size,
      Metadata: { "original-name": input.fileName.slice(0, 200), "validation-status": "pending" }
    });
    return { mode: "direct" as const, key, url: await getSignedUrl(client, command, { expiresIn: 10 * 60 }), headers: { "content-type": input.mimeType } };
  }

  const created = await client.send(new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.mimeType,
    Metadata: { "original-name": input.fileName.slice(0, 200), "validation-status": "pending" }
  }));
  if (!created.UploadId) throw new Error("Storage did not return a multipart upload ID");
  const partCount = Math.ceil(input.size / PART_SIZE);
  const parts = await Promise.all(Array.from({ length: partCount }, async (_, index) => ({
    partNumber: index + 1,
    start: index * PART_SIZE,
    end: Math.min(input.size, (index + 1) * PART_SIZE),
    url: await getSignedUrl(client, new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: created.UploadId, PartNumber: index + 1 }), { expiresIn: 30 * 60 })
  })));
  return { mode: "multipart" as const, key, uploadId: created.UploadId, parts };
}

export async function downloadUpload(key: string, targetPath: string) {
  if (storageDriver() === "local") {
    const { localUploadPath } = await import("./local-upload");
    return { path: localUploadPath(key), temporary: false };
  }
  const { bucket, client } = objectStorageConfig();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) throw new Error("Uploaded source was not found");
  const webStream = object.Body.transformToWebStream();
  await pipeline(Readable.fromWeb(webStream as unknown as import("node:stream/web").ReadableStream<Uint8Array>), createWriteStream(targetPath, { flags: "wx" }));
  return { path: targetPath, temporary: true };
}

export async function publishFile(localPath: string, key: string, contentType: string): Promise<string> {
  if (storageDriver() === "local") return `/${key}`;
  const { bucket, client } = objectStorageConfig();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: createReadStream(localPath),
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable"
  }));
  const cdnBaseUrl = process.env.CDN_BASE_URL?.replace(/\/$/, "");
  if (!cdnBaseUrl) throw new Error("CDN_BASE_URL is required when publishing to S3/R2");
  return `${cdnBaseUrl}/${key}`;
}

export async function publishManifest(localPath: string) {
  if (storageDriver() === "local") return;
  const { bucket, client } = objectStorageConfig();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: "data/scenes.json",
    Body: readFileSync(localPath),
    ContentType: "application/json",
    CacheControl: "public, max-age=300, stale-while-revalidate=86400"
  }));
}

export async function completeMultipartUpload(input: { key: string; uploadId: string; parts: { partNumber: number; etag: string }[] }) {
  if (storageDriver() !== "s3") throw new Error("Multipart completion is only available with S3/R2 storage");
  const { bucket, client } = objectStorageConfig();
  await client.send(new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: input.key,
    UploadId: input.uploadId,
    MultipartUpload: { Parts: input.parts.sort((a, b) => a.partNumber - b.partNumber).map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })) }
  }));
  return { key: input.key, validationStatus: "pending" as const };
}
