# Memory

Memory games for [dingn](https://dingn.com). Play **Number Ladder** (recall
3 up to 20 digits) and **Card Ladder** (recall a whole shuffled deck in order,
shown faster each rung, from 5 seconds a card down to half a second), and
practice the Major System in three labs, **Numbers**, **Words** and **Cards**. Play it at <https://dingn.com/play/memory/>.

Memory is published on dingn the same way as any outside developer's game: a
zip uploaded on [My games](https://dingn.com/developers/games/) and approved in
dingn's review queue. It used to be built into the dingn website.

## Develop

```sh
npm install
npm run dev     # http://localhost:5173/
npm test        # typecheck, unit tests and component tests
```

To play it inside dingn while developing, open the
[playground](https://dingn.com/developers/playground/) and load
`http://localhost:5173/`.

Open a tab directly with `#ladder`, `#card-ladder`, `#number`, `#word` or
`#card` in the address.

## What's where

- `src/ladder-game.tsx`, `src/ladder.mjs`: Number Ladder and its rules. The
  daily challenge gives everyone the same sequences for each UTC day.
- `src/card-ladder-game.tsx`, `src/card-ladder.mjs`: Card Ladder and its
  rules. A wrong card ends the round; three misses end the climb. Its daily
  challenge gives everyone the same decks.
- `src/practice.tsx`, `src/library.ts`: the Number, Word and Card labs.
- `public/data/`: the Major System library, exported once from dingn's
  Firestore (`numbers.json`, `words/<first letter>.json`, `index.json`).
- `public/cards/`: the playing card pictures.
- `src/save.ts`: the best climb and favorite words. Saved on the device with
  `sdk.storage`, and to the player's account with `sdk.progress` when signed
  in. Favorites from dingn's old labs were moved into that account progress.
- `src/badges.ts` and `game.json`: badges for ladder lengths, Card Ladder
  speeds and runs, a daily challenge, a first favorite and a full deck. A
  finished Number Ladder climb pays 1 coin per correct round, and a Card
  Ladder climb 2 per rung cleared plus 1 per 13 cards in a row (up to 10
  each) through `sdk.rewards.earn`.

## Release a new version

1. In a pull request, raise `version` in `game.json`. Every release needs a
   new version.
2. Merge it. The **Build and publish** Action tests the game, builds
   `release/memory-<version>.zip` and uploads it to dingn with the
   `DINGN_UPLOAD_KEY` secret.
3. The new version waits in dingn's review queue and goes live once it is
   approved.

A merge that doesn't raise the version builds and tests but uploads nothing.
Every run also keeps the zip as a workflow artifact.

To upload by hand instead: `npm run pack`, then upload the zip on
<https://dingn.com/developers/games/>, or run
`DINGN_UPLOAD_KEY=... npm run upload`.

### The upload key

Create a key on <https://dingn.com/developers/games/> (signed in as the
account that owns the game), then add it to this repository under
**Settings → Secrets and variables → Actions** as `DINGN_UPLOAD_KEY`. dingn
shows the key once; if it is lost, revoke it and create another.

## The dingn SDK

`sdk/` is a copy of the dingn game SDK (`https://dingn.com/sdk/v1/`), bundled
into the game. Run `npm run update-sdk` to refresh it. The full guide is at
<https://dingn.com/developers/>.
