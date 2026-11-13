// Canvas renderer: procedural sprites, smooth movement tweening, particles.
import { WORDS, TEXT_OBJ } from './engine.js';

const FONT = '"Rubik", "Segoe UI", system-ui, sans-serif';
const LINES = {
  'ПЕРЕМОГА': ['ПЕРЕ', 'МОГА'],
  'ВІДМИЧКА': ['ВІД', 'МИЧКА'],
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pos = new Map(); // id -> {x, y, face, alpha}
    this.particles = [];
    this.tile = 32;
    this.ox = 0;
    this.oy = 0;
    this.shake = 0;
  }

  resize(state) {
    const parent = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const cw = parent.clientWidth;
    const ch = parent.clientHeight;
    this.canvas.width = Math.floor(cw * dpr);
    this.canvas.height = Math.floor(ch * dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cw = cw;
    this.ch = ch;
    if (state) this.layout(state);
  }

  layout(state) {
    const pad = 12;
    this.tile = Math.max(12, Math.floor(Math.min((this.cw - pad * 2) / state.w, (this.ch - pad * 2) / state.h)));
    this.ox = Math.floor((this.cw - this.tile * state.w) / 2);
    this.oy = Math.floor((this.ch - this.tile * state.h) / 2);
  }

  // Forget tween positions (new level / restart).
  reset(state) {
    this.pos.clear();
    this.particles = [];
    this.sync(state, true);
  }

  // Called after each turn: spawn particles for removed objects, register new ones.
  sync(state, snap = false, prevState = null) {
    const alive = new Set(state.objs.map((o) => o.id));
    if (prevState) {
      for (const o of prevState.objs) {
        if (!alive.has(o.id)) this.burst(o.x, o.y, colorOf(o), 14);
      }
    }
    for (const id of [...this.pos.keys()]) if (!alive.has(id)) this.pos.delete(id);
    for (const o of state.objs) {
      let p = this.pos.get(o.id);
      if (!p || snap) {
        p = { x: o.x, y: o.y, face: o.dir === 'left' ? -1 : 1, alpha: 1, name: o.name };
        this.pos.set(o.id, p);
      }
      if (o.dir === 'left') p.face = -1;
      if (o.dir === 'right') p.face = 1;
      if (p.name !== o.name) { this.burst(o.x, o.y, colorOf(o), 10); p.name = o.name; }
    }
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 3.5;
      this.particles.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
    }
  }

  confetti(state) {
    const colors = ['#ffd84d', '#f78fb3', '#9be15d', '#4aa3df', '#ff8c42'];
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: Math.random() * state.w, y: -Math.random() * 2,
        vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 4,
        life: 2 + Math.random(), color: colors[i % colors.length], confetti: true,
      });
    }
  }

  draw(state, rules, time, dt) {
    const { ctx, tile: t } = this;
    ctx.clearRect(0, 0, this.cw, this.ch);

    // Board
    let sx = 0, sy = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake * 8;
      sy = (Math.random() - 0.5) * this.shake * 8;
      this.shake = Math.max(0, this.shake - dt * 3);
    }
    ctx.save();
    ctx.translate(this.ox + sx, this.oy + sy);
    ctx.fillStyle = cssVar('--board');
    roundRect(ctx, -4, -4, state.w * t + 8, state.h * t + 8, 10);
    ctx.fill();
    ctx.fillStyle = cssVar('--board-dot');
    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) {
        ctx.beginPath();
        ctx.arc(x * t + t / 2, y * t + t / 2, Math.max(1, t * 0.03), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tween
    const k = 1 - Math.exp(-dt * 22);
    for (const o of state.objs) {
      const p = this.pos.get(o.id);
      if (!p) continue;
      p.x += (o.x - p.x) * k;
      p.y += (o.y - p.y) * k;
      if (Math.abs(o.x - p.x) < 0.001) p.x = o.x;
      if (Math.abs(o.y - p.y) < 0.001) p.y = o.y;
    }

    // Draw floor-like objects first, text and actors on top.
    const layer = (o) => (o.kind === 'text' ? 3 : LAYER[o.name] ?? 2);
    const sorted = [...state.objs].sort((a, b) => layer(a) - layer(b));
    for (const o of sorted) {
      const p = this.pos.get(o.id);
      if (!p) continue;
      const px = p.x * t, py = p.y * t;
      const props = rules.props[o.kind === 'text' ? TEXT_OBJ : o.name];
      const you = props?.has('YOU');
      const win = props?.has('WIN');
      if (o.kind === 'text') {
        const active = rules.active.has(o.id);
        p.alpha += ((active ? 1 : 0.42) - p.alpha) * k;
        if (win) glow(ctx, px, py, t);
        const bob = you ? Math.sin(time * 5 + o.id) * t * 0.025 : 0;
        drawText(ctx, WORDS[o.name], px, py + bob, t, p.alpha);
      } else {
        if (win) {
          // soft glow behind anything that is ПЕРЕМОГА
          const g = ctx.createRadialGradient(px + t / 2, py + t / 2, 0, px + t / 2, py + t / 2, t * 0.75);
          g.addColorStop(0, 'rgba(255,216,77,0.35)');
          g.addColorStop(1, 'rgba(255,216,77,0)');
          ctx.fillStyle = g;
          ctx.fillRect(px - t / 2, py - t / 2, t * 2, t * 2);
        }
        const bob = you ? Math.sin(time * 5 + o.id) * t * 0.025 : 0;
        SPRITES[o.name]?.(ctx, px, py + bob, t, time, p.face, o);
      }
    }

    // Particles
    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (!pt.confetti) { pt.vx *= 0.9; pt.vy *= 0.9; }
      pt.life -= dt * (pt.confetti ? 0.6 : 2.2);
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life));
      ctx.fillStyle = pt.color;
      const s = t * (pt.confetti ? 0.14 : 0.1);
      ctx.fillRect(pt.x * t - s / 2, pt.y * t - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    this.particles = this.particles.filter((p) => p.life > 0);
    ctx.restore();
  }

  isAnimating() {
    return this.particles.length > 0;
  }
}

