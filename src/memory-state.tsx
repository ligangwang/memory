// The player's saved best and favorites, shared by the ladder and the labs.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDingn } from "./dingn";
import { empty, loadSaved, merge, store, type Saved } from "./save";
import { badges } from "./badges";

type State = {
  saved: Saved;
  /** Changes the save and stores it. Rejects when the account save fails. */
  update: (change: (saved: Saved) => Saved) => Promise<void>;
};
const MemoryContext = createContext<State | null>(null);

export function MemoryProvider({
  initial,
  children,
}: {
  initial?: Saved;
  children: ReactNode;
}) {
  const sdk = useDingn();
  const [saved, setSaved] = useState(initial ?? empty());
  const current = useRef(saved);
  const signedIn = sdk.player.signedIn;
  const first = useRef(true);
  // Signing in brings the account's save; what this device had joins it.
  useEffect(() => {
    if (first.current && initial) {
      first.current = false;
      return;
    }
    first.current = false;
    badges.reset();
    let active = true;
    loadSaved(sdk).then((loaded) => {
      if (!active) return;
      const next = merge(loaded, current.current);
      current.current = next;
      setSaved(next);
      if (signedIn) store(sdk, next).catch(() => {});
    });
    return () => {
      active = false;
    };
  }, [signedIn]);
  const update = useCallback(
    async (change: (saved: Saved) => Saved) => {
      const next = change(current.current);
      current.current = next;
      setSaved(next);
      await store(sdk, next);
    },
    [sdk],
  );
  return (
    <MemoryContext.Provider value={{ saved, update }}>
      {children}
    </MemoryContext.Provider>
  );
}
export function useMemory() {
  const state = useContext(MemoryContext);
  if (!state) throw new Error("MemoryProvider missing");
  return state;
}
