// Rule engine: pure logic, no DOM. Works in the browser and in Node (for tests/solver).

export const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// Pseudo object type used by the noun СЛОВО (all text tiles).
export const TEXT_OBJ = '__text';

// Every word that can appear on a text tile.
// kind: noun (refers to an object type), op (ЦЕ), and (І), prop (property).
export const WORDS = {
  HEDGEHOG: { kind: 'noun', label: 'ЇЖАК', obj: 'hedgehog', color: '#e0a35c' },
  WALL: { kind: 'noun', label: 'СТІНА', obj: 'wall', color: '#8a94a8' },
  CRATE: { kind: 'noun', label: 'ЯЩИК', obj: 'crate', color: '#c48a4a' },
  APPLE: { kind: 'noun', label: 'ЯБЛУКО', obj: 'apple', color: '#e5484d' },
  WATER: { kind: 'noun', label: 'ВОДА', obj: 'water', color: '#4aa3df' },
  FIRE: { kind: 'noun', label: 'ВОГОНЬ', obj: 'fire', color: '#ff7a1a' },
  KEY: { kind: 'noun', label: 'КЛЮЧ', obj: 'key', color: '#f2c94c' },
  DOOR: { kind: 'noun', label: 'ДВЕРІ', obj: 'door', color: '#b5734a' },
  TREE: { kind: 'noun', label: 'ДЕРЕВО', obj: 'tree', color: '#4caf50' },
  ROCK: { kind: 'noun', label: 'КАМІНЬ', obj: 'rock', color: '#a7a29a' },
  FOX: { kind: 'noun', label: 'ЛИС', obj: 'fox', color: '#ff8c42' },
  MUSHROOM: { kind: 'noun', label: 'ГРИБ', obj: 'mushroom', color: '#d98ad9' },
  ICE: { kind: 'noun', label: 'ЛІД', obj: 'ice', color: '#9fe3ff' },
  // СЛОВО refers to the word tiles themselves.
  TEXT: { kind: 'noun', label: 'СЛОВО', obj: TEXT_OBJ, color: '#e9e6df' },
  LEAF: { kind: 'noun', label: 'ЛИСТ', obj: 'leaf', color: '#8bc34a' },

  IS: { kind: 'op', label: 'ЦЕ', color: '#ffffff' },
  AND: { kind: 'and', label: 'І', color: '#ffffff' },

  YOU: { kind: 'prop', label: 'ТИ', prop: 'YOU', color: '#f78fb3' },
  WIN: { kind: 'prop', label: 'ПЕРЕМОГА', prop: 'WIN', color: '#ffd84d' },
  STOP: { kind: 'prop', label: 'СТОП', prop: 'STOP', color: '#5fbf77' },
  PUSH: { kind: 'prop', label: 'ШТОВХ', prop: 'PUSH', color: '#b98552' },
  HURT: { kind: 'prop', label: 'СМЕРТЬ', prop: 'HURT', color: '#e5484d' },
  SINK: { kind: 'prop', label: 'ВИР', prop: 'SINK', color: '#4aa3df' },
  OPEN: { kind: 'prop', label: 'ВІДМИЧКА', prop: 'OPEN', color: '#f2c94c' },
  SHUT: { kind: 'prop', label: 'ЗАМОК', prop: 'SHUT', color: '#c0605a' },
  MOVE: { kind: 'prop', label: 'РУХ', prop: 'MOVE', color: '#9be15d' },
  HOT: { kind: 'prop', label: 'ЖАР', prop: 'HOT', color: '#ff7a1a' },
  MELT: { kind: 'prop', label: 'ТАНЕ', prop: 'MELT', color: '#9fe3ff' },
  // Mechanics of our own:
  EXPLODE: { kind: 'prop', label: 'ВИБУХ', prop: 'EXPLODE', color: '#ff5d5d' },
  FLOCK: { kind: 'prop', label: 'ЗГРАЯ', prop: 'FLOCK', color: '#c9a0ff' },
  ECHO: { kind: 'prop', label: 'ЕХО', prop: 'ECHO', color: '#7fd1c7' },
  TRAIL: { kind: 'prop', label: 'СЛІД', prop: 'TRAIL', color: '#8bc34a' },
};

