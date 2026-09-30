// Kiss catcher: catch falling hearts and kisses with your face, dodge broken hearts.
// Plain DOM + requestAnimationFrame. Scores go to the shared `scores` table.
import { db, requireMember } from './db.js';
import { ambient, burst, pick, rand, toast } from './fx.js';
import { characterSVG } from './characters.js';

const GAME = 'kiss-catcher';
const LIVES = 3;
const ITEM = 34;          // emoji size in px
const HEAD_H = 62;        // catch zone: the top of the character, its face
const CATCH_HALF = 46;    // half-width of the catch zone
const RAMP_S = 90;        // seconds until the game is at full speed

// kind -> emoji, points, spawn weight
const KINDS = {
  heart:  { emoji: '💖', points: 1, weight: 58 },
  kiss:   { emoji: '💋', points: 3, weight: 17 },
  cat:    { emoji: '🐱', points: 5, weight: 4 },
  broken: { emoji: '💔', points: 0, weight: 21 },
};

const $ = (id) => document.getElementById(id);
const arena = $('arena');
const itemsBox = $('items');
const playerEl = $('player');
const overlay = $('overlay');

/** Tiny DOM helper: all text goes in via textContent, never innerHTML. */
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

ambient(6);

let me;
let them = null;
let names = {};
let board = []; // every score row: { author_id, score }

// ---------- state ----------

let W = 0;
let H = 0;
let state = null;   // null = not playing
let raf = 0;
let last = 0;
const keys = { left: false, right: false };
let pointerX = null; // arena-relative x while the pointer is steering
let charSvg;

const measure = () => { W = arena.clientWidth; H = arena.clientHeight; };
window.addEventListener('resize', measure);

// ---------- HUD ----------

function paintHud() {
  $('score').textContent = state.score;
  $('lives').textContent = '💖'.repeat(state.lives) + '🖤'.repeat(LIVES - state.lives);
  const mult = multiplier();
  $('mult').hidden = mult < 2;
  $('mult').textContent = `x${mult}`;
}
const multiplier = () => Math.min(4, 1 + Math.floor(state.streak / 5));

function face(eyes, mouth, ms = 450) {
  if (!charSvg) return;
  charSvg.dataset.eyes = eyes;
  charSvg.dataset.mouth = mouth;
  clearTimeout(face.t);
  face.t = setTimeout(() => { charSvg.dataset.eyes = 'normal'; charSvg.dataset.mouth = 'smile'; }, ms);
}

// ---------- scores ----------

const bestOf = (authorId) => board.filter((r) => r.author_id === authorId).reduce((m, r) => Math.max(m, r.score), 0);

async function loadBoard() {
  const { data } = await db.from('scores').select('author_id, score').eq('game', GAME).order('score', { ascending: false }).limit(200);
  board = data ?? [];
}

function boardList() {
  const list = el('ul', 'board');
  for (const r of board.slice(0, 5)) {
    const li = el('li', r.author_id === me.id ? 'is-me' : '');
    li.append(el('span', '', names[r.author_id] ?? '?'), el('span', '', String(r.score)));
    list.append(li);
  }
  return list;
}

// ---------- overlay screens ----------

function showStart() {
  overlay.replaceChildren();
  overlay.append(el('h1', 'overlay__title', 'kiss catcher'));
  overlay.append(el('p', 'overlay__line', 'catch 💖 💋 🐱 with your face. dodge 💔. three lives. catch five in a row to build a multiplier.'));
  const mine = bestOf(me.id);
  const theirs = them ? bestOf(them.id) : 0;
  const line = el('p', 'overlay__line');
  line.append('your best ', el('strong', '', String(mine)));
  if (them) line.append(` · ${them.nickname}'s best `, el('strong', '', String(theirs)));
  overlay.append(line);
  if (board.length) { overlay.append(el('p', 'board__title', 'top scores'), boardList()); }
  const go = el('button', 'btn', 'play 💋');
  go.type = 'button';
  go.addEventListener('click', start);
  overlay.append(go);
  overlay.hidden = false;
  go.focus();
}

