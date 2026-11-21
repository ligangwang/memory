import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { LANGUAGES, packs, translate } from "../src/i18n";
import game from "../game.json" with { type: "json" };

const zh = packs["zh-CN"];
const placeholders = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort();
const HAN = /\p{Script=Han}/u;

test("every pack translates exactly the Chinese pack's keys, placeholders kept", () => {
  const files = readdirSync(new URL("../src/locales/", import.meta.url))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
  assert.deepEqual(Object.keys(packs).sort(), files);
  for (const [locale, pack] of Object.entries(packs)) {
    assert.deepEqual(Object.keys(pack), Object.keys(zh), locale);
    for (const [key, value] of Object.entries(pack)) {
      assert.ok(value.trim(), `${locale}: "${key}" is empty`);
      assert.deepEqual(placeholders(value), placeholders(key), `${locale}: ${key}`);
    }
  }
});

test("game.json lists every pack plus English, with a title and description in each", () => {
  assert.deepEqual(game.languages, LANGUAGES);
  assert.equal(game.languages[0], "en");
  const field = (locale: string) => (locale === "zh-CN" ? "zh" : locale);
  for (const locale of game.languages) {
    const title = game.title as Record<string, string>;
    const description = game.description as Record<string, string>;
    assert.ok(title[field(locale)]?.trim(), `title.${field(locale)}`);
    assert.ok(description[field(locale)]?.trim(), `description.${field(locale)}`);
    assert.ok(description[field(locale)].length <= 300, `description.${locale}`);
  }
});

test("each language gets its own text, patterns included", () => {
  const shuffle: Record<string, string> = {
    en: "Shuffle",
    "zh-CN": "洗牌",
    es: "Barajar",
    "pt-BR": "Embaralhar",
    id: "Kocok",
    ja: "シャッフル",
    ko: "섞기",
  };
  for (const [locale, text] of Object.entries(shuffle))
    assert.equal(translate("Shuffle", locale), text, locale);
  assert.equal(translate("Round 3 · 5 digits", "es"), "Ronda 3 · 5 dígitos");
  assert.equal(translate("Which card was number 7?", "ja"), "7枚目はどのカード？");
  assert.equal(translate("{0} of clubs", "ko"), "클로버 {0}");
  assert.equal(translate("Q of hearts", "pt-BR"), "Q de copas");
  // A filled-in part that is UI text itself is translated too.
  assert.equal(
    translate(
      "Card Ladder · 2026-11-16 UTC: a full deck at 2 s a card. Can you beat it? https://dingn.com/play/memory/#card-ladder",
      "es",
    ),
    "Card Ladder · 2026-11-16 UTC: una baraja entera a 2 s por carta. ¿Puedes superarlo? https://dingn.com/play/memory/#card-ladder",
  );
});

test("English, unknown languages and unknown text stay English, never Chinese", () => {
  for (const key of Object.keys(zh)) {
    assert.equal(translate(key, "en"), key);
    assert.equal(translate(key, "fr"), key);
    assert.equal(translate(key, "zh-TW"), key);
    for (const locale of ["es", "pt-BR", "id", "ko"])
      assert.ok(!HAN.test(translate(key, locale)), `${locale}: ${key}`);
    for (const locale of LANGUAGES.filter((l) => l !== "zh-CN" && l !== "en"))
      assert.equal(translate(key, locale), packs[locale][key], `${locale}: ${key}`);
  }
  assert.equal(translate("Not a Memory string", "ja"), "Not a Memory string");
  assert.equal(translate("constructor", "es"), "constructor");
  assert.equal(translate("Shuffle", "constructor"), "Shuffle");
});
