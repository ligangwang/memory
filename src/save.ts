// What the game remembers: the best climbs and the favorite word for each
// number. Saved on the device (sdk.storage) and, for a signed-in player, to
// their dingn account (sdk.progress), so it follows them between devices.
// Favorites from dingn's old Number and Card labs were moved into the same
// account progress, as {"favorites": {...}}.
import type { DingnGame, Json } from "../sdk/dingn-sdk.js";
import { CARD_RUNGS } from "./card-ladder.mjs";

export type Saved = {
  /** Number Ladder: the most digits recalled. */
  best: number;
  /** Card Ladder: rungs cleared (see CARD_RUNGS), and the most cards in a row. */
  cards: number;
  cardRun: number;
  favorites: Record<string, string>;
};
type Sdk = Pick<DingnGame, "storage" | "progress" | "player">;

const MAX_BEST = 20;
const MAX_CARDS = CARD_RUNGS.length;
const DECK = 52;
export const empty = (): Saved => ({
  best: 0,
  cards: 0,
  cardRun: 0,
  favorites: {},
});
const whole = (value: unknown, max: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : 0;
};

/** Reads a saved value, ignoring anything that isn't the right shape. */
export function parse(value: Json): Saved {
  const saved = empty();
  if (!value || typeof value !== "object" || Array.isArray(value)) return saved;
  saved.best = whole(value.best, MAX_BEST);
  saved.cards = whole(value.cards, MAX_CARDS);
  saved.cardRun = whole(value.cardRun, DECK);
  const favorites = value.favorites;
  if (favorites && typeof favorites === "object" && !Array.isArray(favorites))
    for (const [number, word] of Object.entries(favorites))
      if (/^\d{1,4}$/.test(number) && typeof word === "string" && word.trim())
        saved.favorites[number] = word;
  return saved;
}

/** Combines two saves: the higher bests, and every favorite (`a` wins ties). */
export const merge = (a: Saved, b: Saved): Saved => ({
  best: Math.max(a.best, b.best),
  cards: Math.max(a.cards, b.cards),
  cardRun: Math.max(a.cardRun, b.cardRun),
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
