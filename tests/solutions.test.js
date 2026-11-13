// Every level must be well-formed and winnable with its stored solution.
// Each chapter file is loaded on its own, so a broken chapter only fails its own tests.
//   node --test --test-name-pattern="^3-"   → only chapter 3
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { OBJ_CHARS, TEXT_CHARS } from '../src/engine.js';
import { replay } from '../tools/lib.mjs';

const files = readdirSync(new URL('../src/levels/', import.meta.url))
  .filter((f) => /^ch\d+\.js$/.test(f))
  .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));

const names = new Map();
for (const f of files) {
  const n = parseInt(f.slice(2));
  let chapter;
  try {
    chapter = (await import(`../src/levels/${f}`)).default;
  } catch (e) {
    test(`${n}- chapter file ${f} loads`, () => { throw e; });
    continue;
  }
  chapter.levels.forEach((level, li) => {
    const id = `${n}-${li + 1} «${level.name}»`;
    test(`${id} is well-formed`, () => {
      assert.ok(level.name && level.hint, 'needs name and hint');
      const other = names.get(level.name);
      assert.ok(!other || other === id, `duplicate level name (also ${other})`);
      names.set(level.name, id);
      const w = level.map[0].length;
      assert.ok(level.map.every((r) => r.length === w), 'all map rows must have equal length');
      assert.ok(w <= 20 && level.map.length <= 14, 'map too big (max 20x14)');
      for (const row of level.map) for (const ch of row) {
        assert.ok(ch === '.' || OBJ_CHARS[ch] || TEXT_CHARS[ch], `unknown map char "${ch}"`);
      }
    });
    test(`${id} is winnable with its stored solution`, () => {
      assert.ok(level.solution, 'missing solution');
      const r = replay(level, level.solution);
      assert.ok(r.won, r.lost ? `lost at move ${r.at}` : 'solution did not win');
      assert.equal(r.at, r.total, `won early at move ${r.at} of ${r.total} — trim the solution`);
    });
  });
}
