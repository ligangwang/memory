// Number Ladder: remember a growing sequence of digits, from 3 up to 20.
import { useEffect, useRef, useState } from "react";
import {
  LADDER_LIVES,
  LADDER_MAX,
  scoreLadder,
  seededLadder,
} from "./ladder.mjs";
import { useDingn, useLocale } from "./dingn";
import { useMemory } from "./memory-state";
import { badges, DAILY, ladderBadges } from "./badges";
import { freeSeed, isDay, ladderChallenge, shareChallenge } from "./challenge";
type Phase = "ready" | "memorize" | "recall" | "round" | "done";
type Reward =
  | { kind: "none" }
  | { kind: "saving" }
  | { kind: "paid"; coins: number }
  | { kind: "signed-out" };
/** Rungs marked on the ladder beside the game. */
const MILESTONES = [3, 5, 8, 10, 12, 15, LADDER_MAX];
/** Seconds to type the answer: longer sequences get longer. */
const recallSeconds = (length: number) => Math.max(15, Math.ceil(length * 1.5));
export function Ladder() {
  const { t } = useLocale();
  const sdk = useDingn();
  const { saved, update } = useMemory();
  const best = saved.best;

  const [daily, setDaily] = useState(false);
  const [day, setDay] = useState("");
  // A friend's challenge from the link that opened the game: the same climb,
  // and their score to beat.
  const [challenge, setChallenge] = useState(() => ladderChallenge(sdk));
  // The climb's seed, so "Challenge a friend" can replay the same digits.
  const [seed, setSeed] = useState("");
  const [phase, setPhase] = useState<Phase>("ready");
  const [sequences, setSequences] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [starting, setStarting] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const deadline = useRef(0);
  const [reward, setReward] = useState<Reward>({ kind: "none" });
  const result = scoreLadder(sequences, answers);
  const length = result.length;
  const sequence = sequences[answers.length]?.slice(0, length) ?? "";
  function memorize() {
    lock.current = false;
    setAnswer("");
    setPhase("memorize");
  }
  async function start() {
    if (starting) return;
    setStarting(true);
    const today = new Date().toISOString().slice(0, 10);
    const next = challenge ? challenge.seed : daily ? today : freeSeed();
    setSeed(next);
    setDay(isDay(next) ? next : "");
    setSequences(seededLadder(next));
    setReward({ kind: "none" });
    setAnswers([]);
    setShareMessage("");
    setStarting(false);
    memorize();
  }
  function finishRound(value: string) {
    if (lock.current) return;
    lock.current = true;
    const next = [...answers, value];
    setAnswers(next);
    setPhase("round");
    const scored = scoreLadder(sequences, next);
    if (scored.best > best)
      void update((s) => ({ ...s, best: Math.max(s.best, scored.best) })).catch(
        () => {},
      );
    if (scored.over) void finish(scored.score, scored.best);
  }
  /** Pays coins for the climb and unlocks the badges it earned. */
  async function finish(score: number, reached: number) {
    sdk.roundEnded?.();
    if (!sdk.player.signedIn) {
      setReward({ kind: "signed-out" });
      return;
    }
    setReward({ kind: "saving" });
    let coins = 0;
    if (score > 0)
      try {
        coins = (await sdk.rewards.earn(Math.min(10, score))).coins;
      } catch {}
    setReward({ kind: "paid", coins });
    await badges.unlock(sdk, [
      ...ladderBadges(reached),
      ...(daily || (challenge && challenge.seed === day) ? [DAILY] : []),
    ]);
  }
  useEffect(() => {
    if (phase !== "memorize" && phase !== "recall") return;
    const seconds = phase === "memorize" ? length : recallSeconds(length);
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(left);
      if (!left) {
        if (phase === "memorize") setPhase("recall");
        else finishRound(input.current?.value ?? "");
      }
    };
    const timer = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
    // Round state stays fixed throughout each timed phase; typing must not restart the clock.
  }, [phase]);
  useEffect(() => {
    if (phase === "recall") input.current?.focus();
  }, [phase]);
  const last = result.rounds.at(-1);
  const shareText = t(
    `Number Ladder${day ? ` · ${day} UTC` : ""}: ${result.best} digits recalled. Can you beat it? https://dingn.com/play/memory/`,
  );
  const beat = challenge ? result.best - challenge.score : 0;
  async function share() {
    const outcome = await shareChallenge(
      sdk,
      { mode: "ladder", seed, score: result.best, unit: "digits" },
      t(
        day
          ? `I recalled ${result.best} digits on the ${day} Number Ladder. Can you beat me?`
          : `I recalled ${result.best} digits on Number Ladder. Can you beat me?`,
      ),
      shareText,
    );
    setShareMessage(
      outcome === "copied"
        ? "Challenge link copied. Send it to a friend!"
        : outcome === "shared"
          ? "Challenge sent!"
          : outcome === "cancelled"
            ? ""
            : outcome.show,
    );
  }
  return (
    <section className="warmup ladder" aria-label={t("Number Ladder")}>
      <div className="warmup-top">
        <span className="eyebrow">{t("NUMBER LADDER")}</span>
        <span className="live-dot">
          {t(
            sdk.player.signedIn ? "PLAY FOR COINS" : "PLAY WITHOUT SIGNING IN",
          )}
        </span>
      </div>
      <div className="warmup-body">
        <div className="warmup-copy">
          <h2>
            {t("How high can")}
            <br />
            {t("your memory climb?")}
          </h2>
          <p>
            {t(
              "Start with three digits. Get them right to add one more, all the way up to 20. Miss a round? Try a fresh sequence at the same length. Three misses end the climb.",
            )}
          </p>
          <p>{t("At least 15 seconds to answer each round.")}</p>
          <p className="ladder-best">
            {t(sdk.player.signedIn ? "Your best:" : "Best on this device:")}{" "}
            {t(best ? `${best} digits` : "Set your first record")}
          </p>
          <ol className="ladder-steps" aria-label={t("Digits to master")}>
            {MILESTONES.map((n) => (
              <li key={n} className={result.best >= n ? "cleared" : ""}>
                {n}
                <span className="sr-only">
                  {" "}
                  {t("digits")}
                  {t(result.best >= n ? " cleared" : "")}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="warmup-play">
          {phase === "ready" && challenge && (
            <>
              <h3 className="challenge-goal">
                {t(`Beat ${challenge.score} digits`)}
              </h3>
              <p>
                {t(
                  isDay(challenge.seed)
                    ? `A friend recalled ${challenge.score} digits on the ${challenge.seed} daily challenge. You get the very same digits.`
                    : `A friend recalled ${challenge.score} digits. You get the very same digits.`,
                )}
              </p>
              <button className="button" disabled={starting} onClick={start}>
                {t(starting ? "Getting ready…" : "Take the challenge →")}
              </button>
              <button
                className="text-button"
                onClick={() => setChallenge(null)}
              >
                {t("Play my own climb instead")}
              </button>
            </>
          )}
          {phase === "ready" && !challenge && (
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
                    ? "The same sequences for everyone. Resets at midnight UTC. Replays are welcome."
                    : "Fresh numbers every game. Build your personal best.",
                )}
              </p>
              <button className="button" disabled={starting} onClick={start}>
                {t(starting ? "Getting ready…" : "Start climbing →")}
              </button>
            </>
          )}
          {(phase === "memorize" || phase === "recall") && (
            <div className="ladder-hud">
              <span>{t(`Round ${answers.length + 1} · ${length} digits`)}</span>
              <span
                className="ladder-lives"
                aria-label={t(`${result.lives} of ${LADDER_LIVES} lives left`)}
              >
                {"♥".repeat(result.lives)}
                {"♡".repeat(LADDER_LIVES - result.lives)}
              </span>
              <span role="timer" aria-label={t("Seconds remaining")}>
                {remaining}
                {t("s")}
              </span>
            </div>
          )}
          {phase === "memorize" && (
            <>
              <p role="status">{t("Memorize the sequence.")}</p>
              <div
                className={`digit-slots${length > 10 ? " long" : ""}`}
                aria-label={t(`Remember ${sequence.split("").join(", ")}`)}
              >
                {sequence.split("").map((n, i) => (
                  <span key={i}>{n}</span>
                ))}
              </div>
              <p>{t("The numbers disappear when time runs out.")}</p>
            </>
          )}
          {phase === "recall" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (answer.length === length) finishRound(answer);
              }}
            >
              <label htmlFor="ladder-answer">
                {t(`What were the ${length} digits?`)}
              </label>
              <input
                ref={input}
                id="ladder-answer"
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={length}
                value={answer}
                onChange={(e) =>
                  setAnswer(e.target.value.replace(/\D/g, "").slice(0, length))
                }
              />
              <button className="button" disabled={answer.length !== length}>
                {t("Check answer →")}
              </button>
            </form>
          )}
          {phase === "round" && last && (
            <>
              <div role="status">
                <h3 className={last.correct ? "win" : ""}>
                  {t(
                    last.correct ? "One rung higher!" : "A miss, not the end.",
                  )}
                </h3>
                <p>
                  {t(
                    last.correct
                      ? `${last.expected.length} digits remembered.`
                      : `You entered ${last.answer || t("no answer")}. The sequence was ${last.expected}.`,
                  )}
                </p>
                <div
                  className={`digit-slots ladder-review${last.expected.length > 10 ? " long" : ""}`}
                  aria-label={t("Correct sequence")}
                >
                  {last.expected.split("").map((n, i) => (
                    <span
                      className={last.answer[i] === n ? "matched" : "missed"}
                      key={i}
                    >
                      {n}
                      <small>{t(last.answer[i] === n ? "✓" : "×")}</small>
                    </span>
                  ))}
                </div>
                <p>
                  {t(
                    !result.over
                      ? last.correct
                        ? `Next up: ${length} digits.`
                        : `Stay with ${length} digits. Lives left: ${result.lives}.`
                      : result.best === LADDER_MAX
                        ? "You cleared all 20 digits!"
                        : "That was your last life. See how you did.",
                  )}
                </p>
              </div>
              <button
                className="button"
                onClick={() => (result.over ? setPhase("done") : memorize())}
              >
                {t(result.over ? "See results →" : "Next round →")}
              </button>
            </>
          )}
          {phase === "done" && (
            <>
              <h3 className="round-result win">
                {t(
                  result.best === LADDER_MAX
                    ? "Top of the ladder!"
                    : "Your climb is complete.",
                )}
              </h3>
              <p>
                {t(
                  `Longest recall: ${result.best} digits · ${result.score} correct rounds`,
                )}
              </p>
              {challenge && (
                <p className={`challenge-result${beat > 0 ? " won" : ""}`}>
                  <strong>
                    {t(
                      beat > 0
                        ? "You beat your friend!"
                        : beat === 0
                          ? "A tie with your friend!"
                          : `${-beat} short of your friend.`,
                    )}
                  </strong>{" "}
                  {t(
                    `You: ${result.best} digits · Friend: ${challenge.score} digits`,
                  )}
                </p>
              )}
              <p>
                {t(
                  result.score && result.best < LADDER_MAX
                    ? "Ready to take it one digit further?"
                    : "Try saying the digits in small groups, then have another go.",
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
                  disabled={starting || reward.kind === "saving"}
                  onClick={start}
                >
                  {t(starting ? "Getting ready…" : "Play again →")}
                </button>
                <button className="secondary-button" onClick={share}>
                  {t(
                    challenge && beat > 0
                      ? "Send it back"
                      : "Challenge a friend",
                  )}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setChallenge(null);
                    setPhase("ready");
                  }}
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
