# Слово — закон: notes for Claude

Browser puzzle (Baba Is You-like, Ukrainian words). Plain ES modules, no build step, no dependencies. PWA, served by GitHub Pages from the repo.

## Layout
- `index.html`, `style.css`, `manifest.webmanifest`, `sw.js`, `icons/`, `fonts/`.
- `src/engine.js` (rules + moves), `src/render.js`, `src/sound.js`, `src/main.js`, `src/levels.js` + `src/levels/chN.js` (each level stores its `solution`).
- `tools/solve.mjs` (shortest-solution search), `tools/replay.mjs` (play moves, draw the board), `tools/lib.mjs`.
- `tests/`: engine tests, PWA checks, every level's stored solution must win.

## Commands
- Run: `npm start` (python http.server on 8137; ES modules need a server, not `file://`).
- Test: `node --test` (= `npm test`). CI runs it on every push and PR (`.github/workflows/test.yml`).
- Solver: `node tools/solve.mjs <chapter> [level] [stateLimit]`, e.g. `node tools/solve.mjs 2 4`. Exits 1 if a level has no solution.
- Replay: `node tools/replay.mjs <chapter> <level> ["UURR..."]`.

## Rules
- After adding or changing a level, update its `solution` and run `node --test`.
- PWA cache: bump `CACHE` in `sw.js` (e.g. `slovo-zakon-v4` → `v5`) when shipping changed assets, and add any new loaded file (new `src/levels/chN.js`, module, font, icon) to `CORE`; `tests/pwa.test.js` checks the list. There is no build step, so the cache name is bumped by hand.
- Public repo on GitHub Pages: never add secrets, tokens, personal data or private notes to any file.
- User-facing text is Ukrainian first. Phone-first layout (also works on desktop).
- Pin GitHub Actions by full commit SHA with a version comment.
