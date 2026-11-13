// Replay moves on a level and print the board.
//   node tools/replay.mjs <chapter> <level> [moves]
// Without moves, replays level.solution. Moves: U D L R and . (wait); spaces ignored.
import { loadChapter, replay, draw } from './lib.mjs';
import { loadLevel } from '../src/engine.js';

const [ch, n, ...rest] = process.argv.slice(2);
const chapter = await loadChapter(Number(ch));
const level = chapter.levels[Number(n) - 1];
if (!level) { console.error('no such level'); process.exit(2); }
const moves = rest.length ? rest.join('') : level.solution || '';
console.log(`${ch}-${n} ${level.name}\nstart:\n${draw(loadLevel(level))}\n`);
const r = replay(level, moves);
console.log(r.won ? `WON at move ${r.at}/${r.total}` : r.lost ? `LOST at move ${r.at}` : `not won after ${r.at} moves`);
console.log(draw(r.state));
process.exit(r.won && r.at === r.total ? 0 : 1);
