// Memory: the ladder and the three Major System labs, behind one row of tabs.
import { useEffect, useState } from "react";
import { useDingn, useLocale } from "./dingn";
import { Ladder } from "./ladder-game";
import { CardLadder } from "./card-ladder-game";
import { Practice, type Mode } from "./practice";

type Tab = "ladder" | "card-ladder" | Mode;
// The two ladders are the games you play for a score; the three labs are
// practice for the Major System, with no score.
const PLAY: [Tab, string][] = [
  ["ladder", "Number Ladder"],
  ["card-ladder", "Card Ladder"],
];
const PRACTICE: [Tab, string][] = [
  ["number", "Numbers"],
  ["word", "Words"],
  ["card", "Cards"],
];
const TABS = [...PLAY, ...PRACTICE];
const isTab = (v: unknown): v is Tab => TABS.some(([id]) => id === v);
/** A tab named in the address (#number), as dingn's old links to each lab. */
const fromHash = () => {
  const hash = location.hash.slice(1);
  return isTab(hash) ? hash : null;
};

export function MemoryApp({ initialTab }: { initialTab?: Tab }) {
  const { t } = useLocale();
  const { storage } = useDingn();
  const [tab, setTab] = useState<Tab>(initialTab ?? fromHash() ?? "ladder");
  useEffect(() => {
    storage.set("tab", tab).catch(() => {});
  }, [tab]);
  return (
    <div className="memory-app container mind-page">
      <nav className="memory-tabs" aria-label={t("Memory games")}>
        {(
          [
            ["Play", "For a score, coins and badges", PLAY],
            ["Practice", "Learn the Major System, no score", PRACTICE],
          ] as const
        ).map(([group, hint, tabs]) => (
          <div
            key={group}
            className={`tab-group tab-group-${group.toLowerCase()}`}
            role="group"
            aria-label={t(group)}
          >
            <p className="tab-group-label">
              <strong>{t(group)}</strong> <span>{t(hint)}</span>
            </p>
            <div className="digit-tabs">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  onClick={() => setTab(id)}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {tab === "ladder" ? (
        <Ladder />
      ) : tab === "card-ladder" ? (
        <CardLadder />
      ) : (
        <Practice key={tab} mode={tab} />
      )}
    </div>
  );
}
export { isTab, type Tab };
