// Card Ladder: a shuffled deck is shown one card at a time; recall it in
// order. Each rung shows the cards for less time, from 5 seconds down to 0.2
// seconds.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CARD_LIVES,
  CARD_RUNGS,
  cardDecks,
  dailyCardDecks,
  scoreCardLadder,
} from "./card-ladder.mjs";
import { useDingn, useLocale } from "./dingn";
import { useMemory } from "./memory-state";
import { badges, cardBadges, DAILY } from "./badges";
import { deck } from "./library";

type Phase = "ready" | "memorize" | "recall" | "round" | "done";
type Reward =
  | { kind: "none" }
  | { kind: "saving" }
  | { kind: "paid"; coins: number }
  | { kind: "signed-out" };

const IDS = deck.map((c) => c.id);
const NAMES = Object.fromEntries(deck.map((c) => [c.id, c.name]));
const SUITS = [
  { id: "S", symbol: "♠", red: false },
  { id: "H", symbol: "♥", red: true },
  { id: "D", symbol: "♦", red: true },
  { id: "C", symbol: "♣", red: false },
];
const RANKS = [
  "A",
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
];
const symbol = (id: string) => SUITS.find((s) => s.id === id[0])?.symbol ?? "";
/** A short label such as "Q♥". */
const short = (id: string) => id.slice(1) + symbol(id);
const seconds = (s: number) => (s < 1 ? `${s * 1000} ms` : `${s} s`);

function CardFace({ id, name }: { id: string; name: string }) {
  return (
    <img
      className="playing-card"
      src={`./cards/${id}.png`}
      alt={name}
      width="160"
      height="232"
    />
  );
}

