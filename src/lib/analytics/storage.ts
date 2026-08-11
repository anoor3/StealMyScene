import "server-only";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { objectStorageConfig } from "@/lib/storage/s3";
import { analyticsBatchSchema } from "./events";
import { trendingSnapshotSchema, type TrendingSnapshot } from "@/lib/scenes/trending";

type AnalyticsBatch = ReturnType<typeof analyticsBatchSchema.parse>;
const analyticsRoot = resolve(/* turbopackIgnore: true */ process.env.VAR_ROOT || resolve(process.cwd(), "var"), "analytics");
const snapshotKey = "analytics/trending.json";

function driver() {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

async function bodyText(body: unknown): Promise<string> {
  const candidate = body as { transformToString?: () => Promise<string> };
  if (!candidate.transformToString) throw new Error("Analytics object body is unavailable");
  return candidate.transformToString();
}

export async function writeAnalyticsBatch(input: AnalyticsBatch): Promise<void> {
  const batch = analyticsBatchSchema.parse(input);
  const date = new Date(batch.events[0].timestamp).toISOString().slice(0, 10);
  if (driver() === "local") {
    const directory = join(analyticsRoot, "events", date);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `${batch.batchId}.json`), `${JSON.stringify(batch)}\n`, { flag: "wx", mode: 0o600 });
    return;
  }
  const { bucket, client } = objectStorageConfig();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `analytics/events/${date}/${batch.batchId}.json`,
    Body: JSON.stringify(batch),
    ContentType: "application/json",
    CacheControl: "no-store",
    IfNoneMatch: "*"
  }));
}

export async function readAnalyticsBatches(since: number): Promise<AnalyticsBatch[]> {
  if (driver() === "local") {
    const root = join(analyticsRoot, "events");
    try {
      return readdirSync(root, { recursive: true, encoding: "utf8" })
        .filter((name) => name.endsWith(".json"))
        .flatMap((name) => {
          try {
            const batch = analyticsBatchSchema.parse(JSON.parse(readFileSync(join(root, name), "utf8")));
            return batch.events.some((event) => event.timestamp >= since) ? [batch] : [];
          } catch { return []; }
        });
    } catch { return []; }
  }
  const { bucket, client } = objectStorageConfig();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "analytics/events/", ContinuationToken: continuationToken }));
    keys.push(...(result.Contents ?? []).flatMap((object) => object.Key && (!object.LastModified || object.LastModified.getTime() >= since) ? [object.Key] : []));
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return (await Promise.all(keys.map(async (Key) => {
    try {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key }));
      return analyticsBatchSchema.parse(JSON.parse(await bodyText(result.Body)));
    } catch { return undefined; }
  }))).filter((batch): batch is AnalyticsBatch => Boolean(batch));
}

export async function writeTrendingSnapshot(input: TrendingSnapshot): Promise<void> {
  const snapshot = trendingSnapshotSchema.parse(input);
  if (driver() === "local") {
    mkdirSync(analyticsRoot, { recursive: true });
    writeFileSync(join(analyticsRoot, "trending.json"), `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
    return;
  }
  const { bucket, client } = objectStorageConfig();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: snapshotKey, Body: JSON.stringify(snapshot), ContentType: "application/json", CacheControl: "public, max-age=300, stale-while-revalidate=3600" }));
}

export async function readTrendingSnapshot(): Promise<TrendingSnapshot | undefined> {
  try {
    const raw = driver() === "local"
      ? readFileSync(join(analyticsRoot, "trending.json"), "utf8")
      : await (async () => {
          const { bucket, client } = objectStorageConfig();
          return bodyText((await client.send(new GetObjectCommand({ Bucket: bucket, Key: snapshotKey }))).Body);
        })();
    return trendingSnapshotSchema.parse(JSON.parse(await raw));
  } catch {
    return undefined;
  }
}
