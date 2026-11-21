// Memory's language packs: one per language besides English, each mapping the
// English text to its translation. The same rules as the website's
// translations: exact strings first, then patterns such as "Level {0}",
// longest literal text first.
import zhCN from "./locales/zh-CN.json";
import es from "./locales/es.json";
import ptBR from "./locales/pt-BR.json";
import id from "./locales/id.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import type { Locale } from "../sdk/dingn-sdk.js";

type Pack = Record<string, string>;
export const packs: Record<string, Pack> = {
  "zh-CN": zhCN,
  es,
  "pt-BR": ptBR,
  id,
  ja,
  ko,
};
/** Every language Memory speaks, English first (as game.json lists them). */
export const LANGUAGES = ["en", ...Object.keys(packs)];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
type Pattern = { re: RegExp; value: string };
const compiled = new Map<string, Pattern[]>();
function patternsOf(locale: string, pack: Pack) {
  let list = compiled.get(locale);
  if (!list) {
    list = Object.entries(pack)
      .filter(([key]) => /\{\d+\}/.test(key))
      .sort(
        ([a], [b]) =>
          b.replace(/\{\d+\}/g, "").length - a.replace(/\{\d+\}/g, "").length,
      )
      .map(([key, value]) => ({
        re: new RegExp(
          "^" +
            key
              .split(/\{\d+\}/)
              .map(escape)
              .join("(.*?)") +
            "$",
        ),
        value,
      }));
    compiled.set(locale, list);
  }
  return list;
}

/**
 * `text` in `locale`. English, a language Memory has no pack for, or text a
 * pack lacks all give the English text back: never another language's.
 */
export function translate(text: string, locale: Locale): string {
  const pack = Object.hasOwn(packs, locale) ? packs[locale] : undefined;
  if (!pack || !text) return text;
  const key = text.replace(/\s+/g, " ").trim();
  if (Object.hasOwn(pack, key)) return pack[key];
  for (const { re, value } of patternsOf(locale, pack)) {
    const match = key.match(re);
    if (match)
      return value.replace(/\{(\d+)\}/g, (_, n) =>
        // A filled-in part can be UI text too ("a full deck at 1 s a card").
        translate(match[Number(n) + 1] ?? "", locale),
      );
  }
  return text;
}
