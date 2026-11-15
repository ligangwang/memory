// What the game remembers: the best climb and the favorite word for each
// number. Saved on the device (sdk.storage) and, for a signed-in player, to
// their dingn account (sdk.progress), so it follows them between devices.
// Favorites from dingn's old Number and Card labs were moved into the same
// account progress, as {"favorites": {...}}.
import type { DingnGame, Json } from "../sdk/dingn-sdk.js";

export type Saved = { best: number; favorites: Record<string, string> };
type Sdk = Pick<DingnGame, "storage" | "progress" | "player">;

const MAX_BEST = 20;
export const empty = (): Saved => ({ best: 0, favorites: {} });

/** Reads a saved value, ignoring anything that isn't the right shape. */
export function parse(value: Json): Saved {
  const saved = empty();
  if (!value || typeof value !== "object" || Array.isArray(value)) return saved;
  const best = Number(value.best);
  if (Number.isInteger(best) && best >= 0 && best <= MAX_BEST)
    saved.best = best;
  const favorites = value.favorites;
  if (favorites && typeof favorites === "object" && !Array.isArray(favorites))
    for (const [number, word] of Object.entries(favorites))
      if (/^\d{1,4}$/.test(number) && typeof word === "string" && word.trim())
        saved.favorites[number] = word;
  return saved;
}

/** Combines two saves: the higher best, and every favorite (`a` wins ties). */
export const merge = (a: Saved, b: Saved): Saved => ({
  best: Math.max(a.best, b.best),
  favorites: { ...b.favorites, ...a.favorites },
});

const KEY = "memory";
export async function loadSaved(sdk: Sdk): Promise<Saved> {
  let device = empty();
  try {
    device = parse(await sdk.storage.get(KEY));
  } catch {}
  if (!sdk.player.signedIn) return device;
  try {
    return merge(parse(await sdk.progress.load()), device);
  } catch {
    return device;
  }
}
export async function store(sdk: Sdk, saved: Saved) {
  const value = saved as unknown as Json;
  await sdk.storage.set(KEY, value).catch(() => {});
  if (sdk.player.signedIn) await sdk.progress.save(value);
}
