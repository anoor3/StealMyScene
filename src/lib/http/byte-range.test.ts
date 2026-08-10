import { describe, expect, it } from "vitest";
import { parseByteRange } from "./byte-range";

describe("parseByteRange", () => {
  it("parses bounded, open-ended, and suffix ranges", () => {
    expect(parseByteRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 });
    expect(parseByteRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseByteRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
  });

  it("clamps the end and rejects invalid or unsatisfiable ranges", () => {
    expect(parseByteRange("bytes=90-200", 100)).toEqual({ start: 90, end: 99 });
    expect(() => parseByteRange("bytes=100-101", 100)).toThrow(RangeError);
    expect(() => parseByteRange("bytes=20-10", 100)).toThrow(RangeError);
    expect(() => parseByteRange("items=0-10", 100)).toThrow(RangeError);
  });
});
