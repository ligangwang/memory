// Challenge links: after a climb, "Challenge a friend" asks dingn for a link
// that opens the same climb (the same seed, so the same digits) with the
// score to beat. A friend who opens it gets `sdk.challenge` at start.
import type { Challenge, DingnGame } from "../sdk/dingn-sdk.js";

/** Seeds dingn accepts: a day (2026-11-16) or 1-32 letters, digits, dashes. */
const SEED = /^[A-Za-z0-9-]{1,32}$/;

/** A fresh seed for a free-play climb. */
export function freeSeed() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "f" + Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

export const isDay = (seed: string) => /^\d{4}-\d{2}-\d{2}$/.test(seed);

/** The Number Ladder challenge a friend's link opened, if any. */
export function ladderChallenge(sdk: Pick<DingnGame, "challenge">) {
  const c = sdk.challenge;
  return c &&
    c.mode === "ladder" &&
    c.unit === "digits" &&
    typeof c.seed === "string" &&
    SEED.test(c.seed)
    ? (c as Challenge & { seed: string })
    : null;
}

/**
 * Shares a challenge: the phone's share sheet where there is one, otherwise
 * the clipboard. Returns what happened, for the message under the button.
 */
export async function shareChallenge(
  sdk: Pick<DingnGame, "challengeLink">,
  challenge: Challenge,
  text: string,
  fallback: string,
): Promise<"shared" | "copied" | "cancelled" | { show: string }> {
  let url = "";
  try {
    url = await sdk.challengeLink(challenge);
  } catch {
    // An older dingn website, or opened outside dingn: share the result.
  }
  const message = url ? `${text} ${url}` : fallback;
  if (url && typeof navigator.share === "function")
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return "cancelled";
    }
  try {
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return { show: message };
  }
}
