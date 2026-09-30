// Post-it wall: drag notes anywhere, changes show up live on the other person's screen.
import { db, requireMember } from './db.js';
import { ambient, burst, pick, rand, toast } from './fx.js';

const COLORS = ['yellow', 'pink', 'blue', 'green', 'lilac'];
const PAPER = { yellow: '#fff3a3', pink: '#ffc9de', blue: '#c6e6ff', green: '#cdf2c6', lilac: '#e2d0ff' };
const NOTE_W = 200;
const NOTE_H = 170; // rough, used only to keep new notes on the board

const $ = (id) => document.getElementById(id);
const board = $('board');
const empty = $('empty');
const composer = $('composer');
const bodyInput = $('body');
const swatchBox = $('swatches');
const status = $('status');

ambient(10);

// Shown under the composer so a failure is never silent.
const say = (msg) => { status.textContent = msg; status.hidden = !msg; };

let me;
let names = {};

const els = new Map(); // note id -> element
let color = pick(COLORS);

// ---------- colour picker ----------

for (const c of COLORS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.style.setProperty('--paper', PAPER[c]);
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', c);
  b.dataset.color = c;
  b.addEventListener('click', () => selectColor(c));
  swatchBox.append(b);
}
function selectColor(c) {
  color = c;
  for (const b of swatchBox.children) b.setAttribute('aria-checked', String(b.dataset.color === c));
}
selectColor(color);

// ---------- rendering ----------

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const syncEmpty = () => { empty.hidden = els.size > 0; };

function place(el, note) {
  el.style.left = `${note.x}%`;
  el.style.top = `${note.y}%`;
  el.style.setProperty('--rot', `${note.rotation}deg`);
}

function render(note) {
  let el = els.get(note.id);
  if (!el) {
    el = document.createElement('article');
    el.dataset.id = note.id;
    const del = document.createElement('button');
    del.className = 'note__del';
    del.type = 'button';
    del.title = 'take it down';
    del.textContent = '×';
    const text = document.createElement('p');
    text.className = 'note__body';
    const by = document.createElement('div');
    by.className = 'note__by';
    by.textContent = `— ${names[note.author_id] ?? '?'}`;
    if (note.author_id === me.id) el.append(del);
    el.append(text, by);
    del.addEventListener('click', (e) => { e.stopPropagation(); remove(note.id); });
    enableDrag(el);
    board.append(el);
    els.set(note.id, el);
  }
  el.className = `note note--${note.color}${el.classList.contains('is-dragging') ? ' is-dragging' : ''}`;
  el.querySelector('.note__body').textContent = note.body;
  if (!el.classList.contains('is-dragging')) place(el, note);
  syncEmpty();
}

function drop(id) {
  els.get(id)?.remove();
  els.delete(id);
  syncEmpty();
}

// ---------- dragging ----------

function enableDrag(el) {
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.note__del') || e.button !== 0) return;
    const box = board.getBoundingClientRect();
    const start = el.getBoundingClientRect();
    const dx = e.clientX - start.left;
    const dy = e.clientY - start.top;
    let moved = false;

    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');

    const move = (ev) => {
      moved = true;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const x = clamp(ev.clientX - box.left - dx, 0, box.width - w);
      const y = clamp(ev.clientY - box.top - dy, 0, box.height - h);
      el.style.left = `${(x / box.width) * 100}%`;
      el.style.top = `${(y / box.height) * 100}%`;
    };
    const up = async () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('is-dragging');
      if (!moved) return;
      const x = round(parseFloat(el.style.left));
      const y = round(parseFloat(el.style.top));
      const { error } = await db.from('notes').update({ x, y }).eq('id', el.dataset.id);
      if (error) toast("couldn't move that one 😢");
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}
const round = (n) => Math.round(n * 100) / 100;

// ---------- actions ----------

async function remove(id) {
  const { error } = await db.from('notes').delete().eq('id', id);
  if (error) return toast("couldn't take that down 😢");
  drop(id);
}

composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = bodyInput.value.trim();
  if (!body) return;
  if (!me) return say('still connecting… try again in a moment');

  const box = board.getBoundingClientRect();
  const note = {
    body,
    color,
    x: round(rand(2, Math.max(3, ((box.width - NOTE_W) / box.width) * 100 - 2))),
    y: round(rand(2, Math.max(3, ((box.height - NOTE_H) / box.height) * 100 - 2))),
    rotation: round(rand(-5, 5)),
  };
  const { data, error } = await db.from('notes').insert(note).select().single();
  if (error) {
    console.error(error);
    return say(`couldn't stick that one: ${error.message}`);
  }
  say('');

  bodyInput.value = '';
  render(data);
  const r = els.get(data.id).getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + 20, { count: 8, spread: 90 });
  selectColor(pick(COLORS));
});

bodyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) composer.requestSubmit();
});

// ---------- load + live updates ----------

async function boot() {
  say('connecting…');
  me = await requireMember();

  const { data: profiles } = await db.from('profiles').select('id, nickname');
  names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.nickname]));

  const { data: notes, error } = await db.from('notes').select('*').order('created_at');
  if (error) throw error;
  (notes ?? []).forEach(render);
  syncEmpty();
  say('');

  db.channel('notes-wall')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, ({ eventType, new: row, old }) => {
      if (eventType === 'DELETE') drop(old.id);
      else render(row);
    })
    .subscribe();
}

boot().catch((err) => {
  console.error(err);
  say(`couldn't reach the wall: ${err.message ?? err}`);
});