const NOUN_BY_OBJ = Object.fromEntries(
  Object.entries(WORDS)
    .filter(([, w]) => w.kind === 'noun')
    .map(([key, w]) => [w.obj, key]),
);

// Level map legend.
export const OBJ_CHARS = {
  h: 'hedgehog', w: 'wall', c: 'crate', a: 'apple', '~': 'water', f: 'fire',
  k: 'key', d: 'door', t: 'tree', r: 'rock', m: 'mushroom', i: 'ice', l: 'leaf',
  x: 'fox', y: 'fox', '^': 'fox', v: 'fox',
};
export const TEXT_CHARS = {
  H: 'HEDGEHOG', W: 'WALL', C: 'CRATE', A: 'APPLE', V: 'WATER', F: 'FIRE',
  K: 'KEY', D: 'DOOR', T: 'TREE', R: 'ROCK', X: 'FOX', G: 'MUSHROOM', I: 'ICE', S: 'TEXT', L: 'LEAF',
  '=': 'IS', '&': 'AND',
  1: 'YOU', 2: 'WIN', 3: 'STOP', 4: 'PUSH', 5: 'HURT', 6: 'SINK', 7: 'OPEN', 8: 'SHUT', 9: 'MOVE',
  Z: 'HOT', M: 'MELT',
  B: 'EXPLODE', N: 'FLOCK', E: 'ECHO', P: 'TRAIL',
};
const START_DIR = { y: 'left', '^': 'up', v: 'down' };

/**
 * level.map: array of equal-length strings (legend in src/levels/README.md).
 * level.extra (optional): [[char, x, y, dir?], ...] — extra objects stacked on a cell,
 *   or objects that need a specific starting direction (for РУХ).
 */
export function loadLevel(level) {
  const rows = level.map;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const objs = [];
  let nextId = 1;
  const place = (ch, x, y, dir) => {
    if (OBJ_CHARS[ch]) {
      objs.push({ id: nextId++, kind: 'obj', name: OBJ_CHARS[ch], x, y, dir: dir || START_DIR[ch] || 'right' });
    } else if (TEXT_CHARS[ch]) {
      objs.push({ id: nextId++, kind: 'text', name: TEXT_CHARS[ch], x, y, dir: dir || 'right' });
    } else if (ch !== '.' && ch !== ' ') {
      throw new Error(`Unknown map char "${ch}" at ${x},${y}`);
    }
  };
  rows.forEach((row, y) => [...row].forEach((ch, x) => place(ch, x, y)));
  for (const [ch, x, y, dir] of level.extra || []) place(ch, x, y, dir);
  const state = { w, h, objs, nextId };
  applyTransforms(state, parseRules(state));
  return state;
}

export function cloneState(s) {
  return { w: s.w, h: s.h, nextId: s.nextId, last: s.last, objs: s.objs.map((o) => ({ ...o })) };
}

// ---------- rules ----------

function textGrid(state) {
  const grid = new Map();
  for (const o of state.objs) {
    if (o.kind !== 'text') continue;
    const k = o.x + ',' + o.y;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(o);
  }
  return grid;
}

// Read a chain like  A І B І C  starting at (x,y) stepping (dx,dy).
function readChain(grid, x, y, dx, dy, kinds, used) {
  const out = [];
  for (;;) {
    const here = (grid.get(x + ',' + y) || []).filter((t) => kinds.includes(WORDS[t.name].kind));
    if (!here.length) break;
    for (const t of here) { out.push(t.name); used.add(t.id); }
    const andTiles = (grid.get(x + dx + ',' + (y + dy)) || []).filter((t) => t.name === 'AND');
    if (!andTiles.length) break;
    const next = (grid.get(x + 2 * dx + ',' + (y + 2 * dy)) || []).filter((t) => kinds.includes(WORDS[t.name].kind));
    if (!next.length) break;
    andTiles.forEach((t) => used.add(t.id));
    x += 2 * dx; y += 2 * dy;
  }
  return out;
}

