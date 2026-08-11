import "server-only";

const defaultBlockedPhrases = ["kill yourself", "bomb threat", "racial slur"];

export function moderateShareTranscript(transcript: string, configuredTerms = process.env.SHARE_BLOCKED_TERMS): { allowed: boolean; reason?: string } {
  const normalized = transcript.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const phrases = [...defaultBlockedPhrases, ...(configuredTerms?.split(",") ?? [])]
    .map((phrase) => phrase.toLowerCase().trim())
    .filter(Boolean);
  const match = phrases.find((phrase) => normalized.includes(phrase.replace(/[^a-z0-9]+/g, " ").trim()));
  return match ? { allowed: false, reason: "The recording did not pass the temporary-link safety check." } : { allowed: true };
}