export function CardLadder() {
  const { t } = useLocale();
  const sdk = useDingn();
  const { saved, update } = useMemory();

  const [daily, setDaily] = useState(false);
  const [day, setDay] = useState("");
  const [phase, setPhase] = useState<Phase>("ready");
  const [decks, setDecks] = useState<string[][]>([]);
  const [answers, setAnswers] = useState<string[][]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [shown, setShown] = useState(0);
  const [shareMessage, setShareMessage] = useState("");
  const [reward, setReward] = useState<Reward>({ kind: "none" });
  const lock = useRef(false);
  const result = scoreCardLadder(decks, answers);
  const current = decks[answers.length] ?? [];
  const perCard = result.seconds;

  // Load every card picture once, so a half-second card is never blank.
  useEffect(() => {
    for (const id of IDS) new Image().src = `./cards/${id}.png`;
  }, []);

  function memorize() {
    lock.current = false;
    setPicked([]);
    setShown(0);
    setPhase("memorize");
  }
  function start() {
    const today = new Date().toISOString().slice(0, 10);
    const random = () =>
      crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    setDay(today);
    setDecks(daily ? dailyCardDecks(IDS, today) : cardDecks(IDS, random));
    setAnswers([]);
    setReward({ kind: "none" });
    setShareMessage("");
    memorize();
  }

  // Show the deck one card at a time, then ask for it back.
  useEffect(() => {
    if (phase !== "memorize") return;
    const begin = Date.now();
    const tick = () => {
      const index = Math.floor((Date.now() - begin) / (perCard * 1000));
      if (index >= current.length) setPhase("recall");
      else setShown(index);
    };
    const timer = window.setInterval(tick, 50);
    return () => clearInterval(timer);
    // The deck and the time per card stay fixed for the whole phase.
  }, [phase]);

  function endRound(answer: string[]) {
    if (lock.current) return;
    lock.current = true;
    const next = [...answers, answer];
    setAnswers(next);
    setPhase("round");
    const scored = scoreCardLadder(decks, next);
    if (scored.cleared > saved.cards || scored.bestRun > saved.cardRun)
      void update((s) => ({
        ...s,
        cards: Math.max(s.cards, scored.cleared),
        cardRun: Math.max(s.cardRun, scored.bestRun),
      })).catch(() => {});
    if (scored.over) void finish(scored.cleared, scored.bestRun);
  }
  function pick(id: string) {
    if (phase !== "recall" || lock.current) return;
    const answer = [...picked, id];
    setPicked(answer);
    if (id !== current[answer.length - 1] || answer.length === current.length)
      endRound(answer);
  }

  /** Pays coins for the climb and unlocks the badges it earned. */
  async function finish(cleared: number, run: number) {
    if (!sdk.player.signedIn) {
      setReward({ kind: "signed-out" });
      return;
    }
    setReward({ kind: "saving" });
    // 2 coins a rung cleared, and 1 for each 13 cards in a row.
    const earned = Math.min(10, cleared * 2 + Math.floor(run / 13));
    let coins = 0;
    if (earned > 0)
      try {
        coins = (await sdk.rewards.earn(earned)).coins;
      } catch {}
    setReward({ kind: "paid", coins });
    await badges.unlock(sdk, [
      ...cardBadges(cleared ? CARD_RUNGS[cleared - 1] : 0, run),
      ...(daily ? [DAILY] : []),
    ]);
  }

  const used = useMemo(() => new Set(picked), [picked]);
  const last = result.rounds.at(-1);
  const fastest = result.cleared ? CARD_RUNGS[result.cleared - 1] : 0;
  const savedFastest = saved.cards ? CARD_RUNGS[saved.cards - 1] : 0;
  const shareText = t(
    `Card Ladder${daily ? ` · ${day} UTC` : ""}: ${
      fastest
        ? `a full deck at ${seconds(fastest)} a card`
        : `${result.bestRun} cards in a row`
    }. Can you beat it? https://dingn.com/play/memory/#card-ladder`,
  );
  async function share() {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareMessage("Result copied. Send it to a friend!");
    } catch {
      setShareMessage(shareText);
    }
  }

  return (
    <section
      className={`warmup ladder card-ladder${phase === "ready" || phase === "done" ? "" : " playing"}`}
      aria-label={t("Card Ladder")}
    >
      <div className="warmup-top">
        <span className="eyebrow">{t("CARD LADDER")}</span>
        <span className="live-dot">
          {t(
            sdk.player.signedIn ? "PLAY FOR COINS" : "PLAY WITHOUT SIGNING IN",
          )}
        </span>
      </div>
      <div className="warmup-body">
        <div className="warmup-copy">
          <h2>
            {t("Can you hold")}
            <br />
            {t("a whole deck?")}
          </h2>
          <p>
            {t(
              "A shuffled deck appears one card at a time. Then pick the 52 cards back in the same order. Get the whole deck right and the cards speed up, from 5 seconds each down to a fifth of a second. A wrong card ends the round; three misses end the climb.",
            )}
          </p>
          <p className="ladder-best">
            {t(sdk.player.signedIn ? "Your best:" : "Best on this device:")}{" "}
            {t(
              savedFastest
                ? `a full deck at ${seconds(savedFastest)} a card`
                : saved.cardRun
                  ? `${saved.cardRun} cards in a row`
                  : "Set your first record",
            )}
          </p>
          <ol className="ladder-steps" aria-label={t("Seconds per card")}>
            {CARD_RUNGS.map((s, i) => (
              <li key={s} className={result.cleared > i ? "cleared" : ""}>
                {s < 1 ? `.${String(s).split(".")[1]}` : s}
                <span className="sr-only">
                  {" "}
                  {t("seconds a card")}
                  {t(result.cleared > i ? " cleared" : "")}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="warmup-play">
          {phase === "ready" && (
            <>
              <div
                className="digit-tabs"
                role="group"
                aria-label={t("Challenge type")}
              >
                <button aria-pressed={!daily} onClick={() => setDaily(false)}>
                  {t("Free play")}
                </button>
                <button aria-pressed={daily} onClick={() => setDaily(true)}>
                  {t("Daily challenge")}
                </button>
              </div>
              <p>
                {t(
                  daily
                    ? "The same decks for everyone. Resets at midnight UTC. Replays are welcome."
                    : "A fresh shuffle every round. Build your personal best.",
                )}
              </p>
              <button className="button" onClick={start}>
                {t("Deal the cards →")}
              </button>
            </>
          )}
          {(phase === "memorize" || phase === "recall") && (
            <div className="ladder-hud">
              <span>
                {t(`Round ${answers.length + 1} · ${seconds(perCard)} a card`)}
              </span>
              <span
                className="ladder-lives"
                aria-label={t(`${result.lives} of ${CARD_LIVES} lives left`)}
              >
                {"♥".repeat(result.lives)}
                {"♡".repeat(CARD_LIVES - result.lives)}
              </span>
              <span>
                {phase === "memorize"
                  ? `${shown + 1} / ${current.length}`
                  : `${picked.length} / ${current.length}`}
              </span>
            </div>
          )}
          {phase === "memorize" && current[shown] && (
            <>
              <p role="status">{t("Memorize the order.")}</p>
              <div className="card-stage" aria-live="off">
                <CardFace id={current[shown]} name={t(NAMES[current[shown]])} />
              </div>
              <progress
                className="card-progress"
                max={current.length}
                value={shown + 1}
                aria-label={t("Cards shown")}
              />
            </>
          )}
          {phase === "recall" && (
            <>
              <p role="status">
                {t(`Which card was number ${picked.length + 1}?`)}
              </p>
              <div className="card-trail" aria-label={t("Cards so far")}>
                {picked.slice(-6).map((id, i) => (
                  <span
                    key={`${picked.length}-${i}`}
                    className={`mini-card${"HD".includes(id[0]) ? " red" : ""}`}
                  >
                    {short(id)}
                  </span>
                ))}
              </div>
              <div
                className="card-picker"
                role="group"
                aria-label={t("Pick a card")}
              >
                {SUITS.map((suit) => (
                  <div
                    key={suit.id}
                    className={`card-row${suit.red ? " red" : ""}`}
                  >
                    {RANKS.map((rank) => {
                      const id = suit.id + rank;
                      return (
                        <button
                          key={id}
                          disabled={used.has(id)}
                          aria-label={t(NAMES[id])}
                          onClick={() => pick(id)}
                        >
                          {rank}
                          {suit.symbol}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
          {phase === "round" && last && (
            <>
              <div role="status">
                <h3 className={last.correct ? "win" : ""}>
                  {t(last.correct ? "The whole deck!" : "A miss, not the end.")}
                </h3>
                <p>
                  {t(
                    last.correct
                      ? `All 52 cards at ${seconds(last.seconds)} a card.`
                      : `${last.run} cards in a row. Card ${last.run + 1} was the ${t(NAMES[last.deck[last.run]])}, not the ${t(NAMES[last.answer[last.run]] ?? "")}.`,
                  )}
                </p>
                {!last.correct && last.deck[last.run] && (
                  <div className="card-review">
                    <CardFace
                      id={last.deck[last.run]}
                      name={t(NAMES[last.deck[last.run]])}
                    />
                  </div>
                )}
                <p>
                  {t(
                    !result.over
                      ? last.correct
                        ? `Next up: ${seconds(result.seconds)} a card.`
                        : `Stay at ${seconds(result.seconds)} a card with a new shuffle. Lives left: ${result.lives}.`
                      : result.cleared === CARD_RUNGS.length
                        ? "You cleared every rung!"
                        : "That was your last life. See how you did.",
                  )}
                </p>
              </div>
              <button
                className="button"
                onClick={() => (result.over ? setPhase("done") : memorize())}
              >
                {t(result.over ? "See results →" : "Deal the next deck →")}
              </button>
            </>
          )}
          {phase === "done" && (
            <>
              <h3 className="round-result win">
                {t(
                  result.cleared === CARD_RUNGS.length
                    ? "Top of the ladder!"
                    : "Your climb is complete.",
                )}
              </h3>
              <p>
                {t(
                  fastest
                    ? `Fastest full deck: ${seconds(fastest)} a card · most in a row: ${result.bestRun} cards`
                    : `Most cards in a row: ${result.bestRun}`,
                )}
              </p>
              <p>
                {t(
                  "Try linking each card to a word, then chaining the pictures into a story.",
                )}
              </p>
              {reward.kind === "paid" && reward.coins > 0 && (
                <p className="reward-line">
                  {t(`+${reward.coins} dingn coins`)}
                </p>
              )}
              {reward.kind === "signed-out" && (
                <p className="reward-line">
                  {t("Sign in to earn dingn coins and badges.")}{" "}
                  <button
                    className="link-button"
                    onClick={() => sdk.requestSignIn()}
                  >
                    {t("Sign in")}
                  </button>
                </p>
              )}
              <div className="ladder-actions">
                <button
                  className="button"
                  disabled={reward.kind === "saving"}
                  onClick={start}
                >
                  {t("Play again →")}
                </button>
                <button className="secondary-button" onClick={share}>
                  {t("Share result")}
                </button>
                <button
                  className="text-button"
                  onClick={() => setPhase("ready")}
                >
                  {t("Choose challenge")}
                </button>
              </div>
              <p role="status">{t(shareMessage)}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