function showPaused() {
  overlay.replaceChildren();
  overlay.append(el('h1', 'overlay__title', 'paused'));
  const go = el('button', 'btn', 'keep going');
  go.type = 'button';
  go.addEventListener('click', resume);
  overlay.append(go);
  overlay.hidden = false;
}

function showOver(s, prevBest) {
  overlay.replaceChildren();
  overlay.append(el('h1', 'overlay__title', 'game over'));
  overlay.append(el('p', 'overlay__big', String(s.score)));
  if (s.score > prevBest && s.score > 0) overlay.append(el('p', 'overlay__new', 'new personal best! 🎉'));
  const theirs = them ? bestOf(them.id) : 0;
  if (them && theirs) {
    overlay.append(el('p', 'overlay__line', s.score > theirs ? `you beat ${them.nickname}'s best of ${theirs} 😏` : `${them.nickname}'s best is ${theirs}. can you beat it?`));
  }
  overlay.append(el('p', 'overlay__line', `${s.caught} caught · best streak ${s.bestStreak}`));
  overlay.append(el('p', 'board__title', 'top scores'), boardList());
  const again = el('button', 'btn', 'play again');
  again.type = 'button';
  again.addEventListener('click', start);
  overlay.append(again);
  overlay.hidden = false;
  again.focus();
}

// ---------- the game ----------

function start() {
  measure();
  itemsBox.replaceChildren();
  state = {
    score: 0, lives: LIVES, streak: 0, bestStreak: 0, caught: 0,
    elapsed: 0, spawnIn: 0.6, items: [], paused: false,
    x: W / 2,
  };
  overlay.hidden = true;
  paintHud();
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

function pause() {
  if (!state || state.paused) return;
  state.paused = true;
  showPaused();
}
function resume() {
  if (!state || !state.paused) return;
  state.paused = false;
  overlay.hidden = true;
  last = performance.now();
}

function frame(now) {
  if (!state) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.paused) update(dt);
  raf = requestAnimationFrame(frame);
}

function pickKind(d) {
  const weights = { ...Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.weight])) };
  weights.broken += 12 * d; // more heartbreak later
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [k, w] of Object.entries(weights)) { if ((roll -= w) < 0) return k; }
  return 'heart';
}

function spawn(d) {
  const kind = pickKind(d);
  const node = el('span', `item item--${kind}`, KINDS[kind].emoji);
  itemsBox.append(node);
  state.items.push({ node, kind, x: rand(ITEM, W - ITEM), y: -ITEM, rot: rand(-20, 20), spin: rand(-40, 40), speedMul: rand(0.9, 1.15) });
}

function update(dt) {
  const s = state;
  s.elapsed += dt;
  const d = Math.min(1, s.elapsed / RAMP_S);
  const fall = H * (0.34 + 0.5 * d);          // px per second
  const gap = 0.95 - 0.6 * d;                 // seconds between spawns

  // steering: keys win, otherwise follow the pointer
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (dir) { s.x += dir * W * 0.95 * dt; pointerX = null; }
  else if (pointerX != null) s.x += (pointerX - s.x) * Math.min(1, dt * 20);
  s.x = Math.max(CATCH_HALF * 0.6, Math.min(W - CATCH_HALF * 0.6, s.x));
  const px = s.x - playerEl.offsetWidth / 2;
  playerEl.style.setProperty('--pos', `translateX(${px}px)`);
  playerEl.style.transform = `translateX(${px}px)`;

  // spawning
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) { spawn(d); s.spawnIn = gap * rand(0.8, 1.25); }

  // moving + catching
  const headTop = H - playerEl.offsetHeight - 6;
  const headBottom = headTop + HEAD_H;
  for (const it of s.items) {
    it.y += fall * it.speedMul * dt;
    it.rot += it.spin * dt;
    it.node.style.transform = `translate(${it.x - ITEM / 2}px, ${it.y - ITEM / 2}px) rotate(${it.rot}deg)`;

    const cy = it.y;
    if (cy >= headTop && cy <= headBottom && Math.abs(it.x - s.x) < CATCH_HALF) {
      it.done = true;
      caught(it);
    } else if (cy > H + ITEM) {
      it.done = true;
      if (it.kind !== 'broken' && s.streak) { s.streak = 0; paintHud(); } // a missed kiss breaks the streak
    }
  }
  s.items = s.items.filter((it) => { if (it.done) it.node.remove(); return !it.done; });

  if (s.lives <= 0) end();
}

