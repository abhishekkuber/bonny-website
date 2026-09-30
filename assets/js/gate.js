// Kiss-tax landing page: 5 kisses on the face to get in.
import { CONFIG } from './config.js';
import { himHeadSVG } from './characters.js';
import { startScene } from './scene.js';
import { ambient, burst, leaveTo, pick, rain, rand, replay, shake, toast } from './fx.js';

const KISSES_NEEDED = 5;
const name = CONFIG.her.nickname;

// One entry per kiss count (index 0 = no kisses yet).
const STAGES = [
  { eyes: 'normal', mouth: 'smile', blush: 0.1, say: `pay the kiss tax, ${name} 💋` },
  { eyes: 'surprised', mouth: 'o', blush: 0.3, say: 'o-oh! 😳' },
  { eyes: 'normal', mouth: 'grin', blush: 0.5, say: 'hehe... again?' },
  { eyes: 'happy', mouth: 'grin', blush: 0.7, flustered: true, say: `${name}!! 🥺` },
  { eyes: 'happy', mouth: 'o', blush: 0.85, flustered: true, say: 'one more... 🫣' },
  { eyes: 'hearts', mouth: 'grin', blush: 1, flustered: true, say: 'TAX PAID 💖' },
];

const AFTER_PAID = ['hehe 💕', 'bonus kiss?? 🥰', 'ok ok i love you', 'tax overpaid 😳', 'keep going honestly'];
const MISSES = ["that's not my face 🙄", 'missed 😗', 'aim for the face, bonny', 'my face is right here 👀'];
const SKIP_LINES = ['nope 🙅', 'too slow!', 'hehe 😝', 'tax evasion is a crime 👮', 'just kiss me 😗', 'catch me first', 'lol no', 'not today'];
const LEAVE_LINES = ['leaving?? without paying?? 😤', "where do you think you're going 👀", 'tax unpaid 😤'];

const LIPS = `<svg viewBox="0 0 60 40" aria-hidden="true">
  <path fill="#e11d48" d="M2 19C10 7 20 3 30 11C40 3 50 7 58 19C48 21 40 19 30 21C20 19 12 21 2 19Z"/>
  <path fill="#f43f5e" d="M2 21C12 23 20 22 30 23C40 22 48 23 58 21C50 36 40 38 30 38C20 38 10 36 2 21Z"/>
</svg>`;

const $ = (sel) => document.querySelector(sel);
const wrap = $('#face-wrap');
wrap.insertAdjacentHTML('afterbegin', himHeadSVG({ id: 'face', cls: 'face' }));
const face = $('#face');
const marks = $('#kiss-marks');
const bubble = $('#bubble');
const tally = $('#tally');
const skip = $('#skip');
const enter = $('#enter');

let kisses = 0;
let paid = false;

// Every visit pays again.
window.KissTax.clear();
ambient();
const mascots = startScene();
setStage(0);

for (let i = 0; i < KISSES_NEEDED; i++) {
  const lip = document.createElement('span');
  lip.className = 'tally__lip';
  lip.innerHTML = LIPS;
  tally.append(lip);
}

function say(text) {
  bubble.textContent = text;
  replay(bubble, 'pop');
}

function setStage(i) {
  const s = STAGES[i];
  face.dataset.eyes = s.eyes;
  face.dataset.mouth = s.mouth;
  face.style.setProperty('--blush', s.blush);
  face.classList.toggle('flustered', !!s.flustered);
  say(s.say);
}

function stampKiss(x, y) {
  const r = wrap.getBoundingClientRect();
  const mark = document.createElement('span');
  mark.className = 'kiss-mark';
  mark.innerHTML = LIPS;
  mark.style.left = `${x - r.left}px`;
  mark.style.top = `${y - r.top}px`;
  mark.style.setProperty('--rot', `${rand(-25, 25)}deg`);
  marks.append(mark);
  if (marks.children.length > 15) marks.firstElementChild.remove();
}

function kiss(x, y) {
  stampKiss(x, y);
  burst(x, y, { count: 10 + kisses * 3 });
  replay(face, 'squish');

  if (paid) {
    say(pick(AFTER_PAID));
    return;
  }
  kisses++;
  tally.children[kisses - 1].classList.add('on');
  setStage(kisses);
  if (kisses === KISSES_NEEDED) payUp();
}

function payUp() {
  paid = true;
  window.KissTax.pay();
  document.body.classList.add('paid');
  $('#title').textContent = 'tax paid! 💖';
  $('#sub').textContent = `welcome in, ${name}. you may pass.`;
  document.title = 'welcome in 💕';

  rain(3200);
  mascots.celebrate();
  setTimeout(() => {
    const r = wrap.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: 40, spread: 340 });
  }, 150);
}

// ---------- kissing ----------

face.querySelector('.kissable').addEventListener('click', (e) => {
  e.stopPropagation();
  kiss(e.clientX, e.clientY);
});

let lastMiss = 0;
document.addEventListener('click', (e) => {
  if (paid || e.target.closest('a, button')) return;
  if (Date.now() - lastMiss < 1200) return;
  lastMiss = Date.now();
  toast(pick(MISSES));
});

// ---------- the skip button that runs away ----------

const viewW = () => document.documentElement.clientWidth;
const viewH = () => document.documentElement.clientHeight;

function placeSkip(left, top) {
  skip.style.left = `${left}px`;
  skip.style.top = `${top}px`;
}
const parkSkip = () => placeSkip(viewW() - skip.offsetWidth - 32, viewH() - skip.offsetHeight - 32);
parkSkip();
document.fonts.ready.then(parkSkip); // button width changes once the font loads

function flee(mx, my) {
  const pad = 24;
  const maxX = viewW() - skip.offsetWidth - pad;
  const maxY = viewH() - skip.offsetHeight - pad;
  let x, y;
  // pick a spot far away from the cursor
  for (let tries = 0; tries < 20; tries++) {
    x = rand(pad, maxX);
    y = rand(pad, maxY);
    if (Math.hypot(x - mx, y - my) > 280) break;
  }
  placeSkip(x, y);
  skip.textContent = pick(SKIP_LINES);
}

document.addEventListener('mousemove', (e) => {
  if (paid) return;
  const r = skip.getBoundingClientRect();
  const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
  if (dist < 110) flee(e.clientX, e.clientY);
});

// If she does manage to click it (keyboard, touch, speed)...
skip.addEventListener('click', () => {
  toast('nice try. tax unpaid 😤');
  shake();
  say('excuse me?? 😤');
});

// ---------- other trolling ----------

document.addEventListener('mouseout', (e) => {
  if (paid || e.relatedTarget || e.clientY > 5) return;
  toast(pick(LEAVE_LINES));
});

document.addEventListener('keydown', (e) => {
  if (paid || e.key !== 'Escape') return;
  toast('there is no escape 😤');
  shake();
});

const originalTitle = document.title;
document.addEventListener('visibilitychange', () => {
  if (paid) return;
  document.title = document.hidden ? 'come back 🥺 tax unpaid' : originalTitle;
});

enter.addEventListener('click', (e) => {
  e.preventDefault();
  leaveTo(enter.href);
});
