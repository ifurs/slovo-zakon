import { loadLevel, step, parseRules, describeRules, WORDS } from './engine.js';
import { LEVELS, CHAPTERS } from './levels.js';
import { Renderer, clearCssCache } from './render.js';
import { sfx, setMuted, isMuted } from './sound.js';

const $ = (sel) => document.querySelector(sel);
const canvas = $('#board');
const renderer = new Renderer(canvas);

const STORE_KEY = 'slovo-zakon:v2'; // progress keyed by level name
const OLD_STORE_KEY = 'slovo-zakon:v1'; // v1 stored indices of the first 17 levels
const progress = loadProgress();

let game = null; // { index, initial, state, rules, history, won, lost }

// ---------- persistence ----------

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { done: new Set(p.done || []), muted: !!p.muted };
    }
    const old = JSON.parse(localStorage.getItem(OLD_STORE_KEY) || '{}');
    const first = CHAPTERS[0].levels;
    return { done: new Set((old.done || []).map((i) => first[i]?.name).filter(Boolean)), muted: !!old.muted };
  } catch {
    return { done: new Set(), muted: false };
  }
}
function saveProgress() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ done: [...progress.done], muted: isMuted() }));
  } catch { /* storage unavailable — progress lives for this session only */ }
}
setMuted(progress.muted);

// ---------- game flow ----------

function startLevel(index) {
  const level = LEVELS[index];
  const initial = loadLevel(level);
  game = { index, initial, state: initial, rules: parseRules(initial), history: [], won: false, lost: false };
  renderer.layout(game.state);
  renderer.reset(game.state);
  const chapter = CHAPTERS[level.chapter];
  $('#level-num').textContent = `Розділ ${level.chapter + 1} «${chapter.name}» · ${level.inChapter + 1} / ${chapter.levels.length}`;
  $('#level-name').textContent = level.name;
  $('#hint').textContent = level.hint;
  hideBanner();
  showMenu(false);
  updateRules();
}

function turn(dir) {
  if (!game || game.won || game.lost) return;
  const prev = game.state;
  const r = step(prev, dir);
  if (!r.changed) { if (dir !== 'wait') sfx('bump'); return; }
  game.history.push(prev);
  game.state = r.state;
  game.rules = r.rules;
  renderer.sync(game.state, false, prev);

  const rulesBefore = ruleSignature(parseRules(prev));
  const rulesAfter = ruleSignature(r.rules);
  if (r.events.includes('boom')) { sfx('boom'); renderer.shake = 1; }
  else if (r.events.length) { sfx('poof'); renderer.shake = 0.4; }
  else if (rulesBefore !== rulesAfter) sfx('rule');
  else sfx('step');

  updateRules();
  game.lost = r.lost;
  if (r.won) win();
  else if (r.lost) showBanner('lost');
  else hideBanner();
}

function undo() {
  if (!game || !game.history.length) return;
  game.state = game.history.pop();
  game.rules = parseRules(game.state);
  game.won = false;
  game.lost = false;
  renderer.sync(game.state);
  hideBanner();
  updateRules();
  sfx('undo');
}

function restart() {
  if (!game) return;
  if (game.state !== game.initial) game.history.push(game.state);
  game.state = game.initial;
  game.rules = parseRules(game.state);
  game.won = false;
  game.lost = false;
  renderer.reset(game.state);
  hideBanner();
  updateRules();
  sfx('undo');
}

function win() {
  game.won = true;
  progress.done.add(LEVELS[game.index].name);
  saveProgress();
  sfx('win');
  renderer.confetti(game.state);
  setTimeout(() => { if (game?.won) showBanner('won'); }, 450);
}

function next() {
  if (!game) return;
  if (game.index + 1 < LEVELS.length) startLevel(game.index + 1);
  else showMenu(true);
}

function ruleSignature(rs) {
  return rs.rules.map((r) => r.subject + '>' + r.target).sort().join(',');
}

// ---------- UI ----------

function chip(key) {
  const w = WORDS[key];
  const el = document.createElement('span');
  el.className = `chip chip-${w.kind}`;
  el.style.setProperty('--c', w.color);
  el.textContent = w.label;
  return el;
}

