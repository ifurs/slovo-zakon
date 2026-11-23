# Слово — закон: notes for Claude

Browser puzzle (Baba Is You-like, Ukrainian words). Plain ES modules, no build step for development, no dependencies. PWA on GitHub Pages (repo `ifurs/slovo-zakon`), served from the branch today; a deploy workflow is ready (see Rules).

## Layout
- `index.html`, `style.css`, `manifest.webmanifest`, `sw.js`, `icons/`, `fonts/`.
- `src/engine.js` (rules + moves), `src/render.js`, `src/sound.js`, `src/main.js`, `src/levels.js` + `src/levels/chN.js` (each level stores its `solution`).
- `tools/solve.mjs` (shortest-solution search), `tools/replay.mjs` (play moves, draw the board), `tools/lib.mjs`.
- `tests/`: engine tests, PWA checks, every level's stored solution must win.

## Commands
- Run: `npm start` (python http.server on 8137; ES modules need a server, not `file://`).
- Test: `node --test` (= `npm test`). CI runs it on every push and PR (`.github/workflows/test.yml`).
- Build the Pages site locally: `node tools/build-site.mjs` → `_site/` (gitignored).
- Solver: `node tools/solve.mjs <chapter> [level] [stateLimit]`, e.g. `node tools/solve.mjs 2 4`. Exits 1 if a level has no solution.
- Replay: `node tools/replay.mjs <chapter> <level> ["UURR..."]`.

## Rules
- After adding or changing a level, update its `solution` and run `node --test`.
- PWA cache: add any new loaded file (new `src/levels/chN.js`, module, font, icon) to `CORE` in `sw.js`; `tests/pwa.test.js` checks the list.
- Cache name: `.github/workflows/pages.yml` builds `_site/` with `node tools/build-site.mjs`, which ships only the game files (`SHIP` list) and sets `CACHE` in the built `sw.js` to `slovo-zakon-<first 12 chars of the commit SHA>`, then deploys with `actions/deploy-pages`. The deploy runs only once Settings → Pages → Source is "GitHub Actions"; until then Pages serves the branch and the hand-set `CACHE` in the source `sw.js` is what players get, so keep bumping it by hand (`v4` → `v5`) until the switch. After the switch the source value no longer matters.
- A new top-level shipped file or folder must be added to `SHIP` in `tools/build-site.mjs`; `tests/build.test.js` checks the build.
- Public repo on GitHub Pages: never add secrets, tokens, personal data or private notes to any file.
- User-facing text is Ukrainian first. Phone-first layout (also works on desktop).
- Pin GitHub Actions by full commit SHA with a version comment.