export function parseRules(state) {
  const grid = textGrid(state);
  const rules = [];
  const active = new Set();
  for (const op of state.objs) {
    if (op.kind !== 'text' || op.name !== 'IS') continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const used = new Set();
      // Subjects are read backwards, so read them by stepping back.
      const subjects = readChain(grid, op.x - dx, op.y - dy, -dx, -dy, ['noun'], used);
      if (!subjects.length) continue;
      const targets = readChain(grid, op.x + dx, op.y + dy, dx, dy, ['noun', 'prop'], used);
      if (!targets.length) continue;
      used.add(op.id);
      used.forEach((id) => active.add(id));
      for (const s of subjects) for (const t of targets) rules.push({ subject: s, target: t });
    }
  }
  const props = {};
  for (const r of rules) {
    const w = WORDS[r.target];
    if (w.kind !== 'prop') continue;
    const obj = WORDS[r.subject].obj;
    (props[obj] ||= new Set()).add(w.prop);
  }
  return { rules, props, active };
}

export function has(rs, o, prop) {
  const p = rs.props[o.kind === 'text' ? TEXT_OBJ : o.name];
  if (o.kind === 'text' && prop === 'PUSH') return true; // words can always be pushed
  return !!p && p.has(prop);
}

function applyTransforms(state, rs) {
  const byObj = {};
  for (const r of rs.rules) {
    if (WORDS[r.target].kind !== 'noun') continue;
    const from = WORDS[r.subject].obj;
    if (from === TEXT_OBJ || WORDS[r.target].obj === TEXT_OBJ) continue; // words never transform
    (byObj[from] ||= []).push(WORDS[r.target].obj);
  }
  let changed = false;
  const added = [];
  for (const o of state.objs) {
    if (o.kind !== 'obj') continue;
    const targets = byObj[o.name];
    if (!targets || targets.includes(o.name)) continue; // "X ЦЕ X" protects X
    const [first, ...rest] = targets;
    for (const t of rest) added.push({ ...o, id: state.nextId++, name: t });
    o.name = first;
    changed = true;
  }
  state.objs.push(...added);
  return changed;
}

// ---------- movement ----------

// Spatial index, rebuilt per turn phase and kept in sync by doMove.
function buildIndex(state) {
  const g = new Map();
  for (const o of state.objs) {
    const k = o.y * state.w + o.x;
    let a = g.get(k);
    if (!a) g.set(k, (a = []));
    a.push(o);
  }
  state.grid = g;
}

function objsAt(state, x, y) {
  return state.grid.get(y * state.w + x) || [];
}

function relocate(state, o, nx, ny) {
  const from = state.grid.get(o.y * state.w + o.x);
  if (from) from.splice(from.indexOf(o), 1);
  o.x = nx; o.y = ny;
  if (o.kind === 'text') state.textMoved = true;
  const k = ny * state.w + nx;
  let a = state.grid.get(k);
  if (!a) state.grid.set(k, (a = []));
  a.push(o);
}

function canMove(state, rs, o, dx, dy, depth = 0) {
  const nx = o.x + dx, ny = o.y + dy;
  if (nx < 0 || ny < 0 || nx >= state.w || ny >= state.h) return false;
  if (depth > state.w + state.h) return false;
  for (const p of objsAt(state, nx, ny)) {
    if (p === o) continue;
    if (has(rs, p, 'PUSH')) {
      if (!canMove(state, rs, p, dx, dy, depth + 1)) return false;
    } else if (has(rs, p, 'STOP')) {
      // A ВІДМИЧКА may enter a ЗАМОК (and vice versa) — they will destroy each other.
      if ((has(rs, o, 'OPEN') && has(rs, p, 'SHUT')) || (has(rs, o, 'SHUT') && has(rs, p, 'OPEN'))) continue;
      return false;
    }
  }
  return true;
}

