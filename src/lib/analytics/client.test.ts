// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("analytics client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not place a network request on the event call path", async () => {
    const { analytics } = await import("./client");
    analytics.track("record_start", { sceneId: "scene_001" });
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("persists a failed batch and retries it later with the same id", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(new Response(null, { status: 202 }));
    const { analytics } = await import("./client");
    analytics.track("share", { sceneId: "scene_001" });
    await analytics.flush();
    const failed = JSON.parse(localStorage.getItem("sms_analytics_retry_v1") ?? "[]");
    expect(failed).toHaveLength(1);
    const batchId = failed[0].batchId;
    await analytics.flush();
    expect(JSON.parse(localStorage.getItem("sms_analytics_retry_v1") ?? "[]")).toEqual([]);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string).batchId).toBe(batchId);
  });
});
