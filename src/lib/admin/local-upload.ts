import "server-only";
import { execFile } from "node:child_process";
import { closeSync, createReadStream, createWriteStream, mkdirSync, openSync, readSync, renameSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const localRoot = resolve(/* turbopackIgnore: true */ process.env.VAR_ROOT || resolve(process.cwd(), "var"));

function safeUploadPath(key: string, directory: "pending" | "uploads" | "quarantine") {
  if (!/^incoming\/[a-f0-9-]{36}\.(mp4|webm|mov)$/.test(key)) throw new Error("Invalid upload key");
  return join(/* turbopackIgnore: true */ localRoot, directory, basename(key));
}

function hasExpectedMagic(path: string) {
  const descriptor = openSync(path, "r");
  const header = Buffer.alloc(12);
  try {
    readSync(descriptor, header, 0, header.length, 0);
  } finally {
    closeSync(descriptor);
  }
  const extension = extname(path);
  if ((extension === ".mp4" || extension === ".mov") && header.subarray(4, 8).toString("ascii") === "ftyp") return true;
  return extension === ".webm" && header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
}

export async function inspectVideo(path: string) {
  if (!hasExpectedMagic(path)) throw new Error("File signature does not match an allowed video container");
  const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], { maxBuffer: 2 * 1024 * 1024 });
  const probe = JSON.parse(stdout);
  const duration = Number(probe.format?.duration);
  const video = probe.streams?.find((stream: { codec_type?: string }) => stream.codec_type === "video");
  if (!video || !Number.isFinite(duration) || duration <= 0 || duration > 20 * 60) throw new Error("Video must contain a valid video stream and be no longer than 20 minutes");
  return { duration, width: Number(video.width), height: Number(video.height), codec: String(video.codec_name ?? "unknown"), bytes: statSync(path).size };
}

export async function saveAndInspectLocalUpload(key: string, body: ReadableStream<Uint8Array>, declaredBytes: number) {
  if (declaredBytes <= 0 || declaredBytes > 100 * 1024 * 1024) throw new Error("Invalid local upload size");
  for (const directory of ["pending", "uploads", "quarantine"]) mkdirSync(join(/* turbopackIgnore: true */ localRoot, directory), { recursive: true });
  const pendingPath = safeUploadPath(key, "pending");
  const acceptedPath = safeUploadPath(key, "uploads");
  const quarantinedPath = safeUploadPath(key, "quarantine");
  let bytes = 0;
  const source = Readable.fromWeb(body as unknown as import("node:stream/web").ReadableStream<Uint8Array>);
  source.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > declaredBytes || bytes > 100 * 1024 * 1024) source.destroy(new Error("Upload exceeded its declared size"));
  });
  await pipeline(source, createWriteStream(pendingPath, { flags: "wx" }));
  if (bytes !== declaredBytes) {
    renameSync(pendingPath, quarantinedPath);
    throw new Error("Upload size did not match its declaration");
  }
  try {
    const media = await inspectVideo(pendingPath);
    renameSync(pendingPath, acceptedPath);
    return { key, path: acceptedPath, validationStatus: "accepted" as const, media };
  } catch (error) {
    renameSync(pendingPath, quarantinedPath);
    throw error;
  }
}

export function localUploadPath(key: string) {
  const path = safeUploadPath(key, "uploads");
  statSync(path);
  return path;
}

export function localUploadStream(key: string) {
  return createReadStream(localUploadPath(key));
}
