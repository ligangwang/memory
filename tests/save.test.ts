import { test } from "node:test";
import assert from "node:assert/strict";
import { merge, parse } from "../src/save";
import { ladderBadges } from "../src/badges";
import { deck, wordShard } from "../src/library";
import { scoreLadder, dailyLadder } from "../src/ladder.mjs";
import game from "../game.json" with { type: "json" };

test("saves are read defensively", () => {
  assert.deepEqual(parse(null), { best: 0, favorites: {} });
  assert.deepEqual(
    parse({ best: 9, favorites: { "07": "sock", x: "bad", "1": "" } }),
    { best: 9, favorites: { "07": "sock" } },
  );
  assert.deepEqual(parse({ best: 99 }), { best: 0, favorites: {} });
});

test("an account save and a device save combine", () => {
  assert.deepEqual(
    merge(
      { best: 5, favorites: { "07": "sock" } },
      { best: 8, favorites: { "07": "sack", "1": "tie" } },
    ),
    { best: 8, favorites: { "07": "sock", "1": "tie" } },
  );
});

test("ladder badges follow the digits reached and exist in game.json", () => {
  assert.deepEqual(ladderBadges(4), []);
  assert.deepEqual(ladderBadges(10), ["ladder-5", "ladder-8", "ladder-10"]);
  const ids = new Set(game.badges.map((b) => b.id));
  for (const id of [
    ...ladderBadges(20),
    "daily-climb",
    "first-favorite",
    "full-deck",
  ])
    assert.ok(ids.has(id), id);
});

test("the daily ladder is the same for everyone and scores like before", () => {
  assert.deepEqual(dailyLadder("2026-11-15"), dailyLadder("2026-11-15"));
  const seq = dailyLadder("2026-11-15");
  const climb = scoreLadder(seq, [seq[0].slice(0, 3), "000", "111", "222"]);
  assert.equal(climb.best, 3);
  assert.equal(climb.over, true);
});

test("the deck has 52 cards and words file by first letter", () => {
  assert.equal(deck.length, 52);
  assert.equal(deck.find((c) => c.id === "SA")?.number, "00");
  assert.equal(wordShard("Sock"), "s");
  assert.equal(wordShard("1st"), "_");
});
