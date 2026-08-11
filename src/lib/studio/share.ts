export type ShareNavigator = Pick<Navigator, "share" | "canShare">;

export function createDubFile(output: Blob, filename: string): File | undefined {
  if (typeof File === "undefined") return undefined;
  return new File([output], filename, { type: "video/mp4", lastModified: Date.now() });
}

export function canShareDubFile(file: File | undefined, shareNavigator?: Partial<ShareNavigator>): boolean {
  const target = shareNavigator ?? (typeof navigator === "undefined" ? {} : navigator);
  if (!file || typeof target.share !== "function" || typeof target.canShare !== "function") return false;
  try {
    return target.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareDubFile(
  file: File,
  title: string,
  shareNavigator?: Partial<ShareNavigator>
): Promise<"shared" | "cancelled"> {
  const target = shareNavigator ?? (typeof navigator === "undefined" ? {} : navigator);
  if (!canShareDubFile(file, target)) throw new Error("File sharing is not supported in this browser.");
  try {
    await target.share!({ files: [file], title, text: "I stole this scene with StealMyScene." });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    throw new Error("The share sheet could not open. Download the MP4 instead.", { cause: error });
  }
}
