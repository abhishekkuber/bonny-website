// Daily question: you write a question for each other, the other answers.
import { db, requireMember } from './db.js';
import { ambient, burst, toast } from './fx.js';

const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10); // same UTC day the DB uses
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
let them;
let asks = [];          // newest first, each with .reply (or null)
let editingAsk = false; // reword mode for today's question
const editingReply = new Set();

const replyOf = (a) => (Array.isArray(a.replies) ? a.replies[0] : a.replies) ?? null;
const nameOf = (id) => (id === me.id ? 'you' : them?.nickname ?? '?');
const prettyDate = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

// ---------- my question for today ----------

function paintAsk() {
  const mine = asks.find((a) => a.author_id === me.id && a.day === today());
  const answered = mine && replyOf(mine);

  $('ask-title').textContent = `ask ${them?.nickname ?? 'them'} something`;
  $('ask-form').hidden = !!mine && !editingAsk;
  $('ask-today').hidden = !mine || editingAsk;

  if (mine) {
    $('ask-today-text').textContent = mine.text;
    $('ask-today-actions').hidden = !!answered; // can't change it once it's been answered
    if (editingAsk) {
      $('ask-text').value = $('ask-text').value || mine.text;
      $('ask-send').textContent = 'save 💭';
    }
  } else {
    $('ask-send').textContent = 'ask 💭';
  }
}

$('ask-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('ask-text').value.trim();
  if (!text) return;
  const mine = asks.find((a) => a.author_id === me.id && a.day === today());
  $('ask-send').disabled = true;
  const { error } = mine
    ? await db.from('asks').update({ text }).eq('id', mine.id)
    : await db.from('asks').insert({ text });
  $('ask-send').disabled = false;
  if (error) { console.error(error); return say(`couldn't send that: ${error.message}`); }

  say('');
  $('ask-text').value = '';
  editingAsk = false;
  toast(mine ? 'reworded 💭' : 'sent 💭');
  if (!mine) {
    const r = $('ask-send').getBoundingClientRect();
    burst(r.left + r.width / 2, r.top, { count: 8, spread: 90 });
  }
  load();
});

$('ask-edit').addEventListener('click', () => { editingAsk = true; $('ask-text').value = ''; paintAsk(); $('ask-text').focus(); });
$('ask-delete').addEventListener('click', async () => {
  const mine = asks.find((a) => a.author_id === me.id && a.day === today());
  if (!mine) return;
  const { error } = await db.from('asks').delete().eq('id', mine.id);
  if (error) return say(`couldn't take that back: ${error.message}`);
  load();
});

// "need an idea?" pulls from the question bank seeded in seed.sql
let ideas = null;
$('idea').addEventListener('click', async () => {
  if (!ideas) {
    const { data } = await db.from('question_bank').select('text').eq('active', true);
    ideas = (data ?? []).map((q) => q.text);
  }
  if (!ideas.length) return toast('no ideas in the bank yet 🤷');
  $('ask-text').value = ideas[Math.floor(Math.random() * ideas.length)];
  $('ask-text').focus();
});

// ---------- the feed ----------

function answerForm(ask, existing) {
  const form = el('form', 'answer-form');
  const box = el('textarea');
  box.maxLength = 2000;
  box.rows = 3;
  box.required = true;
  box.placeholder = 'your answer…';
  box.value = existing?.body ?? '';
  const send = el('button', 'btn', existing ? 'save answer' : 'answer 💌');
  send.type = 'submit';
  form.append(box, send);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = box.value.trim();
    if (!body) return;
    send.disabled = true;
    const { error } = await db.from('replies').upsert({ ask_id: ask.id, body }, { onConflict: 'ask_id' });
    send.disabled = false;
    if (error) { console.error(error); return say(`couldn't send that: ${error.message}`); }
    say('');
    editingReply.delete(ask.id);
    toast('answered 💌');
    const r = send.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top, { count: 10, spread: 100 });
    load();
  });
  return form;
}

function card(ask) {
  const mineAsk = ask.author_id === me.id;
  const reply = replyOf(ask);
  const needsMe = !mineAsk && !reply;

  const node = el('article', `qcard${needsMe ? ' is-waiting' : ''}`);
  node.append(el('p', 'qcard__meta', `${nameOf(ask.author_id)} asked · ${prettyDate(ask.created_at)}`));
  node.append(el('h3', 'qcard__q', ask.text));

  if (mineAsk) {
    if (reply) {
      node.append(el('p', 'qcard__who', `${them?.nickname ?? 'they'} answered`));
      node.append(el('p', 'qcard__a', reply.body));
    } else {
      node.append(el('p', 'qcard__pending', `waiting for ${them?.nickname ?? 'them'}… 🫧`));
    }
  } else if (!reply || editingReply.has(ask.id)) {
    node.append(answerForm(ask, reply));
  } else {
    node.append(el('p', 'qcard__who', 'you answered'));
    node.append(el('p', 'qcard__a', reply.body));
    const edit = el('button', 'btn btn--ghost btn--small', 'edit my answer');
    edit.type = 'button';
    edit.addEventListener('click', () => { editingReply.add(ask.id); paintFeed(); });
    node.append(edit);
  }
  return node;
}

function paintFeed() {
  const feed = $('feed');
  feed.replaceChildren();
  if (!asks.length) {
    feed.append(el('p', 'feed__empty', 'no questions yet. ask the first one 💭'));
    return;
  }
  // questions waiting on me first, then everything else newest first
  const waiting = asks.filter((a) => a.author_id !== me.id && !replyOf(a));
  const rest = asks.filter((a) => !waiting.includes(a));
  if (waiting.length) {
    feed.append(el('h2', 'feed__title', `waiting for you (${waiting.length})`));
    waiting.forEach((a) => feed.append(card(a)));
  }
  if (rest.length) {
    feed.append(el('h2', 'feed__title', waiting.length ? 'earlier' : 'our questions'));
    rest.forEach((a) => feed.append(card(a)));
  }
}

// ---------- load + live updates ----------

async function load() {
  const { data, error } = await db.from('asks').select('*, replies(*)').order('created_at', { ascending: false }).limit(60);
  if (error) return say(`couldn't load questions: ${error.message}`);
  asks = data ?? [];
  paintAsk();
  paintFeed();
}

async function boot() {
  me = await requireMember();
  const { data: profiles } = await db.from('profiles').select('id, nickname');
  them = (profiles ?? []).find((p) => p.id !== me.id) ?? null;
  await load();

  db.channel('qa-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'asks' }, () => load())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, () => load())
    .subscribe();
}

boot().catch((err) => { console.error(err); say(`couldn't connect: ${err.message ?? err}`); });
