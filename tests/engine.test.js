import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLevel, step, parseRules, has } from '../src/engine.js';

const lvl = (...map) => loadLevel({ map });
const find = (s, name) => s.objs.find((o) => o.name === name);
const play = (s, moves) => {
  let r;
  for (const m of moves) { r = step(s, m); s = r.state; }
  return r;
};

test('horizontal and vertical rules are read', () => {
  const s = lvl(
    'H=1..',
    '.....',
    'C....',
    '=....',
    '4....',
  );
  const rs = parseRules(s);
  assert.ok(rs.props.hedgehog.has('YOU'));
  assert.ok(rs.props.crate.has('PUSH'));
});

test('І joins subjects and properties', () => {
  const s = lvl('H&C=1&3');
  const rs = parseRules(s);
  for (const o of ['hedgehog', 'crate']) {
    assert.ok(rs.props[o].has('YOU'));
    assert.ok(rs.props[o].has('STOP'));
  }
});

test('pushing a chain of words moves them all, blocked by STOP', () => {
  const s = lvl(
    'H=1....',
    '.h=4..w',
    'W=3....',
  );
  let r = step(s, 'right');
  assert.equal(find(r.state, 'hedgehog').x, 2);
  r = play(r.state, ['right', 'right', 'right']); // words hit the wall
  assert.equal(find(r.state, 'hedgehog').x, 3);
  assert.equal(r.changed, false);
});

test('pushing ТИ out of its rule loses', () => {
  const s = lvl('...', 'H=1', '..h');
  assert.ok(parseRules(s).props.hedgehog.has('YOU'));
  const r = step(s, 'up');
  assert.equal(r.lost, true);
});

test('reaching ПЕРЕМОГА wins', () => {
  const r = step(lvl('H=1', 'A=2', 'ha.'), 'right');
  assert.equal(r.won, true);
});

test('ВИР destroys itself and what falls in', () => {
  const s = lvl('H=1....', 'V=6C=4.', 'hc~....');
  const r = step(s, 'right');
  assert.equal(find(r.state, 'crate'), undefined);
  assert.equal(find(r.state, 'water'), undefined);
  assert.ok(find(r.state, 'hedgehog'));
});

test('СМЕРТЬ kills ТИ', () => {
  const r = step(lvl('H=1....', 'F=5....', 'hf.....'), 'right');
  assert.equal(r.lost, true);
});

test('ВІДМИЧКА enters ЗАМОК that is СТОП and both vanish', () => {
  const s = lvl('H=1.......', 'K=4&7.....', 'D=8&3.....', 'hkd.......');
  const r = step(s, 'right');
  assert.equal(find(r.state, 'key'), undefined);
  assert.equal(find(r.state, 'door'), undefined);
});

test('noun ЦЕ noun transforms objects', () => {
  const s = lvl('H=1...', 'W=A...', 'h.w...');
  assert.equal(s.objs.filter((o) => o.name === 'wall').length, 0);
  assert.equal(s.objs.filter((o) => o.name === 'apple').length, 1);
});

test('РУХ objects bounce off walls', () => {
  const s = lvl('H=1...', 'X=9...', 'W=3...', 'wx.w.h');
  let r = step(s, 'wait');
  assert.equal(find(r.state, 'fox').x, 2);
  r = step(r.state, 'wait');
  assert.equal(find(r.state, 'fox').x, 1);
  assert.equal(find(r.state, 'fox').dir, 'left');
});

test('text is always pushable', () => {
  const s = lvl('H=1');
  for (const o of s.objs) assert.ok(has(parseRules(s), o, 'PUSH'));
});

test('ЖАР melts ТАНЕ', () => {
  const s = lvl('H=1....', 'F=Z....', 'I=M&4..', 'hif....');
  const r = step(s, 'right');
  assert.equal(find(r.state, 'ice'), undefined);
  assert.ok(find(r.state, 'fire'));
});

test('СЛОВО ЦЕ ТИ moves every word tile', () => {
  const s = lvl('S=1..', '.....');
  const r = step(s, 'down');
  assert.ok(r.state.objs.every((o) => o.y === 1));
});

test('СЛОВО ЦЕ ВИР: words sink what touches them', () => {
  const s = lvl('H=1&4.', 'S=6...', '...h..');
  // hedgehog is also ШТОВХ; walking onto nothing is fine, rules still exist
  assert.ok(parseRules(s).props.__text.has('SINK'));
});

test('words never transform', () => {
  const s = lvl('S=H', 'H=1');
  assert.ok(s.objs.every((o) => o.kind === 'text'));
});

test('extra objects stack and take a direction', () => {
  const s = loadLevel({ map: ['H=1', 'X=9', '.h.'], extra: [['x', 1, 2, 'up'], ['~', 1, 2]] });
  const fox = find(s, 'fox');
  assert.equal(fox.dir, 'up');
  assert.equal(s.objs.filter((o) => o.x === 1 && o.y === 2).length, 3);
});
