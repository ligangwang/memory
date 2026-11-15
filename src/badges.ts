// Memory's dingn badges. They are declared in game.json (dingn checks that
// list and decides what each tier pays); this file says when they are earned.
import type { DingnGame } from "../sdk/dingn-sdk.js";

/** A badge for each of these ladder lengths, named after the digits. */
export const LADDER_MILESTONES = [5, 8, 10, 12, 15, 20];
export const ladderBadge = (digits: number) => `ladder-${digits}`;
export const DAILY = "daily-climb";

/** Card Ladder: a badge for clearing the whole deck at these seconds per card. */
export const CARD_SPEEDS: [number, string][] = [
  [5, "card-5s"],
  [2, "card-2s"],
  [1, "card-1s"],
  [0.5, "card-half"],
  [0.2, "card-fifth"],
];
/** …and for recalling this many cards in a row. */
export const CARD_RUNS: [number, string][] = [
  [13, "card-run-13"],
  [26, "card-run-26"],
];
/** The Card Ladder badges for a climb that cleared a deck at `fastest` seconds per card (0 if none) and recalled `run` cards in a row. */
export const cardBadges = (fastest: number, run: number) => [
  ...CARD_SPEEDS.filter(([s]) => fastest > 0 && fastest <= s).map(
    ([, id]) => id,
  ),
  ...CARD_RUNS.filter(([n]) => run >= n).map(([, id]) => id),
];
export const FAVORITE = "first-favorite";
export const FULL_DECK = "full-deck";

/** The ladder badges a climb that reached `best` digits earned. */
export const ladderBadges = (best: number) =>
  LADDER_MILESTONES.filter((m) => m <= best).map(ladderBadge);

type Badged = Pick<DingnGame, "player"> & {
  rewards: Pick<DingnGame["rewards"], "unlock" | "list">;
};

/**
 * Unlocks badges, skipping ones the player already has. dingn shows the
 * popups and pays the coins. Never throws: badges must not get in the way.
 */
export function createBadgeTracker() {
  let earned: Promise<Set<string>> | null = null;
  const known = (sdk: Badged) =>
    (earned ??= sdk.rewards
      .list()
      .then((all) => new Set(all.filter((b) => b.earned).map((b) => b.id)))
      .catch(() => new Set<string>()));
  return {
    reset() {
      earned = null;
    },
    async unlock(sdk: Badged, ids: string[]) {
      if (!sdk.player.signedIn || !ids.length) return [];
      const have = await known(sdk);
      const unlocked: string[] = [];
      for (const id of ids) {
        if (have.has(id)) continue;
        try {
          await sdk.rewards.unlock(id);
          have.add(id);
          unlocked.push(id);
        } catch {}
      }
      return unlocked;
    },
  };
}
export const badges = createBadgeTracker();
