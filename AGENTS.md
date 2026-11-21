# AGENTS.md

Notes for AI coding agents working on Memory.

- This is a dingn game published like any outside developer's game: the
  dingn website (repo `ligangwang/dingn`) runs it in a sandboxed frame and the
  game talks to it only through the SDK in `sdk/`. Don't import from the
  dingn repo. Refresh `sdk/` with `npm run update-sdk`.
- Run `npm test` before committing. `npm run pack` builds the upload zip.
- Merging to `main` publishes on dingn (`.github/workflows/release.yml`)
  when `version` in `game.json` is new.
- Bump `version` in `game.json` for every release; dingn refuses a version it
  already has.
- Save with `sdk.storage` / `sdk.progress`, never `localStorage` or cookies,
  which the sandbox blocks. Keep every URL relative (`base: "./"`), including
  `./data/` and `./cards/`.
- UI strings go through `t()`. Memory speaks every language in game.json's
  `languages`; each one but English has a pack in `src/locales/<lang>.json`
  mapping the English text to its translation (`{0}` placeholders kept). Add
  a new string to every pack (a test checks they all have the same keys).
  Word definitions, the word lists and saved associations stay in English.
