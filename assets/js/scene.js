// Mascots: the two of them living in the page background. They share one
// horizontal lane that moves to a random height every now and then (they walk
// off-screen, the lane moves, they walk back in).
//
//   const scene = startScene();          // auto-plays calm scenes
//   scene.play('kiss');                  // or trigger one by name
//   scene.celebrate();                   // quick cheer (e.g. tax paid)
//
// Scenes: walk, chase, kiss, toss, peekaboo, hug (+ 'move' to change lanes).
import { characterSVG, VIEWBOX } from './characters.js';
import { burst, pick, rand } from './fx.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const NEUTRAL = { eyes: 'normal', mouth: 'smile', blush: 0.45, flustered: false };

// Offsets between the two actors (in SVG units, converted to px by scale).
// Derived from limb pivots in characters.js / poses in characters.css.
const HOLD_GAP = 152; // her.x - him.x when holding hands
const KISS_GAP = 72;  // her.x - him.x when she kisses his cheek (him leaning 8deg)
const KISS_HOP = 76;  // how high she hops to reach his cheek
const HUG_GAP = 100;  // distance between them in a hug

export class Actor {
  constructor(who, stage, height) {
    this.who = who;
    this.s = height / VIEWBOX.h;
    this.w = VIEWBOX.w * this.s;
    this.x = 0;
    this.poses = new Set();

    this.el = document.createElement('div');
    this.el.className = `actor actor--${who}`;
    this.el.style.width = `${this.w}px`;
    this.el.style.height = `${height}px`;
    this.el.innerHTML = `<div class="actor__hop"><div class="actor__pose"><div class="actor__gait">${characterSVG(who)}</div></div></div>`;
    this.svg = this.el.querySelector('svg');
    this.hopEl = this.el.querySelector('.actor__hop');
    this.poseEl = this.el.querySelector('.actor__pose');
    stage.append(this.el);
  }

  place(x) {
    this.x = x;
    this.el.style.transform = `translateX(${x}px)`;
  }

  gait(name) {
    this.el.classList.toggle('is-walk', name === 'walk');
    this.el.classList.toggle('is-run', name === 'run');
  }

