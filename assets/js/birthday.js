// Make a wish: hold space (or the button) to inhale. When the bar is full she blows
// and the candles go out one by one. No backend; pure animation.
//
// The two of them are scene.js actors: he peeks in from the left edge while she
// inhales, then runs in and kisses her cheek once the candles are out.
//
// Try a different number of candles with ?candles=12 (1 to 12).
import { CONFIG } from './config.js';
import { Actor } from './scene.js';
import { ambient, burst, rain } from './fx.js';

const INHALE_S = 2.4;   // seconds of holding to fill the bar
const EXHALE_S = 1.1;   // seconds for the bar to drain if she lets go early
const OUT_EVERY_MS = 120;

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const name = CONFIG.her.nickname;

const asked = Number(new URLSearchParams(location.search).get('candles'));
const CANDLES = Number.isInteger(asked) && asked >= 1 ? Math.min(asked, 12) : 7;

ambient(6);

// ---------- the cake ----------

const STRIPES = ['#ff7aa8', '#ffe07a', '#8fd3ff', '#b7e3a8', '#d6b8ff'];

function cakeSVG() {
  const left = 84;
  const right = 276;
  let candles = '';
  for (let i = 0; i < CANDLES; i++) {
    const x = CANDLES === 1 ? 180 : left + ((right - left) * i) / (CANDLES - 1);
    const color = STRIPES[i % STRIPES.length];
    candles += `
      <g class="candle" transform="translate(${x.toFixed(1)} 0)" data-i="${i}">
        <rect x="-5" y="92" width="10" height="44" rx="3" fill="${color}"/>
        <path d="M-5 106 L5 100 M-5 118 L5 112 M-5 130 L5 124" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>
        <line x1="0" y1="92" x2="0" y2="86" stroke="#5a3a3a" stroke-width="2" stroke-linecap="round"/>
        <g class="flame" style="--d:${(i * 0.37) % 1.3}s" transform="translate(0 84)">
          <circle class="flame__glow" r="26" fill="url(#glow)"/>
          <g class="flame__body">
            <path d="M0 -24 C9 -13 10 -3 0 5 C-10 -3 -9 -13 0 -24Z" fill="url(#fire)"/>
            <path d="M0 -10 C4 -5 4 0 0 3 C-4 0 -4 -5 0 -10Z" fill="#fff6c4"/>
          </g>
        </g>
      </g>`;
  }

  return `<svg viewBox="0 0 360 330" role="img" aria-label="a birthday cake with ${CANDLES} candles">
    <defs>
      <radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
      <linearGradient id="fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9d2e"/><stop offset="1" stop-color="#ffe56b"/></linearGradient>
    </defs>
    <ellipse cx="180" cy="306" rx="176" ry="20" fill="#7a2f63" opacity=".18"/>
    <ellipse cx="180" cy="298" rx="170" ry="20" fill="#fff" stroke="#ffc9de" stroke-width="3"/>

    <rect x="30" y="200" width="300" height="92" rx="18" fill="#ffb3cf"/>
    <rect x="30" y="266" width="300" height="26" rx="13" fill="#f58db4"/>
    <rect x="70" y="132" width="220" height="74" rx="16" fill="#ffd0e3"/>

    <path d="M30 210 q0-14 18-14 h264 q18 0 18 14 q0 14-14 14 q-12 0-12 12 q0 10-10 10 q-10 0-10-10 q0-12-12-12 h-28 q-12 0-12 12 q0 10-10 10 q-10 0-10-10 q0-12-12-12 h-52 q-12 0-12 12 q0 10-10 10 q-10 0-10-10 q0-12-12-12 q-14 0-14-14Z" fill="#fff"/>
    <path d="M70 142 q0-12 16-12 h188 q16 0 16 12 q0 12-12 12 q-10 0-10 10 q0 8-9 8 q-9 0-9-8 q0-10-10-10 h-58 q-10 0-10 10 q0 8-9 8 q-9 0-9-8 q0-10-10-10 q-12 0-12-12Z" fill="#fff"/>

    <g fill="#f2508a" font-size="22" text-anchor="middle">
      <text x="80" y="266">♥</text><text x="140" y="252">♥</text><text x="200" y="266">♥</text><text x="260" y="252">♥</text>
    </g>
    <g fill="#e11d48"><circle cx="110" cy="186" r="7"/><circle cx="250" cy="186" r="7"/></g>
    ${candles}
  </svg>`;
}

$('cake').innerHTML = cakeSVG();
const flames = [...stage.querySelectorAll('.flame')];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- the two of them ----------
// She stands in the slot the layout reserved for her; he waits off-screen to the left.

const slot = $('slot');
const her = new Actor('her', $('cast'), slot.clientHeight);
const him = new Actor('him', $('cast'), slot.clientHeight);
const S = her.s;
const hideHim = () => him.place(-him.w - 30);
her.place(slot.offsetLeft);
hideHim();
her.look(3);

// the wind comes out of her mouth
const wind = $('wind');
wind.style.left = `${slot.offsetLeft + her.w * 0.7}px`;
wind.style.top = `${stage.clientHeight - 10 - slot.clientHeight * 0.78}px`;

const face = (eyes, mouth) => her.expr({ eyes, mouth });
face('normal', 'smile');

let peeked = false;
let peeking = Promise.resolve(); // settles once he is in place at the edge

