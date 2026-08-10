export type StudioStatus =
  | "ready"
  | "requesting_permission"
  | "countdown"
  | "recording"
  | "recorded"
  | "processing"
  | "finished"
  | "permission_denied"
  | "error";

export type StudioState = {
  status: StudioStatus;
  countdown: number;
  elapsed: number;
  renderProgress: number;
  message?: string;
};

export type StudioAction =
  | { type: "REQUEST_PERMISSION" }
  | { type: "COUNTDOWN"; value: number }
  | { type: "START_RECORDING" }
  | { type: "TICK"; elapsed: number }
  | { type: "RECORDING_READY" }
  | { type: "PROCESS" }
  | { type: "PROGRESS"; value: number }
  | { type: "FINISH" }
  | { type: "PERMISSION_DENIED" }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

export const initialStudioState: StudioState = {
  status: "ready",
  countdown: 3,
  elapsed: 0,
  renderProgress: 0
};

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "REQUEST_PERMISSION":
      return { ...initialStudioState, status: "requesting_permission" };
    case "COUNTDOWN":
      return { ...state, status: "countdown", countdown: action.value };
    case "START_RECORDING":
      return { ...state, status: "recording", elapsed: 0 };
    case "TICK":
      return state.status === "recording" ? { ...state, elapsed: action.elapsed } : state;
    case "RECORDING_READY":
      return { ...state, status: "recorded" };
    case "PROCESS":
      return { ...state, status: "processing", renderProgress: 0, message: undefined };
    case "PROGRESS":
      return state.status === "processing" ? { ...state, renderProgress: Math.max(0, Math.min(1, action.value)) } : state;
    case "FINISH":
      return { ...state, status: "finished", renderProgress: 1 };
    case "PERMISSION_DENIED":
      return { ...initialStudioState, status: "permission_denied" };
    case "FAIL":
      return { ...state, status: "error", message: action.message };
    case "RESET":
      return initialStudioState;
  }
}
