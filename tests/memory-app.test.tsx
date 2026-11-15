import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { DingnGame, Json, Locale } from "../sdk/dingn-sdk.js";
import { DingnProvider } from "../src/dingn";
import { MemoryProvider } from "../src/memory-state";
import { MemoryApp } from "../src/app";
import { cardDecks } from "../src/card-ladder.mjs";
import { deck } from "../src/library";

const DATA: Record<string, unknown> = {
  "index.json": { numbers: 3, words: { s: 1, t: 1 } },
  "numbers.json": {
    "0": { w: ["sea", "zoo"], f: "zoo" },
    "1": { w: ["tea", "toy"] },
    "07": { w: ["sock"] },
  },
  "words/s.json": { sock: ["/sɒk/", "en-GB", "07", { noun: ["a garment"] }] },
  "words/t.json": { tie: ["/taɪ/", "en-GB", "1", { noun: ["a neck band"] }] },
};

function fakeSdk(signedIn: boolean, locale: Locale = "en") {
  const device = new Map<string, Json>();
  let account: Json = null;
  const sdk = {
    gameId: "memory",
    version: "1.0.0",
    locale,
    embedded: true,
    player: { signedIn, name: "Ada", avatar: "" },
    onPlayer: () => () => {},
    storage: {
      get: async (k: string) => device.get(k) ?? null,
      set: async (k: string, v: Json) => void device.set(k, v),
    },
    progress: {
      load: async () => account,
      save: vi.fn(async (v: Json) => {
        account = v;
      }),
    },
    rewards: {
      unlock: vi.fn(async () => ({ new: true, coins: 10 })),
      list: vi.fn(async () => []),
      spend: vi.fn(),
      shop: vi.fn(async () => []),
      earn: vi.fn(async (coins: number) => ({ coins, left: 100 })),
    },
    requestSignIn: vi.fn(),
    navigate: vi.fn(),
    ready: vi.fn(),
  };
  return { sdk: sdk as unknown as DingnGame, device, raw: sdk };
}
const show = (sdk: DingnGame) =>
  render(
    <DingnProvider sdk={sdk}>
      <MemoryProvider
        initial={{ best: 0, cards: 0, cardRun: 0, favorites: {} }}
      >
        <MemoryApp />
      </MemoryProvider>
    </DingnProvider>,
  );

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const file = url.replace("./data/", "");
      return file in DATA
        ? { ok: true, json: async () => DATA[file] }
        : { ok: false, json: async () => ({}) };
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("opens on Number Ladder and offers all five tabs", () => {
  const { sdk } = fakeSdk(false);
  show(sdk);
  for (const name of [
    "Number Ladder",
    "Card Ladder",
    "Numbers",
    "Words",
    "Cards",
  ])
    expect(screen.getByRole("button", { name })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start climbing →" })).toBeTruthy();
  expect(screen.getByText("PLAY WITHOUT SIGNING IN")).toBeTruthy();
});

test("keeps the ladders under Play and the labs under Practice", () => {
  const { sdk } = fakeSdk(false);
  show(sdk);
  const play = screen.getByRole("group", { name: "Play" });
  const practice = screen.getByRole("group", { name: "Practice" });
  expect(play.textContent).toContain("Number Ladder");
  expect(play.textContent).toContain("Card Ladder");
  expect(play.textContent).not.toContain("Numbers");
  for (const name of ["Numbers", "Words", "Cards"])
    expect(practice.textContent).toContain(name);
  expect(practice.textContent).toContain("no score");
});

test("the number lab reveals words and saves a favorite to the account", async () => {
  const { sdk, raw } = fakeSdk(true);
  show(sdk);
  fireEvent.click(screen.getByRole("button", { name: "Numbers" }));
  await screen.findByRole("heading", { name: "0" });
  fireEvent.click(screen.getByRole("button", { name: /Reveal answer/ }));
  // The most popular word shows until the player picks their own.
  expect(screen.getByText("zoo", { selector: ".favorite-label" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /sea/ }));
  await waitFor(() =>
    expect(raw.progress.save).toHaveBeenCalledWith({
      best: 0,
      cards: 0,
      cardRun: 0,
      favorites: { "0": "sea" },
    }),
  );
  await waitFor(() =>
    expect(raw.rewards.unlock).toHaveBeenCalledWith("first-favorite"),
  );
  fireEvent.click(screen.getByRole("button", { name: /Next practice/ }));
  await screen.findByRole("heading", { name: "1" });
});

test("a signed-out player keeps favorites on the device", async () => {
  const { sdk, raw, device } = fakeSdk(false);
  show(sdk);
  fireEvent.click(screen.getByRole("button", { name: "Numbers" }));
  await screen.findByRole("heading", { name: "0" });
  fireEvent.click(screen.getByRole("button", { name: /Reveal answer/ }));
  fireEvent.click(screen.getByRole("button", { name: /zoo/ }));
  await waitFor(() =>
    expect(device.get("memory")).toEqual({
      best: 0,
      cards: 0,
      cardRun: 0,
      favorites: { "0": "zoo" },
    }),
  );
  expect(raw.progress.save).not.toHaveBeenCalled();
});

test("the word lab finds a word and shows its number and definitions", async () => {
  const { sdk } = fakeSdk(true);
  show(sdk);
  fireEvent.click(screen.getByRole("button", { name: "Words" }));
  await screen.findByText("Your word");
  fireEvent.change(screen.getByPlaceholderText("Find a word…"), {
    target: { value: "Sock" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await screen.findByRole("heading", { name: "sock" });
  fireEvent.click(screen.getByRole("button", { name: /Reveal answer/ }));
  expect(screen.getByText("07")).toBeTruthy();
  expect(screen.getByText("a garment")).toBeTruthy();
});

test("the card lab shows each card with its words", async () => {
  const { sdk } = fakeSdk(true, "zh-CN");
  show(sdk);
  fireEvent.click(screen.getByRole("button", { name: "扑克牌" }));
  const card = await screen.findByRole("img");
  expect(card.getAttribute("src")).toBe("./cards/C2.png");
  expect(card.getAttribute("alt")).toBe("梅花 2");
});

test("a finished climb pays coins and saves the best", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { sdk, raw } = fakeSdk(true);
  show(sdk);
  fireEvent.click(screen.getByRole("button", { name: "Start climbing →" }));
  // One right answer, then three misses: the third ends the climb.
  for (let round = 0; round < 4; round++) {
    const slots = await screen.findByLabelText(/^Remember /);
    const digits = slots.getAttribute("aria-label")!.replace(/\D/g, "");
    await vi.advanceTimersByTimeAsync(digits.length * 1000 + 300);
    const input = await screen.findByLabelText(/What were the/);
    const wrong = digits.replace(/\d/g, (d) => String((Number(d) + 1) % 10));
    fireEvent.change(input, { target: { value: round ? wrong : digits } });
    fireEvent.click(screen.getByRole("button", { name: "Check answer →" }));
    if (round < 3)
      fireEvent.click(
        await screen.findByRole("button", { name: "Next round →" }),
      );
  }
  fireEvent.click(await screen.findByRole("button", { name: "See results →" }));
  await screen.findByText("+1 dingn coins");
  expect(raw.rewards.earn).toHaveBeenCalledWith(1);
  expect(raw.progress.save).toHaveBeenCalledWith({
    best: 3,
    cards: 0,
    cardRun: 0,
    favorites: {},
  });
  vi.useRealTimers();
});

test("Card Ladder deals a deck one card at a time and checks the order", async () => {
  // crypto returning 0 makes the shuffle predictable.
  vi.stubGlobal("crypto", {
    getRandomValues: (a: Uint32Array) => a.fill(0),
  });
  vi.useFakeTimers();
  try {
    const order = cardDecks(
      deck.map((c) => c.id),
      () => 0,
    )[0];
    const name = (id: string) => deck.find((c) => c.id === id)!.name;
    const { sdk } = fakeSdk(false);
    show(sdk);
    fireEvent.click(screen.getByRole("button", { name: "Card Ladder" }));
    fireEvent.click(screen.getByRole("button", { name: "Deal the cards →" }));
    expect(screen.getByRole("img", { name: name(order[0]) })).toBeTruthy();
    await act(async () => void vi.advanceTimersByTime(5100));
    expect(screen.getByRole("img", { name: name(order[1]) })).toBeTruthy();
    await act(async () => void vi.advanceTimersByTime(52 * 5000));
    expect(screen.getByText("Which card was number 1?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: name(order[0]) }));
    fireEvent.click(screen.getByRole("button", { name: name(order[1]) }));
    expect(screen.getByText("Which card was number 3?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: name(order[5]) }));
    expect(screen.getByText("A miss, not the end.")).toBeTruthy();
    expect(screen.getByText(/^2 cards in a row\./)).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});
