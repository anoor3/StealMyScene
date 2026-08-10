import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectTaggingCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { createWriteStream, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { inspectVideo } from "@/lib/admin/local-upload";

type StorageEvent = {
  Records: Array<{
    s3: {
      bucket: { name: string };
      object: { key: string };
    };
  }>;
};

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || undefined,
  region: process.env.S3_REGION || "auto",
  forcePathStyle: Boolean(process.env.S3_ENDPOINT)
});

async function validateRecord(bucket: string, encodedKey: string) {
  const key = decodeURIComponent(encodedKey.replaceAll("+", " "));
  if (!key.startsWith("incoming/")) return { key, status: "ignored" as const };
  const directory = mkdtempSync(join(tmpdir(), "sms-validation-"));
  const localPath = join(directory, basename(key));
  try {
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!object.Body) throw new Error("Uploaded object has no body");
    await pipeline(
      Readable.fromWeb(object.Body.transformToWebStream() as unknown as import("node:stream/web").ReadableStream<Uint8Array>),
      createWriteStream(localPath, { flags: "wx" })
    );
    const media = await inspectVideo(localPath);
    await client.send(new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: key,
      Tagging: { TagSet: [{ Key: "validation-status", Value: "accepted" }] }
    }));
    return { key, status: "accepted" as const, media };
  } catch (error) {
    const quarantineKey = `quarantine/${basename(key)}`;
    await client.send(new CopyObjectCommand({ Bucket: bucket, Key: quarantineKey, CopySource: `${bucket}/${encodeURIComponent(key)}` }));
    await client.send(new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: quarantineKey,
      Tagging: { TagSet: [{ Key: "validation-status", Value: "rejected" }] }
    }));
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { key, status: "quarantined" as const, reason: error instanceof Error ? error.message : "Unknown validation failure" };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export async function handler(event: StorageEvent) {
  const results = [];
  for (const record of event.Records) {
    results.push(await validateRecord(record.s3.bucket.name, record.s3.object.key));
  }
  return { results };
}
