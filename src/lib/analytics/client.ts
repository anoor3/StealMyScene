import type { AnalyticsEventName } from "./events";

type EventProperties = Record<string, string | number | boolean>;
type PendingEvent = {
  name: AnalyticsEventName;
  timestamp: number;
  sessionId: string;
  properties: EventProperties;
};

const queue: PendingEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function sessionId(): string {
  const key = "sms_anonymous_session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

async function send(events: PendingEvent[]) {
  const body = JSON.stringify({ events });
  if (navigator.sendBeacon) {
    const accepted = navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    if (accepted) return;
  }
  await fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true
  }).catch(() => undefined);
}

export const analytics = {
  track(name: AnalyticsEventName, properties: EventProperties = {}) {
    if (typeof window === "undefined") return;
    const privacyControl = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    if (privacyControl) return;
    queue.push({ name, timestamp: Date.now(), sessionId: sessionId(), properties });
    if (queue.length >= 10) void this.flush();
    else if (!timer) timer = setTimeout(() => void this.flush(), 5_000);
  },
  async flush() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (queue.length === 0) return;
    await send(queue.splice(0, 30));
  }
};