  /** Walk/run to x at `speed` px/s. Looks where it's going unless `look` is given. */
  moveTo(x, { speed = 55, gait = 'walk', look } = {}) {
    const dir = Math.sign(x - this.x);
    if (!dir) return Promise.resolve();
    this.look(look ?? dir * 4);
    this.gait(gait);
    return new Promise((resolve) => {
      let last = performance.now();
      const step = (now) => {
        const dt = Math.min(50, now - last) / 1000;
        last = now;
        const left = x - this.x;
        if (Math.abs(left) <= speed * dt) {
          this.place(x);
          this.gait(null);
          resolve();
          return;
        }
        this.place(this.x + Math.sign(left) * speed * dt);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  look(x = 0, y = 0) {
    this.svg.style.setProperty('--lx', `${x}px`);
    this.svg.style.setProperty('--ly', `${y}px`);
  }

  lookAt(other) {
    this.look(Math.sign(other.x - this.x) * 4);
  }

  expr({ eyes, mouth, blush, flustered } = {}) {
    if (eyes) this.svg.dataset.eyes = eyes;
    if (mouth) this.svg.dataset.mouth = mouth;
    if (blush != null) this.svg.style.setProperty('--blush', blush);
    if (flustered != null) this.svg.classList.toggle('flustered', flustered);
  }

  pose(name, on = true) {
    this.el.classList.toggle(`pose-${name}`, on);
    on ? this.poses.add(name) : this.poses.delete(name);
  }

  lean(deg) {
    this.poseEl.style.transform = deg ? `rotate(${deg}deg)` : '';
  }

  hop(height = 16, duration = 420) {
    return this.hopEl.animate(
      [
        { transform: 'translateY(0)', easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: `translateY(${-height}px)`, offset: 0.45 },
        { transform: `translateY(${-height}px)`, offset: 0.55, easing: 'cubic-bezier(.6,0,.8,.3)' },
        { transform: 'translateY(0)' },
      ],
      { duration },
    ).finished;
  }

  squish() {
    return this.hopEl.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.08, .92)' }, { transform: 'scale(.97, 1.04)' }, { transform: 'scale(1)' }],
      { duration: 500, easing: 'ease-out' },
    ).finished;
  }

  /** Floating emoji or text bubble. left/top are % of the actor box. */
  emote(content, { text = false, left, top } = {}) {
    const e = document.createElement('span');
    e.className = `emote${text ? ' emote--text' : ''}`;
    e.textContent = content;
    if (left) e.style.left = left;
    if (top) { e.style.top = top; e.style.bottom = 'auto'; }
    e.addEventListener('animationend', () => e.remove());
    this.el.append(e);
  }

  /** Screen position of a point given in % of the actor box. */
  point(px = 0.5, py = 0.3) {
    const r = this.el.getBoundingClientRect();
    return { x: r.left + r.width * px, y: r.top + r.height * py };
  }

  reset() {
    this.expr(NEUTRAL);
    this.look();
    this.lean(0);
    this.gait(null);
    [...this.poses].forEach((p) => this.pose(p, false));
  }
}

export function startScene({ auto = true, height = 170 } = {}) {
  const stage = document.createElement('div');
  stage.className = 'mascots';
  stage.setAttribute('aria-hidden', 'true');
  stage.style.height = `${height + 80}px`; // room for hops and emotes
  document.body.append(stage);
  document.body.classList.add('has-mascots');

  const him = new Actor('him', stage, height);
  const her = new Actor('her', stage, height);
  const S = him.s;
  const w = him.w;
  const M = 16;
  const W = () => stage.clientWidth;
  const maxX = () => W() - w - M;
  const both = (fn) => Promise.all([fn(him), fn(her)]);

  function randomLane() {
    const max = Math.max(0, innerHeight - stage.offsetHeight);
    stage.style.top = `${rand(max * 0.1, max)}px`;
  }
  randomLane();
  const start = rand(M, Math.max(M, maxX() - w - 40));
  him.place(start);
  her.place(start + w + 36);

  let busy = false;

  // ---------------------------------------------------------------- scenes

  /** Walk both to (x, x + gap) with him on the left. */
  const arrange = (x, gap, opts) => Promise.all([him.moveTo(x, opts), her.moveTo(x + gap, opts)]);
  const faceEachOther = () => { him.lookAt(her); her.lookAt(him); };

  async function walk() {
    const gap = HOLD_GAP * S;
    const hi = maxX() - gap;
    const start = clamp(Math.min(him.x, her.x), M, hi);
    await arrange(start, gap);
    faceEachOther();
    await wait(500);
    her.emote('💕');
    him.pose('hold-r');
    her.pose('hold-l');
    await wait(900);

    // stroll somewhere at least 200px away
    let dest = rand(M, hi);
    if (Math.abs(dest - start) < 200) dest = start < (M + hi) / 2 ? hi : M;
    await arrange(dest, gap, { speed: 38 });
    faceEachOther();
    await wait(500);
    him.expr({ blush: 0.8 });
    him.emote('💕');
    await wait(1600);
  }

  async function chase() {
    let [c, t] = Math.random() < 0.5 ? [him, her] : [her, him];
    for (let round = 0; round < 2; round++) {
      let dir = Math.sign(t.x - c.x) || 1;
      let end = dir > 0 ? maxX() : M;
      if (Math.abs(end - t.x) < 220) {
        [c, t] = [t, c]; // not enough room: the other one runs instead
        dir = -dir;
        end = dir > 0 ? maxX() : M;
      }
      t.expr({ eyes: 'happy', mouth: 'grin' });
      t.emote(round ? '😝' : '😆');
      c.expr({ mouth: 'grin' });
      c.pose('arms-up');
      c.lookAt(t);
      await wait(600);

      const tRun = t.moveTo(end, { speed: 150, gait: 'run', look: -dir * 4 });
      await wait(280);
      await Promise.all([tRun, c.moveTo(end - dir * w * 0.7, { speed: 150, gait: 'run' })]);

      c.pose('arms-up', false);
      c.emote('tag!', { text: true });
      t.expr({ eyes: 'surprised', mouth: 'o' });
      t.lookAt(c);
      await t.hop(14, 380);
      await wait(700);
      t.expr(NEUTRAL);
      c.expr(NEUTRAL);
      [c, t] = [t, c];
    }
    both((a) => a.expr({ eyes: 'happy', mouth: 'grin', blush: 0.7 }));
    faceEachOther();
    him.emote('😂');
    await wait(400);
    her.emote('😂');
    await wait(1600);
  }

  async function kiss() {
    const gap = KISS_GAP * S;
    const x = clamp(him.x, M, maxX() - gap - 40);
    await arrange(x, gap + 40);
    faceEachOther();
    await wait(700);
    her.expr({ blush: 0.8 });
    await her.moveTo(x + gap, { speed: 30, look: -4 });

    him.lean(8);
    her.expr({ eyes: 'closed', mouth: 'kiss' });
    await wait(350);
    const up = her.hop(KISS_HOP * S, 900);
    await wait(420);
    const cheek = him.point(0.76, 0.3);
    burst(cheek.x, cheek.y, { count: 10, spread: 70 });
    await up;

    him.lean(0);
    him.expr({ eyes: 'hearts', mouth: 'grin', blush: 1, flustered: true });
    him.emote('💋', { left: '76%', top: '22%' });
    her.expr({ eyes: 'happy', mouth: 'grin' });
    await wait(900);
    her.emote('hehe', { text: true });
    await wait(1800);
    him.emote('😳');
    await wait(1200);
    await her.moveTo(her.x + 30, { speed: 40, look: -4 });
  }

  async function toss() {
    const gap = Math.min(260, W() - 2 * M - w);
    const mid = clamp((him.x + her.x) / 2, M + gap / 2, maxX() - gap / 2);
    const [L, R] = him.x <= her.x ? [him, her] : [her, him];
    await Promise.all([L.moveTo(mid - gap / 2), R.moveTo(mid + gap / 2)]);
    faceEachOther();
    await wait(600);
    L.emote('✨');

    for (let i = 0; i < 4; i++) {
      const [from, to, arm] = i % 2 ? [R, L, 'throw-l'] : [L, R, 'throw-r'];
      from.pose(arm);
      await wait(180);
      const flight = flyHeart(from, to, 850);
      from.pose(arm, false);
      await wait(600);
      to.pose('arms-up');
      await flight;
      to.pose('arms-up', false);
      if (i === 3) {
        to.expr({ eyes: 'happy', mouth: 'grin', blush: 0.8 });
        to.emote('💖');
      }
      await wait(350);
    }
    await wait(1400);
  }

  function flyHeart(from, to, duration) {
    const heart = document.createElement('span');
    heart.className = 'toss-heart';
    heart.textContent = '💖';
    stage.append(heart);
    const sr = stage.getBoundingClientRect();
    const a = from.point(0.5, -0.05);
    const b = to.point(0.5, -0.05);
    const x0 = a.x - sr.left - 10, y0 = a.y - sr.top;
    const x1 = b.x - sr.left - 10, y1 = b.y - sr.top;
    const frames = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t - 70 * 4 * t * (1 - t);
      frames.push({ transform: `translate(${x}px, ${y}px) rotate(${t * 360}deg)` });
    }
    return heart.animate(frames, { duration, easing: 'linear' }).finished.then(() => heart.remove());
  }

  async function peekaboo() {
    const [h, s] = Math.random() < 0.5 ? [him, her] : [her, him];
    const side = h.x < W() / 2 ? -1 : 1;
    h.lookAt(s);
    h.emote('🤫');
    await wait(900);
    await h.moveTo(side < 0 ? -w - 20 : W() + 20, { speed: 90 });

    s.emote('❓');
    for (let i = 0; i < 2; i++) {
      s.look(-5); await wait(700);
      s.look(5); await wait(700);
    }
    // sneak in from the *other* side while she/he looks the wrong way
    const peek = -side;
    s.look(-peek * 5);
    h.place(peek < 0 ? -w - 20 : W() + 20);
    await h.moveTo(peek < 0 ? -w * 0.4 : W() - w * 0.6, { speed: 50 });
    h.expr({ eyes: 'happy', mouth: 'grin' });
    h.emote('boo!', { text: true });
    await wait(250);
    s.look(peek * 5);
    s.expr({ eyes: 'surprised', mouth: 'o', blush: 0.9 });
    await s.hop(22, 420);
    s.emote('😳');
    await wait(900);
    s.expr({ eyes: 'happy', mouth: 'grin' });
    await h.moveTo(clamp(s.x + peek * (w + 24), M, maxX()), { speed: 70 });
    faceEachOther();
    him.emote('💕');
    await wait(1800);
  }

  async function hug() {
    const gap = HUG_GAP * S;
    const [L, R] = him.x <= her.x ? [him, her] : [her, him];
    const mid = clamp((L.x + R.x) / 2, M + 100, maxX() - 100);
    await Promise.all([L.moveTo(mid - 100), R.moveTo(mid + 100)]);
    faceEachOther();
    await wait(500);
    her.expr({ eyes: 'happy', blush: 0.8 });
    her.emote('🥺');
    await wait(1100);

    await Promise.all([L.moveTo(mid - gap / 2, { speed: 130, gait: 'run' }), R.moveTo(mid + gap / 2, { speed: 130, gait: 'run' })]);
    L.pose('hug-r'); // inner arms reach toward each other
    R.pose('hug-l');
    both((a) => a.expr({ eyes: 'closed', mouth: 'grin', blush: 0.9 }));
    both((a) => a.squish());
    const p = L.point(1, 0.35);
    burst(p.x + (R.point(0, 0).x - p.x) / 2, p.y, { count: 16, spread: 110 });
    await wait(1800);
    L.pose('hug-r', false);
    R.pose('hug-l', false);
    both((a) => a.expr({ eyes: 'happy' }));
    await Promise.all([L.moveTo(L.x - 20, { speed: 40, look: 4 }), R.moveTo(R.x + 20, { speed: 40, look: -4 })]);
    await wait(1200);
  }

  /** Walk off-screen together, move the lane, walk back in somewhere new. */
  async function move() {
    const side = (him.x + her.x) / 2 < W() / 2 ? -1 : 1;
    const off = side < 0 ? -w - 30 : W() + 30;
    const [lead, follow] = side < 0 ? [him.x < her.x ? him : her, him.x < her.x ? her : him]
                                     : [him.x > her.x ? him : her, him.x > her.x ? her : him];
    await Promise.all([lead.moveTo(off, { speed: 70 }), follow.moveTo(off - side * (w + 20), { speed: 70 })]);

    randomLane();
    const from = Math.random() < 0.5 ? -1 : 1;
    const entry = from < 0 ? -w - 30 : W() + 30;
    const [first, second] = Math.random() < 0.5 ? [him, her] : [her, him];
    first.place(entry);
    second.place(entry + from * (w + 20));
    const spot = rand(M, Math.max(M, maxX() - w - 40));
    await Promise.all([first.moveTo(spot + (from < 0 ? w + 36 : 0), { speed: 70 }),
                       second.moveTo(spot + (from < 0 ? 0 : w + 36), { speed: 70 })]);
    faceEachOther();
    await wait(600);
  }

  const SCENES = { walk, chase, kiss, toss, peekaboo, hug };
  const EXTRA = { move };

  // ------------------------------------------------------- idle fidgets

  async function fidget() {
    const a = pick([him, her]);
    const b = a === him ? her : him;
    switch (pick(['wander', 'wave', 'gaze', 'emote'])) {
      case 'wander':
        await a.moveTo(clamp(a.x + rand(-120, 120), M, maxX()), { speed: 32 });
        break;
      case 'wave': {
        a.lookAt(b);
        const arm = b.x > a.x ? 'wave-r' : 'wave-l';
        a.pose(arm);
        await wait(1400);
        a.pose(arm, false);
        b.lookAt(a);
        b.emote('💕');
        await wait(800);
        break;
      }
      case 'gaze':
        faceEachOther();
        both((x) => x.expr({ blush: 0.75 }));
        await wait(2200);
        break;
      default:
        a.emote(pick(['💕', '🎵', '✨', '🥰', '💭']));
        await wait(1200);
    }
    him.reset();
    her.reset();
  }

  async function idle(ms) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      await wait(Math.min(rand(6000, 10000), Math.max(0, until - Date.now())));
      if (Date.now() >= until) break;
      if (!busy && !document.hidden) {
        busy = true;
        await fidget();
        busy = false;
      }
    }
  }

  async function play(name) {
    const scene = SCENES[name] || EXTRA[name];
    if (busy || !scene) return;
    busy = true;
    try {
      await scene();
    } finally {
      him.reset();
      her.reset();
      busy = false;
    }
  }

  async function loop() {
    await idle(5000);
    let last;
    for (;;) {
      let name;
      do name = pick(Object.keys(SCENES)); while (name === last);
      last = name;
      await play(name);
      await wait(rand(800, 1500));
      await play('move'); // walk out, come back in on a new line
      await wait(rand(1500, 3000));
    }
  }

  // ---------------------------------------------------- interactions

  // eyes follow the cursor while nothing else is going on
  let queued = false;
  addEventListener('mousemove', (e) => {
    if (busy || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      for (const a of [him, her]) {
        const p = a.point(0.5, 0.3);
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        const len = Math.hypot(dx, dy) || 1;
        a.look((dx / len) * 4, (dy / len) * 3);
      }
    });
  });

  for (const a of [him, her]) {
    a.el.addEventListener('click', (e) => {
      e.stopPropagation();
      a.hop(12, 360);
      const r = pick(['💕', '😳', '🥰', 'hehe', 'hi bonny']);
      a.emote(r, { text: /[a-z]/.test(r) });
      a.expr({ blush: 1 });
      setTimeout(() => a.expr({ blush: NEUTRAL.blush }), 1500);
    });
  }

  addEventListener('resize', () => {
    for (const a of [him, her]) a.place(clamp(a.x, M, maxX()));
    const maxTop = Math.max(0, innerHeight - stage.offsetHeight);
    if (stage.offsetTop > maxTop) stage.style.top = `${maxTop}px`;
  });

  async function celebrate() {
    both((a) => a.expr({ eyes: 'happy', mouth: 'grin', blush: 0.9 }));
    faceEachOther();
    him.emote('🎉');
    her.emote('💖');
    await both((a) => a.hop(22, 450));
    await both((a) => a.hop(16, 400));
    await wait(1200);
    if (!busy) { him.reset(); her.reset(); }
  }

  if (auto && !REDUCED) loop();

  return { play, celebrate, him, her, scenes: [...Object.keys(SCENES), ...Object.keys(EXTRA)] };
}
