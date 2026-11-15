// Memory's dingn badges. They are declared in game.json (dingn checks that
// list and decides what each tier pays); this file says when they are earned.
import type { DingnGame } from "../sdk/dingn-sdk.js";

/** A badge for each of these ladder lengths, named after the digits. */
export const LADDER_MILESTONES = [5, 8, 10, 12, 15, 20];
export const ladderBadge = (digits: number) => `ladder-${digits}`;
export const DAILY = "daily-climb";
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
