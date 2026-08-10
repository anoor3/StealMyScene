import { describe, expect, it } from "vitest";
import { initialStudioState, studioReducer } from "./state";

describe("studio state machine", () => {
  it("moves through the successful recording and render path", () => {
    let state = studioReducer(initialStudioState, { type: "REQUEST_PERMISSION" });
    state = studioReducer(state, { type: "COUNTDOWN", value: 2 });
    state = studioReducer(state, { type: "START_RECORDING" });
    state = studioReducer(state, { type: "TICK", elapsed: 1.4 });
    state = studioReducer(state, { type: "RECORDING_READY" });
    state = studioReducer(state, { type: "PROCESS" });
    state = studioReducer(state, { type: "PROGRESS", value: 4 });
    state = studioReducer(state, { type: "FINISH" });
    expect(state).toMatchObject({ status: "finished", elapsed: 1.4, renderProgress: 1 });
  });

  it("tracks denial, errors, and a clean reset", () => {
    expect(studioReducer(initialStudioState, { type: "PERMISSION_DENIED" }).status).toBe("permission_denied");
    const failed = studioReducer(initialStudioState, { type: "FAIL", message: "No microphone" });
    expect(failed).toMatchObject({ status: "error", message: "No microphone" });
    expect(studioReducer(failed, { type: "RESET" })).toEqual(initialStudioState);
  });

  it("ignores ticks and progress outside their valid states", () => {
    expect(studioReducer(initialStudioState, { type: "TICK", elapsed: 2 })).toEqual(initialStudioState);
    expect(studioReducer(initialStudioState, { type: "PROGRESS", value: 0.5 })).toEqual(initialStudioState);
  });
});
