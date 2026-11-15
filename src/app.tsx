// Memory: the ladder and the three Major System labs, behind one row of tabs.
import { useEffect, useState } from "react";
import { useDingn, useLocale } from "./dingn";
import { Ladder } from "./ladder-game";
import { Practice, type Mode } from "./practice";

type Tab = "ladder" | Mode;
const TABS: [Tab, string][] = [
  ["ladder", "Memory Ladder"],
  ["number", "Numbers"],
  ["word", "Words"],
  ["card", "Cards"],
];
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
      <nav className="memory-tabs digit-tabs" aria-label={t("Memory games")}>
        {TABS.map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </nav>
      {tab === "ladder" ? <Ladder /> : <Practice key={tab} mode={tab} />}
    </div>
  );
}
export { isTab, type Tab };
