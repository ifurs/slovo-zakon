// Shortest-solution search.
//   node tools/solve.mjs <chapter> [level]     e.g. node tools/solve.mjs 2 4
// Prints the shortest solution (or that the search limit was hit) and compares it with level.solution.
import { loadChapter, solve } from './lib.mjs';

const [ch, only, limitArg] = process.argv.slice(2).map(Number);
if (!ch) { console.error('usage: node tools/solve.mjs <chapter> [level] [stateLimit]'); process.exit(2); }
const chapter = await loadChapter(ch);
let ok = true;
for (const [i, lvl] of chapter.levels.entries()) {
  if (only && i + 1 !== only) continue;
  const t = Date.now();
  const r = solve(lvl, limitArg || 700_000);
  const ms = Date.now() - t;
  const stored = (lvl.solution || '').replace(/\s+/g, '');
  let verdict;
  if (r.path) verdict = `shortest ${r.path.length} moves: ${r.path}  (stored solution: ${stored.length})`;
  else if (r.complete) { verdict = 'NO SOLUTION EXISTS'; ok = false; }
  else verdict = `search limit hit — rely on stored solution (${stored.length} moves)`;
  console.log(`${ch}-${i + 1} ${lvl.name.padEnd(24)} ${verdict}  [${r.explored} states, ${ms}ms]`);
}
process.exit(ok ? 0 : 1);
