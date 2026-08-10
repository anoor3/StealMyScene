export type ByteRange = { start: number; end: number };

export function parseByteRange(header: string | null, size: number): ByteRange | undefined {
  if (!header) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size <= 0) throw new RangeError("Invalid byte range");

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) throw new RangeError("Invalid byte range");

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) throw new RangeError("Invalid byte range");
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) {
    throw new RangeError("Unsatisfiable byte range");
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}
