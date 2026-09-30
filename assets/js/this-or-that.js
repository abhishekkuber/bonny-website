// This or that: one pair at a time. You only see their pick once you've made yours
// (the database enforces that, see 0001_init.sql).
import { db, requireMember } from './db.js';
import { ambient, burst, toast } from './fx.js';

const $ = (id) => document.getElementById(id);
const say = (msg) => { $('status').textContent = msg; $('status').hidden = !msg; };

/** Tiny DOM helper: all user text goes in via textContent, never innerHTML. */
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

ambient(8);

let me;
let them = null;
let prompts = [];
let votes = [];      // mine, plus theirs for every pair I've already answered
let currentId = null; // the pair on screen; kept until you press "next"

const vote = (promptId, authorId) => (authorId ? votes.find((v) => v.prompt_id === promptId && v.author_id === authorId) : undefined);
const text = (p, key) => (key === 'a' ? p.option_a : p.option_b);

// ---------- the card ----------

function pickNext() {
  const left = prompts.filter((p) => !vote(p.id, me.id));
  currentId = left.length ? left[Math.floor(Math.random() * left.length)].id : null;
}

function optionButton(p, key, mine, theirs) {
  const btn = el('button', `opt opt--${key}${mine?.choice === key ? ' is-picked' : ''}`);
  btn.type = 'button';
  btn.disabled = !!mine;
  btn.append(el('span', 'opt__text', text(p, key)));

  const chips = el('span', 'opt__chips');
  if (mine?.choice === key) chips.append(el('span', 'chip', 'you'));
  if (theirs?.choice === key) chips.append(el('span', 'chip chip--them', them?.nickname ?? 'them'));
  btn.append(chips);

  btn.addEventListener('click', () => cast(p, key, btn));
  return btn;
}

function paintCard() {
  const box = $('card');
  box.replaceChildren();

  const p = prompts.find((x) => x.id === currentId);
  if (!p) {
    box.append(el('p', 'tcard__done', prompts.length ? "you've answered every pair! 🎉 add some more below." : 'no pairs yet. add the first one below.'));
    return;
  }

  const mine = vote(p.id, me.id);
  const theirs = vote(p.id, them?.id);

  const opts = el('div', 'opts');
  opts.append(optionButton(p, 'a', mine, theirs), el('span', 'opts__or', 'or'), optionButton(p, 'b', mine, theirs));
  box.append(opts);

  let line;
  if (!mine) line = 'pick one 👆';
  else if (!them) line = 'waiting for them to join 🫧';
  else if (!theirs) line = `${them.nickname} hasn't picked yet 🫧 it will show up here.`;
  else if (mine.choice === theirs.choice) line = `you both picked "${text(p, mine.choice)}" 💕`;
  else line = `${them.nickname} picked "${text(p, theirs.choice)}". opposites attract 😏`;
  box.append(el('p', 'tcard__line', line));

  if (mine) {
    const next = el('button', 'btn', 'next pair →');
    next.type = 'button';
    next.addEventListener('click', () => { pickNext(); paintCard(); });
    box.append(next);
  }
}

async function cast(p, choice, btn) {
  const { error } = await db.from('prompt_votes').insert({ prompt_id: p.id, choice });
  if (error) { console.error(error); return say(`couldn't save that: ${error.message}`); }
  say('');
  await loadVotes();
  paintAll();
  const theirs = vote(p.id, them?.id);
  if (theirs && theirs.choice === choice) {
    const r = btn.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: 16, spread: 140 });
  }
}

// ---------- match score + history ----------

function paintSummary() {
  const both = prompts.filter((p) => vote(p.id, me.id) && vote(p.id, them?.id));
  const same = both.filter((p) => vote(p.id, me.id).choice === vote(p.id, them.id).choice).length;
  const pct = both.length ? Math.round((same / both.length) * 100) : 0;
  $('match').textContent = both.length ? `you agree on ${pct}% · ${same} of ${both.length} pairs` : 'pick one. see if you picked the same.';
  $('bar-fill').style.width = `${both.length ? pct : 0}%`;
}

function paintHistory() {
  const list = $('hist');
  list.replaceChildren();
  const answered = prompts
    .filter((p) => vote(p.id, me.id))
    .sort((a, b) => new Date(vote(b.id, me.id).created_at) - new Date(vote(a.id, me.id).created_at))
    .filter((p) => p.id !== currentId || vote(p.id, me.id)); // the pair on screen is already shown above

  if (!answered.length) return list.append(el('p', 'hist__empty', 'nothing yet.'));

  for (const p of answered.slice(0, 40)) {
    const mine = vote(p.id, me.id);
    const theirs = vote(p.id, them?.id);
    const row = el('div', 'hrow');
    const verdict = !theirs ? '🫧' : mine.choice === theirs.choice ? '💕' : '↔️';
    row.append(el('span', 'hrow__verdict', verdict));

    const body = el('div', 'hrow__body');
    body.append(el('p', 'hrow__pair', `${p.option_a} or ${p.option_b}`));
    const who = el('p', 'hrow__who');
    who.textContent = theirs
      ? `you: ${text(p, mine.choice)} · ${them.nickname}: ${text(p, theirs.choice)}`
      : `you: ${text(p, mine.choice)} · ${them ? `${them.nickname} hasn't picked yet` : 'waiting'}`;
    body.append(who);
    row.append(body);
    list.append(row);
  }
}

function paintAll() {
  paintCard();
  paintSummary();
  paintHistory();
}

// ---------- add your own ----------

$('add-toggle').addEventListener('click', () => {
  $('add-form').hidden = !$('add-form').hidden;
  if (!$('add-form').hidden) $('add-a').focus();
});

$('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const option_a = $('add-a').value.trim();
  const option_b = $('add-b').value.trim();
  if (!option_a || !option_b) return;
  const { error } = await db.from('prompts').insert({ option_a, option_b, category: 'ours' });
  if (error) {
    return say(error.code === '23505' ? 'that pair already exists 🙂' : `couldn't add that: ${error.message}`);
  }
  say('');
  $('add-a').value = '';
  $('add-b').value = '';
  $('add-form').hidden = true;
  toast('added 🤔');
  await loadPrompts();
  if (!currentId) pickNext();
  paintAll();
});

// ---------- load + live updates ----------

async function loadPrompts() {
  const { data, error } = await db.from('prompts').select('*');
  if (error) throw error;
  prompts = data ?? [];
}
async function loadVotes() {
  const { data, error } = await db.from('prompt_votes').select('*');
  if (error) throw error;
  votes = data ?? [];
}

async function refresh() {
  await Promise.all([loadPrompts(), loadVotes()]);
  if (!currentId || !prompts.some((p) => p.id === currentId)) pickNext();
  paintAll();
}

async function boot() {
  me = await requireMember();
  const { data: profiles } = await db.from('profiles').select('id, nickname');
  them = (profiles ?? []).find((p) => p.id !== me.id) ?? null;
  await refresh();

  db.channel('tot-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prompt_votes' }, () => refresh())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prompts' }, () => refresh())
    .subscribe();
}

boot().catch((err) => { console.error(err); say(`couldn't connect: ${err.message ?? err}`); });