function popText(text, x, y, cls = '') {
  const p = el('span', `pop ${cls}`, text);
  p.style.left = `${x - 14}px`;
  p.style.top = `${y - 20}px`;
  arena.append(p);
  p.addEventListener('animationend', () => p.remove());
}

function caught(it) {
  const s = state;
  const r = arena.getBoundingClientRect();
  if (it.kind === 'broken') {
    s.lives -= 1;
    s.streak = 0;
    face('surprised', 'o', 600);
    popText('💔 -1', it.x, it.y, 'pop--bad');
    arena.classList.remove('is-hurt');
    void arena.offsetWidth;
    arena.classList.add('is-hurt');
  } else {
    s.caught += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    const pts = KINDS[it.kind].points * multiplier();
    s.score += pts;
    face(s.streak >= 5 ? 'hearts' : 'happy', 'grin');
    popText(`+${pts}`, it.x, it.y);
    burst(r.left + it.x, r.top + it.y, { count: it.kind === 'cat' ? 10 : 5, spread: 70, items: [KINDS[it.kind].emoji, '💖', '✨'] });
    playerEl.classList.remove('is-catch');
    void playerEl.offsetWidth;
    playerEl.classList.add('is-catch');
  }
  paintHud();
}

async function end() {
  const s = state;
  state = null;
  cancelAnimationFrame(raf);
  const prevBest = bestOf(me.id);
  if (s.score > 0) {
    const { error } = await db.from('scores').insert({
      game: GAME, score: s.score, meta: { caught: s.caught, bestStreak: s.bestStreak, seconds: Math.round(s.elapsed) },
    });
    if (error) { console.error(error); toast("couldn't save that score 😢"); }
    else board = [{ author_id: me.id, score: s.score }, ...board].sort((a, b) => b.score - a.score);
  }
  showOver(s, prevBest);
}

// ---------- input ----------

const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };

window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; if (state) e.preventDefault(); return; }
  if (e.key === 'p' || e.key === 'P') { state?.paused ? resume() : pause(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && !state && !overlay.hidden) { e.preventDefault(); start(); }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });
window.addEventListener('blur', () => { keys.left = keys.right = false; pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

arena.addEventListener('pointermove', (e) => {
  if (!state || state.paused) return;
  pointerX = e.clientX - arena.getBoundingClientRect().left;
});
arena.addEventListener('pointerdown', (e) => {
  if (!state || state.paused) return;
  pointerX = e.clientX - arena.getBoundingClientRect().left;
});

// ---------- boot ----------

async function boot() {
  me = await requireMember();
  const { data: profiles } = await db.from('profiles').select('id, nickname');
  names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.nickname]));
  them = (profiles ?? []).find((p) => p.id !== me.id) ?? null;

  playerEl.innerHTML = characterSVG(me.role === 'her' ? 'her' : 'him');
  charSvg = playerEl.querySelector('svg');
  measure();

  await loadBoard();
  showStart();
}

boot().catch((err) => {
  console.error(err);
  overlay.replaceChildren(el('p', 'overlay__line', `couldn't connect: ${err.message ?? err}`));
});