function doMove(state, rs, o, dx, dy, dir, moved) {
  const nx = o.x + dx, ny = o.y + dy;
  for (const p of [...objsAt(state, nx, ny)]) {
    if (p !== o && has(rs, p, 'PUSH')) doMove(state, rs, p, dx, dy, dir, moved);
  }
  const ox = o.x, oy = o.y;
  relocate(state, o, nx, ny);
  o.dir = dir;
  moved.add(o.id);
  state.moveLog.push({ o, dir });
  // СЛІД: leave a ЛИСТ on the cell we just left (one per cell).
  if (has(rs, o, 'TRAIL') && !objsAt(state, ox, oy).some((q) => q.name === 'leaf')) {
    const leaf = { id: state.nextId++, kind: 'obj', name: 'leaf', x: ox, y: oy, dir: 'right' };
    state.objs.push(leaf);
    state.grid.get(oy * state.w + ox)?.push(leaf) ?? state.grid.set(oy * state.w + ox, [leaf]);
  }
}

const kindOf = (o) => (o.kind === 'text' ? TEXT_OBJ : o.name);

// ЗГРАЯ: when one member of a kind moves, every other member tries to step the same way.
function flockPass(state, rs) {
  const done = new Set();
  const movedIds = () => new Set(state.moveLog.map((e) => e.o.id));
  for (let i = 0; i < state.moveLog.length; i++) {
    const { o, dir } = state.moveLog[i];
    if (!has(rs, o, 'FLOCK')) continue;
    const key = kindOf(o) + '|' + dir;
    if (done.has(key)) continue;
    done.add(key);
    const already = movedIds();
    const [dx, dy] = DIRS[dir];
    const followers = state.objs
      .filter((p) => !already.has(p.id) && kindOf(p) === kindOf(o))
      .sort((a, b) => (b.x - a.x) * dx + (b.y - a.y) * dy);
    const moved = new Set();
    for (const p of followers) {
      if (moved.has(p.id)) continue;
      if (canMove(state, rs, p, dx, dy)) doMove(state, rs, p, dx, dy, dir, moved);
    }
  }
}

function moveGroup(state, rs, movers, dir) {
  const [dx, dy] = DIRS[dir];
  // Front-most movers first so a line of movers walks together.
  movers.sort((a, b) => (b.x - a.x) * dx + (b.y - a.y) * dy);
  const moved = new Set();
  let any = false;
  for (const o of movers) {
    o.dir = dir;
    if (moved.has(o.id)) continue;
    if (canMove(state, rs, o, dx, dy)) { doMove(state, rs, o, dx, dy, dir, moved); any = true; }
  }
  return any;
}

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// ---------- interactions ----------

function resolveInteractions(state, rs) {
  const cells = new Map();
  for (const o of state.objs) {
    const k = o.x + ',' + o.y;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(o);
  }
  const events = [];

  // ВИБУХ: an exploding object sharing its cell with anything destroys the 3×3 area around it.
  // Other ВИБУХ objects caught in the blast explode too (chain reaction).
  const queue = [];
  const blown = new Set();
  for (const [k, list] of cells) {
    if (list.length >= 2 && list.some((o) => has(rs, o, 'EXPLODE'))) { queue.push(k); blown.add(k); }
  }
  while (queue.length) {
    const [cx, cy] = queue.shift().split(',').map(Number);
    events.push('boom');
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const k = cx + dx + ',' + (cy + dy);
        for (const o of cells.get(k) || []) {
          o.dead = true;
          if (has(rs, o, 'EXPLODE') && !blown.has(k)) { blown.add(k); queue.push(k); }
        }
      }
    }
  }

  for (const all of cells.values()) {
    const list = all.filter((o) => !o.dead);
    if (list.length < 2) continue;
    if (list.some((o) => has(rs, o, 'SINK'))) {
      list.forEach((o) => { o.dead = true; });
      events.push('sink');
      continue;
    }
    if (list.some((o) => has(rs, o, 'HURT'))) {
      for (const o of list) if (has(rs, o, 'YOU')) { o.dead = true; events.push('hurt'); }
    }
    if (list.some((o) => has(rs, o, 'HOT'))) {
      for (const o of list) if (!o.dead && has(rs, o, 'MELT')) { o.dead = true; events.push('melt'); }
    }
    const opens = list.filter((o) => !o.dead && has(rs, o, 'OPEN'));
    const shuts = list.filter((o) => !o.dead && has(rs, o, 'SHUT'));
    while (opens.length && shuts.length) {
      const a = opens.pop(), b = shuts.pop();
      if (a === b) continue;
      a.dead = true; b.dead = true;
      events.push('open');
    }
  }
  state.objs = state.objs.filter((o) => !o.dead);
  return events;
}

