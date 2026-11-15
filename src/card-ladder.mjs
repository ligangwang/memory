/**
 * Card Ladder: memorize a whole shuffled deck shown one card at a time, then
 * recall it in order. Each rung shows the cards for less time.
 */
/** Seconds each card is shown, one rung after another. */
export const CARD_RUNGS = [5, 4, 3, 2.5, 2, 1.5, 1, 0.75, 0.5, 0.3, 0.2];
/** Misses allowed before the climb ends. */
export const CARD_LIVES = 3;
/** Most rounds a climb can take: every rung plus every miss but the last. */
export const CARD_ROUNDS = CARD_RUNGS.length + CARD_LIVES - 1;

/** A shuffled copy of `cards`. `random()` returns a number in [0, 1). */
export function shuffled(cards, random) {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** A fresh shuffle of `cards` for every round a climb can take. */
export const cardDecks = (cards, random) =>
  Array.from({ length: CARD_ROUNDS }, () => shuffled(cards, random));

/** The same decks for everyone on a UTC day. */
export function dailyCardDecks(cards, day) {
  let seed = 2166136261;
  for (const char of `dingn-card-ladder-v1:${day}`)
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return cardDecks(cards, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
}

/** How many cards from the start of `answer` match `deck`, in order. */
export function cardRun(deck, answer) {
  let run = 0;
  while (run < answer.length && run < deck.length && answer[run] === deck[run])
    run++;
  return run;
}

/**
 * Follows a climb. `answers[i]` is the cards picked in round i, which ends at
 * the first wrong card. Recalling the whole deck clears the rung and moves
 * to a shorter time per card; a miss keeps the rung and costs a life. The
 * climb is over after CARD_LIVES misses, after the last rung, or when the
 * decks run out. Answers after that are ignored.
 */
export function scoreCardLadder(decks, answers) {
  let rung = 0,
    cleared = 0,
    misses = 0,
    bestRun = 0,
    over = false;
  const rounds = [];
  for (let index = 0; index < answers.length && !over; index++) {
    const deck = decks[index] ?? [];
    const answer = answers[index];
    const run = cardRun(deck, answer);
    const correct = deck.length > 0 && run === deck.length;
    rounds.push({ deck, answer, run, correct, seconds: CARD_RUNGS[rung] });
    bestRun = Math.max(bestRun, run);
    if (correct) {
      cleared = rung + 1;
      if (cleared === CARD_RUNGS.length) over = true;
      else rung++;
    } else misses++;
    if (misses >= CARD_LIVES || index + 1 >= decks.length) over = true;
  }
  return {
    rung,
    seconds: CARD_RUNGS[rung],
    cleared,
    bestRun,
    misses,
    lives: CARD_LIVES - misses,
    over,
    rounds,
  };
}
