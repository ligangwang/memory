// The Major System library: numbers with the words that encode them, and
// words with their sounds, number and definitions. It ships with the game in
// public/data/ (exported once from dingn), so nothing here needs a server.
export type NumberEntry = {
  number: string;
  words: string[];
  /** The word players picked most often, if any. */
  favorite: string | null;
};
export type WordEntry = {
  word: string;
  ipa: string;
  language: string;
  number: string;
  definitions: Record<string, string[]>;
};
type NumberFile = Record<string, { w: string[]; f?: string }>;
type WordFile = Record<
  string,
  [string, string, string, Record<string, string[]>]
>;
type Index = { numbers: number; words: Record<string, number> };

/** The sounds for each digit, 0–9. */
export const soundGuide = [
  "s, z",
  "t, d",
  "n",
  "m",
  "r",
  "l",
  "tʃ, dʒ, ʃ, ʒ",
  "k, ɡ",
  "f, v",
  "p, b",
];

const suits = [
  { id: "C", name: "clubs", number: "7" },
  { id: "D", name: "diamonds", number: "1" },
  { id: "H", name: "hearts", number: "4" },
  { id: "S", name: "spades", number: "0" },
];
const ranks = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
const faces: Record<string, string> = { J: "67", Q: "72", K: "77", A: "0" };
/** A playing card and the number it stands for in the Major System. */
export const deck = suits.flatMap((suit) =>
  ranks.map((rank) => ({
    id: suit.id + rank,
    name: `${rank} of ${suit.name}`,
    number: suit.number + (faces[rank] ?? rank),
  })),
);

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** The file a word is in: its first letter, or "_" for anything else. */
export const wordShard = (word: string) => {
  const first = word[0]?.toLowerCase() ?? "";
  return /^[a-z]$/.test(first) ? first : "_";
};

const cache = new Map<string, Promise<unknown>>();
function load<T>(file: string): Promise<T> {
  let entry = cache.get(file);
  if (!entry) {
    entry = fetch(`./data/${file}`).then((res) => {
      if (!res.ok) throw new Error(`The library couldn’t be loaded.`);
      return res.json();
    });
    // A failed download can be tried again.
    entry.catch(() => cache.delete(file));
    cache.set(file, entry);
  }
  return entry as Promise<T>;
}

const toNumber = (number: string, e: NumberFile[string]): NumberEntry => ({
  number,
  words: e.w,
  favorite: e.f ?? null,
});

/** Every number with `digits` digits, in order ("00", "01", … "99"). */
export async function readNumbers(digits: number) {
  const all = await load<NumberFile>("numbers.json");
  return Object.keys(all)
    .filter((n) => n.length === digits)
    .sort()
    .map((n) => toNumber(n, all[n]));
}
export async function readNumber(number: string) {
  const all = await load<NumberFile>("numbers.json");
  return all[number] ? toNumber(number, all[number]) : null;
}

const toWord = (word: string, e: WordFile[string]): WordEntry => ({
  word,
  ipa: e[0],
  language: e[1],
  number: e[2],
  definitions: e[3],
});
export async function readWord(word: string) {
  const file = await load<WordFile>(`words/${wordShard(word)}.json`);
  const match = file[word]
    ? word
    : file[word.toLowerCase()]
      ? word.toLowerCase()
      : null;
  return match ? toWord(match, file[match]) : null;
}
/** A random word, every word equally likely. */
export async function randomWord(random = Math.random) {
  const { words } = await load<Index>("index.json");
  const total = Object.values(words).reduce((a, b) => a + b, 0);
  if (!total) return null;
  let pick = Math.floor(random() * total);
  for (const [shard, count] of Object.entries(words)) {
    if (pick < count) {
      const file = await load<WordFile>(`words/${shard}.json`);
      const word = Object.keys(file)[pick];
      return word ? toWord(word, file[word]) : null;
    }
    pick -= count;
  }
  return null;
}