function updateRules() {
  const list = $('#rules');
  list.replaceChildren();
  const rules = describeRules(game.rules);
  if (!rules.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'Жодного правила';
    list.append(li);
    return;
  }
  for (const r of rules) {
    const li = document.createElement('li');
    li.append(chip(r.subject), chip('IS'));
    r.targets.forEach((tg, i) => {
      if (i) li.append(chip('AND'));
      li.append(chip(tg));
    });
    list.append(li);
  }
}

function showBanner(kind) {
  const b = $('#banner');
  b.hidden = false;
  b.dataset.kind = kind;
  const last = game.index + 1 >= LEVELS.length;
  if (kind === 'won') {
    b.innerHTML = `
      <h2>Рівень пройдено!</h2>
      <p>${last ? 'Це був останній рівень. Чудова робота!' : `Ходів: ${game.history.length}`}</p>
      <div class="row">
        <button class="btn primary" data-act="next">${last ? 'До меню' : 'Далі →'}</button>
        <button class="btn" data-act="undo">Скасувати хід</button>
      </div>
      <small>Enter — далі</small>`;
    b.querySelector('[data-act=next]').focus({ preventScroll: true });
  } else {
    b.innerHTML = `
      <h2>Нікого немає під правилом «ТИ»</h2>
      <p>Скасуй хід або почни рівень заново.</p>
      <div class="row">
        <button class="btn primary" data-act="undo">Скасувати (Z)</button>
        <button class="btn" data-act="restart">Заново (R)</button>
      </div>`;
  }
}
function hideBanner() { $('#banner').hidden = true; }

const doneIn = (c) => CHAPTERS[c].levels.filter((l) => progress.done.has(l.name)).length;

// A chapter opens when ~70% of the previous one is solved; inside a chapter you may
// skip ahead up to two unsolved levels.
function isUnlocked(level) {
  const c = level.chapter;
  if (c > 0 && doneIn(c - 1) < Math.ceil(CHAPTERS[c - 1].levels.length * 0.7)) return false;
  return level.inChapter < doneIn(c) + 3;
}

function showMenu(open) {
  const menu = $('#menu');
  menu.hidden = !open;
  if (!open) return;
  const grid = $('#level-grid');
  grid.replaceChildren();
  CHAPTERS.forEach((chapter, ci) => {
    const head = document.createElement('h3');
    head.className = 'chapter-head';
    const title = document.createElement('span');
    title.textContent = `Розділ ${ci + 1}. ${chapter.name}`;
    const count = document.createElement('small');
    count.textContent = `${doneIn(ci)} / ${chapter.levels.length}`;
    head.append(title, count);
    grid.append(head);
    const row = document.createElement('div');
    row.className = 'level-row';
    grid.append(row);
    LEVELS.forEach((lvl, i) => {
      if (lvl.chapter !== ci) return;
      const b = document.createElement('button');
      b.className = 'level-card';
      const locked = !isUnlocked(lvl);
      b.disabled = locked;
      if (progress.done.has(lvl.name)) b.classList.add('done');
      if (game && game.index === i) b.classList.add('current');
      const num = document.createElement('span');
      num.className = 'n';
      num.textContent = locked ? '🔒' : lvl.inChapter + 1;
      const name = document.createElement('span');
      name.className = 't';
      name.textContent = lvl.name;
      b.append(num, name);
      b.addEventListener('click', () => startLevel(i));
      row.append(b);
    });
  });
  $('#menu-close').hidden = !game;
  const first = grid.querySelector('.current') || grid.querySelector('button:not(:disabled):not(.done)') || grid.querySelector('button');
  first?.focus({ preventScroll: true });
  first?.scrollIntoView({ block: 'center' });
}

// ---------- input ----------

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'wait',
};
let lastKeyTime = 0;

