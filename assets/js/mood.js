// Mood flower page: write -> click "read my feelings" -> Jev scores the new sentences
// in ONE request -> the flower becomes a pie chart of the latest sentence's feelings.
// Saving stores just those percentages (plus the words), one row per day.
//
// The free Jev model allows 1 request per minute, so reading is button-driven with
// a cooldown, never per keystroke.
import { db, requireMember } from './db.js';
import { ambient, burst, toast } from './fx.js';
import { BATCH, FEELINGS, splitSentences, toPercents } from './emotion.js';
import { flowerSVG } from './flower.js';

const COOLDOWN_S = 60;
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10); // same UTC day the DB uses

ambient(8);

const say = (msg) => { $('status').textContent = msg; $('status').hidden = !msg; };

// ---------- state ----------

const read = new Set();   // sentences Jev has already read (so the button only offers new ones)
let percents = null;      // {joy: 32, ...} adding up to 100: what the flower and readout show
let busy = false;
let cooldownUntil = 0;
let fresh = false;        // animate the flower once after a new reading
let sentencesNow = [];
const text = $('text');

const unread = () => sentencesNow.filter((s) => !read.has(s));
const cooldownLeft = () => Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

// ---------- painting ----------

function paintMine() {
  $('my-flower').innerHTML = flowerSVG(percents, { id: 'mine', animate: fresh });
  fresh = false;
  paintReadout();
  paintButton();
}

function paintReadout() {
  const top = percents ? Object.keys(percents).reduce((a, b) => (percents[b] > percents[a] ? b : a)) : null;
  $('readout').innerHTML = Object.entries(FEELINGS).map(([key, f]) => {
    const pct = percents ? `${percents[key]}%` : '–';
    return `<li class="${key === top ? 'is-top' : ''}"><span class="dot" style="background:${f.color}"></span><span class="fname">${f.label}</span><span class="pct">${pct}</span></li>`;
  }).join('');
  $('readout-head').textContent = busy ? 'Jev · latest sentence · updating'
    : percents ? 'Jev · latest sentence' : 'Jev · waiting for a sentence';
}

function paintButton() {
  const btn = $('read-btn');
  const left = cooldownLeft();
  const n = unread().length;
  btn.disabled = busy || left > 0 || n === 0;
  btn.textContent = busy ? 'reading…'
    : left > 0 ? `jev is resting · ${left}s`
    : n === 0 ? (sentencesNow.length ? 'all read ✓' : 'read my feelings 🪡')
    : `read my feelings 🪡${n > 1 ? ` (${n} sentences)` : ''}`;
  $('readout-foot').textContent = busy ? 'Reading…' : left > 0 ? `next reading in ${left}s` : n ? 'Ready' : '';
}
setInterval(() => { if (cooldownLeft() >= 0) paintButton(); }, 500);

// ---------- Jev ----------

async function jevScores(sentences) {
  const { data, error } = await db.functions.invoke('mood-score', { body: { sentences } });
  if (error) {
    let info = {};
    try { info = await error.context.json(); } catch { /* not JSON */ }
    throw Object.assign(new Error(info.error ?? error.message), { status: error.context?.status, retryAfter: info.retryAfter });
  }
  if (data?.source !== 'jev') throw new Error('jev is not configured yet');
  return data.results.map((r) => r.scores);
}

$('read-btn').addEventListener('click', async () => {
  const todo = unread().slice(0, BATCH);
  if (!todo.length || busy) return;
  busy = true;
  say('');
  paintReadout();
  paintButton();
  try {
    const results = await jevScores(todo);
    todo.forEach((s) => read.add(s));
    percents = toPercents(results[results.length - 1]); // the flower shows the latest sentence
    fresh = true;
    cooldownUntil = Date.now() + COOLDOWN_S * 1000;
    if (unread().length) say(`read ${todo.length}. click again in a minute for the rest.`);
  } catch (err) {
    console.error(err);
    if (err.status === 429) {
      cooldownUntil = Date.now() + (err.retryAfter ?? COOLDOWN_S) * 1000;
      say('jev needs a breather. it will be ready again shortly.');
    } else {
      say(`couldn't read that: ${err.message}`);
    }
  } finally {
    busy = false;
    paintMine();
  }
});

text.addEventListener('input', () => {
  sentencesNow = splitSentences(text.value);
  paintButton(); // the flower only changes when jev reads
});

// ---------- saving ----------

$('save').addEventListener('click', async () => {
  const words = text.value.trim();
  if (!words) return say('write a little something first 🌸');
  $('save').disabled = true;
  const { error } = await db.from('moods').upsert(
    { day: today(), note: words, feelings: percents },
    { onConflict: 'day,author_id' },
  );
  $('save').disabled = false;
  if (error) { console.error(error); return say(`couldn't save: ${error.message}`); }

  say(percents ? '' : 'saved, but jev has not read anything yet, so the flower is blank.');
  toast('saved 🌸');
  const r = $('my-flower').getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, { count: 12, spread: 120 });
  loadAll();
});

// ---------- their flower ----------

let me;

function paintTheirs(row) {
  $('their-flower').innerHTML = flowerSVG(row?.feelings ?? null, { id: 'theirs' });
  $('their-empty').hidden = !!row;
  $('read').hidden = !row?.note;
  $('their-words').textContent = row?.note ?? '';
  if (!row) $('their-words').hidden = true;
}

let restored = false;
async function loadAll() {
  const { data: rows, error } = await db.from('moods').select('*').eq('day', today());
  if (error) return say(`couldn't load moods: ${error.message}`);

  paintTheirs(rows.find((r) => r.author_id !== me.id));

  // first load only: bring back what I already wrote today
  if (!restored) {
    restored = true;
    const mine = rows.find((r) => r.author_id === me.id);
    if (mine) {
      text.value = mine.note ?? '';
      percents = mine.feelings ?? null;
      sentencesNow = splitSentences(text.value);
      sentencesNow.forEach((s) => read.add(s)); // already read; editing makes new ones unread
    }
    paintMine();
  }
}

$('read').addEventListener('click', () => {
  const words = $('their-words');
  words.hidden = !words.hidden;
  $('read').textContent = words.hidden ? `read ${$('their-name').textContent}'s words` : 'hide their words';
});

// ---------- boot ----------

async function boot() {
  me = await requireMember();
  const { data: profiles } = await db.from('profiles').select('id, nickname');
  const them = (profiles ?? []).find((p) => p.id !== me.id);
  $('my-name').textContent = me.nickname;
  $('their-name').textContent = them?.nickname ?? 'waiting for them…';
  $('read').textContent = `read ${them?.nickname ?? 'their'}'s words`;

  await loadAll();
  db.channel('moods-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'moods' }, () => loadAll())
    .subscribe();
}

paintMine();
$('their-flower').innerHTML = flowerSVG(null, { id: 'theirs' });
boot().catch((err) => { console.error(err); say(`couldn't connect: ${err.message ?? err}`); });
