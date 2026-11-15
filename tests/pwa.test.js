// The offline cache must list every file the game loads, or a new chapter/module breaks offline play.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const core = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]);

test('sw.js caches every game module and chapter', () => {
  const src = readdirSync(new URL('src/', root)).filter((f) => f.endsWith('.js')).map((f) => `src/${f}`);
  const levels = readdirSync(new URL('src/levels/', root)).filter((f) => f.endsWith('.js')).map((f) => `src/levels/${f}`);
  for (const f of [...src, ...levels]) assert.ok(core.includes(f), `${f} is missing from CORE in sw.js`);
});

test('every file sw.js caches exists', () => {
  for (const f of core) if (f !== './') assert.ok(existsSync(new URL(f, root)), `${f} does not exist`);
});

test('manifest icons exist', () => {
  const m = JSON.parse(readFileSync(new URL('manifest.webmanifest', root), 'utf8'));
  for (const i of m.icons) assert.ok(existsSync(new URL(i.src, root)), `${i.src} does not exist`);
});
