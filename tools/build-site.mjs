#!/usr/bin/env node
// Builds the GitHub Pages site into _site/: only the files the game ships, with the service-worker
// cache name set at deploy time, so nobody has to bump `CACHE` in sw.js by hand.
//   node tools/build-site.mjs [outDir]          (default _site)
//   CACHE_VERSION=<git sha> node tools/build-site.mjs   (CI passes the commit SHA; first 12 chars are used)
// Without CACHE_VERSION the name comes from a hash of the shipped files, so a local build of the same
// files always gets the same name.
// The source sw.js keeps its hand-set name: Pages served from the branch still works as before.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SHIP = ['index.html', 'style.css', 'manifest.webmanifest', 'sw.js', 'LICENSE', 'icons', 'fonts', 'src'];
const CACHE_LINE = /^const CACHE = '([a-z0-9-]+?)-[^'-]+';$/m; // const CACHE = 'slovo-zakon-v4';

function walk(dir) {
  return readdirSync(dir).sort().flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export function buildSite(out = join(root, '_site'), version = process.env.CACHE_VERSION) {
  out = resolve(out);
  if (out === root || !relative(root, out) || root.startsWith(out)) throw new Error(`refusing to build into ${out}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  // docs inside shipped folders (e.g. src/levels/README.md) stay out of the site
  for (const f of SHIP) cpSync(join(root, f), join(out, f), { recursive: true, filter: (p) => !p.endsWith('.md') });

  const swPath = join(out, 'sw.js');
  const sw = readFileSync(swPath, 'utf8');
  const m = sw.match(CACHE_LINE);
  if (!m) throw new Error("sw.js: no line like  const CACHE = 'slovo-zakon-v4';");
  let ver = String(version || '').trim().slice(0, 12);
  if (!/^[0-9a-zA-Z]+$/.test(ver)) {
    const h = createHash('sha256');
    for (const f of walk(out)) if (f !== swPath) h.update(relative(out, f)).update(readFileSync(f));
    h.update(sw);
    ver = h.digest('hex').slice(0, 12);
  }
  const cache = `${m[1]}-${ver}`;
  writeFileSync(swPath, sw.replace(CACHE_LINE, `const CACHE = '${cache}';`));

  // every file the service worker precaches must be in the site, or install fails offline
  const core = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map((x) => x[1]).filter((f) => f !== './');
  const missing = core.filter((f) => !existsSync(join(out, f)));
  if (missing.length) throw new Error(`files in sw.js CORE missing from the site: ${missing.join(', ')}`);
  return { out, cache, files: walk(out).length };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const r = buildSite(process.argv[2] ? resolve(process.argv[2]) : undefined);
  console.log(`built ${relative(process.cwd(), r.out) || '.'}: ${r.files} files, service-worker cache ${r.cache}`);
}