window.addEventListener('keydown', (e) => {
  if (!$('#menu').hidden) {
    if (e.code === 'Escape' && game) { showMenu(false); e.preventDefault(); }
    return;
  }
  if (game?.won && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) {
    e.preventDefault(); next(); return;
  }
  const dir = KEYMAP[e.code];
  if (dir) {
    e.preventDefault();
    const now = performance.now();
    if (e.repeat && now - lastKeyTime < 110) return;
    lastKeyTime = now;
    turn(dir);
    return;
  }
  if (e.code === 'KeyZ' || e.code === 'Backspace') {
    e.preventDefault();
    const now = performance.now();
    if (e.repeat && now - lastKeyTime < 70) return;
    lastKeyTime = now;
    undo();
  } else if (e.code === 'KeyR') { e.preventDefault(); restart(); }
  else if (e.code === 'Escape') { e.preventDefault(); showMenu(true); }
  else if (e.code === 'KeyM') { toggleMute(); }
});

// swipe on the board
let touchStart = null;
canvas.addEventListener('pointerdown', (e) => { touchStart = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});

canvas.addEventListener('pointercancel', () => { touchStart = null; });

// On-screen buttons. Moves and undo fire on press and repeat while held;
// their click (which follows the press) is ignored unless it came from the keyboard.
function press(el) {
  if (el.dataset.dir) turn(el.dataset.dir);
  else if (el.dataset.act === 'undo') undo();
}
let holdTimer = null;
function stopHold() {
  clearTimeout(holdTimer);
  holdTimer = null;
  document.querySelectorAll('.dpad .held').forEach((b) => b.classList.remove('held'));
}
document.querySelectorAll('.dpad .rep').forEach((el) => {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.setPointerCapture?.(e.pointerId);
    stopHold();
    el.classList.add('held');
    press(el);
    const repeat = (delay) => { holdTimer = setTimeout(() => { press(el); repeat(140); }, delay); };
    repeat(380);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, stopHold);
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act], [data-dir]');
  if (!el) return;
  if (el.classList.contains('rep')) { if (e.detail === 0) press(el); return; }
  if (el.dataset.dir) { turn(el.dataset.dir); return; }
  // The on-screen restart asks for a second tap, so a stray touch doesn't wipe the level.
  if (el.classList.contains('needs-confirm') && !el.classList.contains('armed')) {
    el.classList.add('armed');
    el.querySelector('small').textContent = 'ще раз';
    clearTimeout(el._disarm);
    el._disarm = setTimeout(() => disarm(el), 2500);
    return;
  }
  if (el.classList.contains('armed')) disarm(el);
  const act = el.dataset.act;
  if (act === 'install') { installApp(); return; }
  if (act === 'undo') undo();
  else if (act === 'restart') restart();
  else if (act === 'menu') showMenu(true);
  else if (act === 'next') next();
  else if (act === 'mute') toggleMute();
  else if (act === 'close-menu') showMenu(false);
});

function disarm(el) {
  clearTimeout(el._disarm);
  el.classList.remove('armed');
  el.querySelector('small').textContent = 'заново';
}

function toggleMute() {
  setMuted(!isMuted());
  saveProgress();
  updateMuteButton();
}
function updateMuteButton() {
  const b = $('#mute');
  b.textContent = isMuted() ? '🔇' : '🔊';
  b.title = isMuted() ? 'Увімкнути звук (M)' : 'Вимкнути звук (M)';
}

// ---------- loop ----------

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (game) renderer.draw(game.state, game.rules, now / 1000, dt);
  requestAnimationFrame(frame);
}

function onResize() {
  renderer.resize(game?.state);
}
window.addEventListener('resize', onResize);
// The board area also changes size when the hint or rule list changes length (phone layout).
if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvas.parentElement);

// ---------- install / offline ----------

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $('#install').hidden = false;
});
window.addEventListener('appinstalled', () => { installPrompt = null; $('#install').hidden = true; });
async function installApp() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => null);
  installPrompt = null;
  $('#install').hidden = true;
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => clearCssCache());

async function boot() {
  try { await document.fonts.load('800 20px "Rubik"', 'ЇЖАК ЦЕ ТИ'); } catch { /* fallback font */ }
  updateMuteButton();
  renderer.resize();
  const firstUnfinished = LEVELS.findIndex((l) => !progress.done.has(l.name) && isUnlocked(l));
  startLevel(firstUnfinished === -1 ? 0 : firstUnfinished);
  if (progress.done.size) showMenu(true);
  requestAnimationFrame(frame);
}
boot();

// Exposed for debugging in the console.
window.__game = () => game;