/** The first time she breathes in, he sneaks into view at the edge and watches. */
function peek() {
  if (peeked) return;
  peeked = true;
  him.expr({ eyes: 'normal', mouth: 'grin', blush: 0.7 });
  peeking = him.moveTo(-him.w * 0.45, { speed: 90, look: 5 }).then(() => him.emote('🤫'));
}

/** She blew. He runs in and kisses her on the cheek. */
async function kissHer() {
  await peeking; // never run two movements at once
  him.pose('arms-up');
  him.expr({ eyes: 'happy', mouth: 'grin' });
  await wait(250);
  him.pose('arms-up', false);
  // stand as far left of her as the room allows (he is taller, so he bends over to her)
  const gap = Math.max(100 * S, Math.min(150 * S, her.x - 8));
  const bend = Math.max(4, Math.min(18, (Math.asin((gap / S - 72) / 284) * 180) / Math.PI));
  await him.moveTo(her.x - gap, { speed: 260, gait: 'run', look: 5 });

  // she notices
  her.look(-4);
  her.expr({ eyes: 'surprised', mouth: 'o', blush: 0.75 });
  await wait(500);
  her.expr({ eyes: 'closed', mouth: 'smile', blush: 0.9 });

  // he leans in, she rises on tiptoes to meet him, and he kisses her cheek
  him.expr({ eyes: 'closed', mouth: 'kiss' });
  him.lean(bend);
  await wait(350);
  const up = her.hop(34 * S, 1000);
  await wait(450);
  const cheek = her.point(0.22, 0.2);
  burst(cheek.x, cheek.y, { count: 12, spread: 80 });
  her.emote('💋', { left: '10%', top: '10%' });
  await up;

  him.lean(0);
  him.expr({ eyes: 'hearts', mouth: 'grin', blush: 1, flustered: true });
  her.expr({ eyes: 'hearts', mouth: 'grin', blush: 1, flustered: true });
  await wait(1100);
  her.emote('hehe', { text: true });
  await wait(900);
}

// ---------- breathing ----------

let p = 0;            // 0..1 how full the lungs are
let holding = false;
let state = 'ready';  // 'ready' | 'blown'
let last = 0;

function setHolding(on) {
  if (on && state !== 'ready') return;
  holding = on;
  if (on) peek();
}

function paint() {
  stage.style.setProperty('--breath', p.toFixed(3));
  $('fill').style.width = `${p * 100}%`;
  $('fill').parentElement.setAttribute('aria-valuenow', Math.round(p * 100));
  if (state !== 'ready') return;
  $('hint').innerHTML = holding ? 'breathing in…' : p > 0 ? 'breathing out…' : 'hold <kbd>space</kbd> to take a deep breath';
  if (holding) face('closed', 'o'); else face('normal', 'smile');
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state === 'ready') {
    p = Math.max(0, Math.min(1, p + (holding ? dt / INHALE_S : -dt / EXHALE_S)));
    paint();
    if (p >= 1) blow();
  }
  requestAnimationFrame(frame);
}

// ---------- blowing out the candles ----------

function snuff(flame) {
  flame.classList.add('is-out');
  const candle = flame.parentElement;
  const smoke = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  smoke.setAttribute('class', 'smoke');
  smoke.setAttribute('cx', candle.transform.baseVal[0].matrix.e);
  smoke.setAttribute('cy', 76);
  smoke.setAttribute('r', 5);
  smoke.addEventListener('animationend', () => smoke.remove());
  candle.parentElement.append(smoke);
}

async function blow() {
  state = 'blown';
  holding = false;
  stage.classList.add('is-blowing');
  face('closed', 'kiss');
  $('hint').textContent = 'whoooosh 🌬️';
  him.look(5);

  await wait(350);
  for (const flame of flames) {
    snuff(flame);
    await wait(OUT_EVERY_MS);
  }
  await wait(450);
  stage.classList.remove('is-blowing');

  $('hint').textContent = 'someone is very proud of you 💋';
  await kissHer();
  finish();
}

function finish() {
  stage.classList.remove('is-dusk');
  stage.classList.add('is-lit');
  $('hint').textContent = 'make sure you keep that wish a secret 🤫';
  $('cheer-title').textContent = `happy birthday, ${name}!`;
  $('cheer').hidden = false;

  const r = $('cake').getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height * 0.3, { count: 26, spread: 240, items: ['🎉', '🎊', '✨', '💖', '🎂'] });
  rain(3800, { items: ['🎉', '💖', '🎊', '✨', '🩷'] });
}

function relight() {
  state = 'ready';
  p = 0;
  peeked = false;
  flames.forEach((f) => f.classList.remove('is-out'));
  stage.classList.remove('is-lit', 'is-blowing');
  stage.classList.add('is-dusk');
  $('cheer').hidden = true;
  her.reset();
  her.look(3);
  him.reset();
  hideHim();
  paint();
}
$('again').addEventListener('click', relight);

// ---------- input: space, or hold the button / the cake / her ----------

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault(); // don't scroll the page
  if (!e.repeat) setHolding(true);
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') setHolding(false); });
window.addEventListener('blur', () => setHolding(false));

for (const target of [$('hold'), $('cake'), her.el]) {
  target.addEventListener('pointerdown', (e) => { setHolding(true); target.setPointerCapture?.(e.pointerId); });
  target.addEventListener('pointerup', () => setHolding(false));
  target.addEventListener('pointercancel', () => setHolding(false));
}

paint();
requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
