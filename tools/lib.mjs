// Shared helpers for the level tools.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadLevel, step, parseRules, stateKey, WORDS } from '../src/engine.js';

export const MOVE = { U: 'up', D: 'down', L: 'left', R: 'right', '.': 'wait' };
const LETTER = { up: 'U', down: 'D', left: 'L', right: 'R', wait: '.' };

/** Load chapter N (1-based) from src/levels/chN.js. */
export async function loadChapter(n) {
  const file = resolve(import.meta.dirname, `../src/levels/ch${n}.js`);
  const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  return mod.default;
}

/** Breadth-first search for the shortest solution. */
export function solve(level, limit = 700_000) {
  const start = loadLevel(level);
  const seen = new Set([stateKey(start, parseRules(start))]);
  let frontier = [{ state: start, path: '' }];
  while (frontier.length && seen.size < limit) {
    const next = [];
    for (const { state, path } of frontier) {
      for (const m of ['up', 'down', 'left', 'right', 'wait']) {
        const r = step(state, m);
        if (r.won) return { path: path + LETTER[m], explored: seen.size, complete: true };
        if (r.lost) continue;
        const k = stateKey(r.state, r.rules);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ state: r.state, path: path + LETTER[m] });
      }
    }
    frontier = next;
  }
  return { path: null, explored: seen.size, complete: frontier.length === 0 };
}

/** Replay a move string. Returns { won, lost, at, state }. */
export function replay(level, moves) {
  let s = loadLevel(level);
  const clean = moves.replace(/\s+/g, '');
  for (let i = 0; i < clean.length; i++) {
    if (!MOVE[clean[i]]) throw new Error(`bad move char "${clean[i]}"`);
    const r = step(s, MOVE[clean[i]]);
    s = r.state;
    if (r.won) return { won: true, at: i + 1, total: clean.length, state: s };
    if (r.lost) return { lost: true, at: i + 1, total: clean.length, state: s };
  }
  return { won: false, lost: false, at: clean.length, total: clean.length, state: s };
}

const OBJ_LETTER = { hedgehog: 'h', wall: 'w', crate: 'c', apple: 'a', water: '~', fire: 'f', key: 'k', door: 'd', tree: 't', rock: 'r', mushroom: 'm', ice: 'i', fox: 'x' };
const TEXT_LETTER = { HEDGEHOG: 'H', WALL: 'W', CRATE: 'C', APPLE: 'A', WATER: 'V', FIRE: 'F', KEY: 'K', DOOR: 'D', TREE: 'T', ROCK: 'R', FOX: 'X', MUSHROOM: 'G', ICE: 'I', TEXT: 'S', IS: '=', AND: '&', YOU: '1', WIN: '2', STOP: '3', PUSH: '4', HURT: '5', SINK: '6', OPEN: '7', SHUT: '8', MOVE: '9', HOT: 'Z', MELT: 'M' };

/** ASCII picture of a state (top object per cell, * = several) plus active rules. */
export function draw(state) {
  const g = Array.from({ length: state.h }, () => Array(state.w).fill('.'));
  const n = Array.from({ length: state.h }, () => Array(state.w).fill(0));
  for (const o of state.objs) {
    n[o.y][o.x]++;
    g[o.y][o.x] = n[o.y][o.x] > 1 ? '*' : o.kind === 'text' ? TEXT_LETTER[o.name] : OBJ_LETTER[o.name];
  }
  const rs = parseRules(state);
  const rules = [...new Set(rs.rules.map((r) => `${WORDS[r.subject].label} ЦЕ ${WORDS[r.target].label}`))];
  return g.map((r) => r.join('')).join('\n') + '\nrules: ' + rules.join('; ');
}
