import { test } from "node:test";
import assert from "node:assert/strict";
import { merge, parse } from "../src/save";
import { cardBadges, ladderBadges } from "../src/badges";
import {
  CARD_LIVES,
  CARD_RUNGS,
  cardRun,
  dailyCardDecks,
  scoreCardLadder,
} from "../src/card-ladder.mjs";
import { deck, wordShard } from "../src/library";
import { scoreLadder, dailyLadder } from "../src/ladder.mjs";
import game from "../game.json" with { type: "json" };

test("saves are read defensively", () => {
  const none = { best: 0, cards: 0, cardRun: 0, favorites: {} };
  assert.deepEqual(parse(null), none);
  assert.deepEqual(
    parse({ best: 9, favorites: { "07": "sock", x: "bad", "1": "" } }),
    { ...none, best: 9, favorites: { "07": "sock" } },
  );
  assert.deepEqual(parse({ best: 99, cards: 12, cardRun: 53 }), none);
  assert.deepEqual(parse({ cards: 3, cardRun: 52 }), {
    ...none,
    cards: 3,
    cardRun: 52,
  });
});

test("an account save and a device save combine", () => {
  assert.deepEqual(
    merge(
      { best: 5, cards: 2, cardRun: 9, favorites: { "07": "sock" } },
      {
        best: 8,
        cards: 1,
        cardRun: 30,
        favorites: { "07": "sack", "1": "tie" },
      },
    ),
    { best: 8, cards: 2, cardRun: 30, favorites: { "07": "sock", "1": "tie" } },
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

test("card ladder: a whole deck clears a rung, a wrong card costs a life", () => {
  const ids = deck.map((c) => c.id);
  const decks = dailyCardDecks(ids, "2026-11-15");
  assert.equal(decks[0].length, 52);
  assert.deepEqual([...decks[0]].sort(), [...ids].sort());
  assert.notDeepEqual(decks[0], decks[1]);
  assert.deepEqual(dailyCardDecks(ids, "2026-11-15"), decks);
  assert.equal(cardRun(["a", "b", "c"], ["a", "b", "x"]), 2);

  const wrong = (d: string[], at: number) => [...d.slice(0, at), d[at + 1]];
  const climb = scoreCardLadder(decks, [decks[0], wrong(decks[1], 20)]);
  assert.equal(climb.cleared, 1);
  assert.equal(climb.seconds, CARD_RUNGS[1]);
  assert.equal(climb.bestRun, 52);
  assert.equal(climb.lives, CARD_LIVES - 1);
  assert.equal(climb.rounds[1].run, 20);
  assert.equal(climb.over, false);

  const out = scoreCardLadder(decks, [
    [],
    wrong(decks[1], 3),
    wrong(decks[2], 0),
  ]);
  assert.equal(out.over, true);
  assert.equal(out.cleared, 0);
  assert.equal(out.bestRun, 3);
});

test("card ladder badges follow speed and run, and exist in game.json", () => {
  assert.deepEqual(cardBadges(0, 12), []);
  assert.deepEqual(cardBadges(2, 52), [
    "card-5s",
    "card-2s",
    "card-run-13",
    "card-run-26",
  ]);
  const declared = new Set(game.badges.map((b) => b.id));
  for (const id of cardBadges(0.2, 52)) assert.ok(declared.has(id), id);
});