function checkWin(state, rs) {
  for (const y of state.objs) {
    if (!has(rs, y, 'YOU')) continue;
    for (const o of state.objs) {
      if (o.x === y.x && o.y === y.y && has(rs, o, 'WIN')) return true;
    }
  }
  return false;
}

/**
 * Advance one turn. dir is 'up' | 'down' | 'left' | 'right' | 'wait'.
 * Returns { state, rules, won, lost, changed, events }.
 */
export function step(prev, dir) {
  const state = cloneState(prev);
  buildIndex(state);
  // Rules depend only on the state, so reuse the ones computed when prev was made.
  let rs = prev.rs || parseRules(state);
  let changed = false;
  state.moveLog = [];

  if (dir !== 'wait') {
    const you = state.objs.filter((o) => has(rs, o, 'YOU'));
    const before = you.map((o) => o.dir);
    if (moveGroup(state, rs, you, dir)) changed = true;
    else if (you.some((o, i) => before[i] !== o.dir)) changed = true;
  }

  // ЕХО: repeats the player's previous move, one turn late.
  if (prev.last && prev.last !== 'wait') {
    const echoes = state.objs.filter((o) => has(rs, o, 'ECHO'));
    if (echoes.length && moveGroup(state, rs, echoes, prev.last)) changed = true;
  }
  flockPass(state, rs);

  // Objects with РУХ walk forward and turn around when blocked.
  state.moveLog = [];
  const movers = state.objs.filter((o) => has(rs, o, 'MOVE'));
  for (const o of movers) {
    const moved = new Set();
    let [dx, dy] = DIRS[o.dir];
    if (canMove(state, rs, o, dx, dy)) { doMove(state, rs, o, dx, dy, o.dir, moved); changed = true; continue; }
    o.dir = OPPOSITE[o.dir];
    [dx, dy] = DIRS[o.dir];
    if (canMove(state, rs, o, dx, dy)) doMove(state, rs, o, dx, dy, o.dir, moved);
    changed = true;
  }
  flockPass(state, rs);

  if (state.textMoved) rs = parseRules(state);
  if (applyTransforms(state, rs)) { changed = true; rs = parseRules(state); }
  const textCount = state.objs.length;
  const events = resolveInteractions(state, rs);
  if (events.length) changed = true;
  if (state.objs.length !== textCount) rs = parseRules(state);

  delete state.grid;
  delete state.textMoved;
  delete state.moveLog;
  // Only real turns count as "the previous move" for ЕХО.
  state.last = changed ? dir : prev.last;
  Object.defineProperty(state, 'rs', { value: rs, enumerable: false });
  const won = checkWin(state, rs);
  const lost = !state.objs.some((o) => has(rs, o, 'YOU'));
  return { state, rules: rs, won, lost, changed, events };
}

/** Human-readable rule lines, e.g. "ЇЖАК ЦЕ ТИ". */
export function describeRules(rs) {
  const grouped = new Map();
  for (const r of rs.rules) {
    if (!grouped.has(r.subject)) grouped.set(r.subject, []);
    const list = grouped.get(r.subject);
    if (!list.includes(r.target)) list.push(r.target);
  }
  return [...grouped].map(([s, ts]) => ({ subject: s, targets: ts }));
}

export function stateKey(state, rs) {
  const key = state.objs
    .map((o) => `${o.kind[0]}${o.name}${o.x},${o.y}${has(rs, o, 'MOVE') ? o.dir : ''}`)
    .sort()
    .join('|');
  // With an ЕХО word on the board, the previous move is part of the state.
  return state.objs.some((o) => o.name === 'ECHO') ? key + '#' + state.last : key;
}

export { NOUN_BY_OBJ };
