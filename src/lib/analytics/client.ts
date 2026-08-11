import type { AnalyticsEventName } from "./events";

type EventProperties = Record<string, string | number | boolean>;
type PendingEvent = {
  name: AnalyticsEventName;
  timestamp: number;
  sessionId: string;
  properties: EventProperties;
};
type PendingBatch = { batchId: string; events: PendingEvent[] };

const RETRY_KEY = "sms_analytics_retry_v1";
const MAX_RETRY_EVENTS = 90;
const queue: PendingEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let started = false;
let flushing = false;

function sessionId(): string {
  const key = "sms_anonymous_session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

function loadRetries(): PendingBatch[] {
  try {
    return JSON.parse(window.localStorage.getItem(RETRY_KEY) ?? "[]") as PendingBatch[];
  } catch {
    return [];
  }
}

function saveRetries(batches: PendingBatch[]) {
  const limited: PendingBatch[] = [];
  let eventCount = 0;
  for (const batch of batches.toReversed()) {
    if (eventCount + batch.events.length > MAX_RETRY_EVENTS) continue;
    limited.unshift(batch);
    eventCount += batch.events.length;
  }
  try {
    if (limited.length) window.localStorage.setItem(RETRY_KEY, JSON.stringify(limited));
    else window.localStorage.removeItem(RETRY_KEY);
  } catch {
    // Analytics storage pressure must never interrupt the product loop.
  }
}

async function post(batch: PendingBatch): Promise<boolean> {
  try {
    const response = await fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(batch),
      keepalive: true
    });
    return response.ok;
  } catch {
    return false;
  }
}

function sendBeacon(batch: PendingBatch): boolean {
  if (!navigator.sendBeacon) return false;
  return navigator.sendBeacon("/api/analytics", new Blob([JSON.stringify(batch)], { type: "application/json" }));
}

async function drain() {
  if (flushing) return;
  flushing = true;
  try {
    const pending = loadRetries();
    if (queue.length) pending.push({ batchId: crypto.randomUUID(), events: queue.splice(0, 30) });
    const failed: PendingBatch[] = [];
    for (const batch of pending) {
      if (!(await post(batch))) failed.push(batch);
    }
    saveRetries(failed);
  } finally {
    flushing = false;
    if (queue.length) schedule();
  }
}

function schedule() {
  if (!timer) timer = setTimeout(() => void analytics.flush(), 5_000);
}

function flushForPageExit() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  const batches = loadRetries();
  while (queue.length) batches.push({ batchId: crypto.randomUUID(), events: queue.splice(0, 30) });
  const unsent = batches.filter((batch) => !sendBeacon(batch));
  saveRetries(unsent);
}

export const analytics = {
  start() {
    if (typeof window === "undefined" || started) return;
    started = true;
    window.addEventListener("online", () => void this.flush());
    window.addEventListener("pagehide", flushForPageExit);
    if (loadRetries().length) schedule();
  },
  track(name: AnalyticsEventName, properties: EventProperties = {}) {
    if (typeof window === "undefined") return;
    const privacyControl = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    if (privacyControl) return;
    queue.push({ name, timestamp: Date.now(), sessionId: sessionId(), properties });
    if (queue.length >= 10) void this.flush();
    else schedule();
  },
  async flush() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    await drain();
  }
};
