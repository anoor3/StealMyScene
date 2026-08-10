import { afterEach, describe, expect, it } from "vitest";
import { transcribeWithWhisperX } from "./transcription";

describe("transcription adapter", () => {
  afterEach(() => delete process.env.TRANSCRIPTION_DRIVER);

  it("provides ordered timings only in explicit non-production fixture mode", async () => {
    process.env.TRANSCRIPTION_DRIVER = "fixture";
    const result = await transcribeWithWhisperX("unused.wav", "unused", 3, "hello careful world");
    expect(result.engine).toBe("fixture");
    expect(result.wordTimings.map(({ word }) => word)).toEqual(["hello", "careful", "world"]);
    expect(result.wordTimings.at(-1)?.end).toBeLessThanOrEqual(3);
  });
});