const LAYER = { water: 0, fire: 1, door: 1, wall: 1, tree: 1, ice: 1, rock: 2, crate: 2, apple: 2, key: 2, mushroom: 2, fox: 4, hedgehog: 5 };

function glow(ctx, px, py, t) {
  const g = ctx.createRadialGradient(px + t / 2, py + t / 2, 0, px + t / 2, py + t / 2, t * 0.75);
  g.addColorStop(0, 'rgba(255,216,77,0.35)');
  g.addColorStop(1, 'rgba(255,216,77,0)');
  ctx.fillStyle = g;
  ctx.fillRect(px - t / 2, py - t / 2, t * 2, t * 2);
}

function colorOf(o) {
  if (o.kind === 'text') return WORDS[o.name].color;
  const noun = Object.values(WORDS).find((w) => w.obj === o.name);
  return noun ? noun.color : '#fff';
}

const varCache = new Map();
function cssVar(name) {
  if (!varCache.has(name)) varCache.set(name, getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#222');
  return varCache.get(name);
}
export function clearCssCache() { varCache.clear(); }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawText(ctx, word, x, y, t, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const inset = t * 0.06;
  const isProp = word.kind === 'prop';
  roundRect(ctx, x + inset, y + inset, t - inset * 2, t - inset * 2, t * 0.14);
  ctx.fillStyle = isProp ? word.color : '#14161d';
  ctx.fill();
  if (!isProp) {
    ctx.lineWidth = Math.max(1, t * 0.04);
    ctx.strokeStyle = word.kind === 'noun' ? word.color : 'rgba(255,255,255,0.55)';
    ctx.stroke();
  }
  const lines = LINES[word.label] || [word.label];
  const maxW = t * 0.8;
  let size = t * (lines.length > 1 ? 0.3 : word.label.length <= 2 ? 0.46 : 0.36);
  ctx.font = `800 ${size}px ${FONT}`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  if (widest > maxW) { size *= maxW / widest; ctx.font = `800 ${size}px ${FONT}`; }
  ctx.fillStyle = isProp ? '#17141a' : word.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = size * 1.02;
  lines.forEach((l, i) => {
    ctx.fillText(l, x + t / 2, y + t / 2 + (i - (lines.length - 1) / 2) * lh + size * 0.05);
  });
  ctx.restore();
}

// ---------- sprites ----------
// Each sprite draws inside the tile (x, y, t). `face` is 1 (right) or -1 (left).

const SPRITES = {
  hedgehog(ctx, x, y, t, time, face) {
    ctx.save();
    ctx.translate(x + t / 2, y + t / 2);
    ctx.scale(face, 1);
    const s = t / 100;
    // spikes
    ctx.fillStyle = '#6b4226';
    ctx.beginPath();
    const spikes = 9;
    for (let i = 0; i <= spikes; i++) {
      const a = Math.PI + (i / spikes) * Math.PI * 1.05 - 0.1;
      const r = i % 2 ? 44 : 30;
      ctx.lineTo(Math.cos(a) * r * s - 6 * s, Math.sin(a) * r * s * 0.85 + 10 * s);
    }
    ctx.lineTo(18 * s, 26 * s);
    ctx.lineTo(-34 * s, 26 * s);
    ctx.closePath();
    ctx.fill();
    // body
    ctx.fillStyle = '#8b5a33';
    ctx.beginPath();
    ctx.ellipse(-4 * s, 12 * s, 32 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // face / snout
    ctx.fillStyle = '#f0d2a8';
    ctx.beginPath();
    ctx.moveTo(12 * s, -6 * s);
    ctx.quadraticCurveTo(30 * s, -2 * s, 42 * s, 14 * s);
    ctx.quadraticCurveTo(30 * s, 28 * s, 10 * s, 28 * s);
    ctx.quadraticCurveTo(2 * s, 12 * s, 12 * s, -6 * s);
    ctx.fill();
    // nose, eye
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.arc(42 * s, 13 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    const blink = Math.sin(time * 1.3) > 0.985 ? 0.2 : 1;
    ctx.beginPath(); ctx.ellipse(22 * s, 6 * s, 3.6 * s, 4.2 * s * blink, 0, 0, Math.PI * 2); ctx.fill();
    // cheek
    ctx.fillStyle = 'rgba(247,143,179,0.6)';
    ctx.beginPath(); ctx.arc(24 * s, 18 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    // feet
    ctx.fillStyle = '#4a2e1a';
    ctx.beginPath(); ctx.ellipse(-16 * s, 32 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10 * s, 32 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  wall(ctx, x, y, t) {
    ctx.fillStyle = '#3b4253';
    roundRect(ctx, x + 1, y + 1, t - 2, t - 2, t * 0.08);
    ctx.fill();
    ctx.strokeStyle = '#2a2f3c';
    ctx.lineWidth = Math.max(1, t * 0.05);
    ctx.beginPath();
    ctx.moveTo(x + 2, y + t / 2); ctx.lineTo(x + t - 2, y + t / 2);
    ctx.moveTo(x + t * 0.5, y + 2); ctx.lineTo(x + t * 0.5, y + t / 2);
    ctx.moveTo(x + t * 0.25, y + t / 2); ctx.lineTo(x + t * 0.25, y + t - 2);
    ctx.moveTo(x + t * 0.75, y + t / 2); ctx.lineTo(x + t * 0.75, y + t - 2);
    ctx.stroke();
  },

  crate(ctx, x, y, t) {
    const i = t * 0.12;
    ctx.fillStyle = '#a8743d';
    roundRect(ctx, x + i, y + i, t - i * 2, t - i * 2, t * 0.06);
    ctx.fill();
    ctx.strokeStyle = '#6e4a24';
    ctx.lineWidth = Math.max(1.5, t * 0.07);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + i, y + i); ctx.lineTo(x + t - i, y + t - i);
    ctx.moveTo(x + t - i, y + i); ctx.lineTo(x + i, y + t - i);
    ctx.stroke();
  },

  apple(ctx, x, y, t, time) {
    const s = t / 100, cx = x + t / 2, cy = y + t / 2 + 6 * s + Math.sin(time * 2.5) * 2 * s;
    ctx.fillStyle = '#d93a3f';
    ctx.beginPath();
    ctx.arc(cx - 12 * s, cy, 24 * s, 0, Math.PI * 2);
    ctx.arc(cx + 12 * s, cy, 24 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(cx - 16 * s, cy - 10 * s, 6 * s, 10 * s, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(cx, cy - 18 * s); ctx.quadraticCurveTo(cx + 2 * s, cy - 32 * s, cx + 6 * s, cy - 38 * s); ctx.stroke();
    ctx.fillStyle = '#5cb85c';
    ctx.beginPath(); ctx.ellipse(cx + 16 * s, cy - 32 * s, 12 * s, 6 * s, -0.5, 0, Math.PI * 2); ctx.fill();
  },

  water(ctx, x, y, t, time) {
    ctx.fillStyle = '#1d5a85';
    ctx.fillRect(x, y, t + 0.5, t + 0.5);
    ctx.strokeStyle = 'rgba(160,215,255,0.55)';
    ctx.lineWidth = Math.max(1, t * 0.05);
    for (let r = 0; r < 2; r++) {
      ctx.beginPath();
      const yy = y + t * (0.35 + r * 0.35);
      for (let i = 0; i <= 8; i++) {
        const xx = x + (i / 8) * t;
        const wave = Math.sin(time * 3 + i * 0.9 + r * 2 + x * 0.05) * t * 0.05;
        if (i === 0) ctx.moveTo(xx, yy + wave); else ctx.lineTo(xx, yy + wave);
      }
      ctx.stroke();
    }
  },

  fire(ctx, x, y, t, time) {
    const s = t / 100;
    const flame = (cx, h, w, color, ph) => {
      const f = 1 + Math.sin(time * 9 + ph) * 0.1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, y + t - (12 + h * f) * s);
      ctx.quadraticCurveTo(cx + w * s, y + t - 30 * s, cx, y + t - 10 * s);
      ctx.quadraticCurveTo(cx - w * s, y + t - 30 * s, cx, y + t - (12 + h * f) * s);
      ctx.fill();
    };
    ctx.fillStyle = 'rgba(255,90,20,0.18)';
    ctx.fillRect(x, y, t, t);
    flame(x + 30 * s, 55, 22, '#ff5a1f', x);
    flame(x + 70 * s, 50, 22, '#ff5a1f', x + 2);
    flame(x + 50 * s, 75, 28, '#ff8c1a', x + 1);
    flame(x + 50 * s, 45, 16, '#ffd84d', x + 3);
  },

  key(ctx, x, y, t) {
    const s = t / 100;
    ctx.save();
    ctx.translate(x + t / 2, y + t / 2);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#f2c94c';
    ctx.strokeStyle = '#a07d1c';
    ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.arc(-22 * s, 0, 16 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#14161d';
    ctx.beginPath(); ctx.arc(-22 * s, 0, 6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(-8 * s, -5 * s, 44 * s, 10 * s);
    ctx.fillRect(22 * s, 5 * s, 7 * s, 12 * s);
    ctx.fillRect(32 * s, 5 * s, 5 * s, 8 * s);
    ctx.restore();
  },

  door(ctx, x, y, t) {
    const s = t / 100;
    ctx.fillStyle = '#7a4a2a';
    ctx.beginPath();
    ctx.moveTo(x + 14 * s, y + t - 4 * s);
    ctx.lineTo(x + 14 * s, y + 40 * s);
    ctx.arc(x + t / 2, y + 40 * s, 36 * s, Math.PI, 0);
    ctx.lineTo(x + 86 * s, y + t - 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4e2e19';
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 38 * s, y + 10 * s); ctx.lineTo(x + 38 * s, y + t - 4 * s);
    ctx.moveTo(x + 62 * s, y + 10 * s); ctx.lineTo(x + 62 * s, y + t - 4 * s);
    ctx.stroke();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath(); ctx.arc(x + 70 * s, y + 60 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#14161d';
    ctx.fillRect(x + 68 * s, y + 63 * s, 4 * s, 9 * s);
  },

  tree(ctx, x, y, t) {
    const s = t / 100;
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x + 44 * s, y + 60 * s, 12 * s, 34 * s);
    ctx.fillStyle = '#2f7d3a';
    ctx.beginPath();
    ctx.arc(x + 50 * s, y + 40 * s, 30 * s, 0, Math.PI * 2);
    ctx.arc(x + 30 * s, y + 55 * s, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 70 * s, y + 55 * s, 20 * s, 0, Math.PI * 2);
    ctx.fill();
  },

  rock(ctx, x, y, t) {
    const s = t / 100;
    ctx.fillStyle = '#8c8780';
    ctx.beginPath();
    ctx.moveTo(x + 14 * s, y + 80 * s);
    ctx.lineTo(x + 22 * s, y + 40 * s);
    ctx.lineTo(x + 46 * s, y + 20 * s);
    ctx.lineTo(x + 76 * s, y + 30 * s);
    ctx.lineTo(x + 88 * s, y + 70 * s);
    ctx.lineTo(x + 70 * s, y + 86 * s);
    ctx.lineTo(x + 30 * s, y + 88 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(x + 44 * s, y + 38 * s, 12 * s, 6 * s, -0.4, 0, Math.PI * 2); ctx.fill();
  },

  ice(ctx, x, y, t, time) {
    const i = t * 0.06;
    const g = ctx.createLinearGradient(x, y, x + t, y + t);
    g.addColorStop(0, '#d8f6ff');
    g.addColorStop(1, '#7cc6e6');
    ctx.fillStyle = g;
    roundRect(ctx, x + i, y + i, t - i * 2, t - i * 2, t * 0.12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, t * 0.04);
    ctx.beginPath();
    ctx.moveTo(x + t * 0.22, y + t * 0.3); ctx.lineTo(x + t * 0.4, y + t * 0.18);
    ctx.moveTo(x + t * 0.22, y + t * 0.5); ctx.lineTo(x + t * 0.6, y + t * 0.22);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,110,150,0.5)';
    ctx.beginPath();
    ctx.moveTo(x + t * 0.55, y + t * 0.85); ctx.lineTo(x + t * 0.68, y + t * 0.6); ctx.lineTo(x + t * 0.82, y + t * 0.66);
    ctx.stroke();
    const sp = (Math.sin(time * 2 + x) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + sp * 0.5})`;
    ctx.beginPath(); ctx.arc(x + t * 0.75, y + t * 0.28, t * 0.04, 0, Math.PI * 2); ctx.fill();
  },

  mushroom(ctx, x, y, t) {
    const s = t / 100;
    ctx.fillStyle = '#f3e3c8';
    roundRect(ctx, x + 40 * s, y + 48 * s, 20 * s, 38 * s, 6 * s);
    ctx.fill();
    ctx.fillStyle = '#c94a8a';
    ctx.beginPath();
    ctx.moveTo(x + 14 * s, y + 54 * s);
    ctx.quadraticCurveTo(x + 18 * s, y + 14 * s, x + 50 * s, y + 14 * s);
    ctx.quadraticCurveTo(x + 82 * s, y + 14 * s, x + 86 * s, y + 54 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff2fa';
    for (const [cx, cy, r] of [[34, 34, 6], [56, 26, 5], [68, 42, 6], [46, 46, 4]]) {
      ctx.beginPath(); ctx.arc(x + cx * s, y + cy * s, r * s, 0, Math.PI * 2); ctx.fill();
    }
  },

  fox(ctx, x, y, t, time, face) {
    const s = t / 100;
    ctx.save();
    ctx.translate(x + t / 2, y + t / 2 + Math.sin(time * 8) * 1.5 * s);
    ctx.scale(face, 1);
    // tail
    ctx.fillStyle = '#e8762c';
    ctx.beginPath(); ctx.ellipse(-30 * s, 14 * s, 18 * s, 9 * s, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3e6';
    ctx.beginPath(); ctx.arc(-44 * s, 6 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = '#ff8c42';
    ctx.beginPath();
    ctx.moveTo(-18 * s, -28 * s);
    ctx.lineTo(-6 * s, -10 * s);
    ctx.lineTo(16 * s, -10 * s);
    ctx.lineTo(26 * s, -28 * s);
    ctx.lineTo(34 * s, 0);
    ctx.lineTo(42 * s, 16 * s);
    ctx.lineTo(4 * s, 34 * s);
    ctx.lineTo(-24 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3e6';
    ctx.beginPath();
    ctx.moveTo(42 * s, 16 * s); ctx.lineTo(4 * s, 34 * s); ctx.lineTo(10 * s, 14 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.arc(42 * s, 16 * s, 4.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16 * s, 2 * s, 3.5 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
};
