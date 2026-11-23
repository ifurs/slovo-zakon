// The Pages build ships only the game and gives the service worker a fresh cache name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from '../tools/build-site.mjs';

const srcSw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('build sets the cache name from CACHE_VERSION and leaves the source alone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slovo-site-'));
  try {
    const r = buildSite(join(dir, '_site'), '0123456789abcdef0123');
    assert.equal(r.cache, 'slovo-zakon-0123456789ab');
    const sw = readFileSync(join(r.out, 'sw.js'), 'utf8');
    assert.match(sw, /^const CACHE = 'slovo-zakon-0123456789ab';$/m);
    assert.equal(sw.replace(/^const CACHE = .*$/m, ''), srcSw.replace(/^const CACHE = .*$/m, ''), 'only the CACHE line changes');
    assert.equal(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), srcSw);
    for (const f of ['index.html', 'src/main.js', 'fonts/OFL.txt', 'icons/icon-192.png']) assert.ok(existsSync(join(r.out, f)), f);
    for (const f of ['tests', 'tools', 'package.json', 'CLAUDE.md', '.github']) assert.ok(!existsSync(join(r.out, f)), `${f} must not ship`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('without CACHE_VERSION the name is a stable hash of the shipped files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slovo-site-'));
  try {
    const a = buildSite(join(dir, 'a'), ''), b = buildSite(join(dir, 'b'), '');
    assert.match(a.cache, /^slovo-zakon-[0-9a-f]{12}$/);
    assert.equal(a.cache, b.cache);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refuses to build over the repo itself', () => {
  assert.throws(() => buildSite(new URL('..', import.meta.url).pathname));
});
