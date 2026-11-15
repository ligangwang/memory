export const CARD_RUNGS: number[];
export const CARD_LIVES: number;
export const CARD_ROUNDS: number;
export function shuffled<T>(cards: readonly T[], random: () => number): T[];
export function cardDecks<T>(cards: readonly T[], random: () => number): T[][];
export function dailyCardDecks<T>(cards: readonly T[], day: string): T[][];
export function cardRun(deck: string[], answer: string[]): number;
export function scoreCardLadder(
  decks: string[][],
  answers: string[][],
): {
  rung: number;
  seconds: number;
  cleared: number;
  bestRun: number;
  misses: number;
  lives: number;
  over: boolean;
  rounds: {
    deck: string[];
    answer: string[];
    run: number;
    correct: boolean;
    seconds: number;
  }[];
};
