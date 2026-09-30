// Love letters: random love poems (PoetryDB: free, no key, public domain)
// mixed with curated lines from books (assets/data/quotes.js).
//
// PoetryDB has no "love poem" category, so we ask it for each poet's poems
// that mention love, keep the short ones, and double-check the poem really
// leans romantic (love words appear more than once) before showing it.
import { BOOK_QUOTES } from '../data/quotes.js';
import { ambient, burst, pick, replay, toast } from './fx.js';
import { startScene } from './scene.js';

const API = 'https://poetrydb.org';
const POETS = [
  'William Shakespeare', 'Elizabeth Barrett Browning', 'Emily Dickinson', 'Robert Burns',
  'Lord Byron', 'John Keats', 'Christina Rossetti', 'Percy Bysshe Shelley',
];
const MAX_LINES = 24;
const LOVE_WORDS = /\b(lov(e|ed|es|er|ers|ing|ely|eliest|'d|'st)|belov\w*|hearts?|kiss\w*|lips|darling|dearest|sweetest)\b/gi;
const MIN_LOVE_WORDS = 3;
// love-adjacent but not romantic
const NOT_ROMANTIC = /prayer|psalm|hymn|grace|elegy|epitaph|dirge|lament|funeral|death|grave|god|lord|saviour|christ/i;

const CACHE_KEY = 'bonny.poemTitles.v2';
const CACHE_TTL = 30 * 24 * 3600 * 1000;
const MODES = ['both', 'poems', 'quotes'];

const $ = (id) => document.getElementById(id);
const letter = $('letter');
const nextBtn = $('next');
const toggle = $('toggle');

ambient();
const mascots = startScene();

let mode = 'both';
try { if (MODES.includes(localStorage.getItem('bonny.loveMode'))) mode = localStorage.getItem('bonny.loveMode'); } catch {}

const recent = [];
const remember = (key) => {
  recent.push(key);
  if (recent.length > 30) recent.shift();
};

// ---------------------------------------------------------------- poems

async function get(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`poetrydb ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : []; // PoetryDB answers {status: 404} for "nothing found"
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
}

const titleLists = new Map();
function lovePoemTitles(poet) {
  if (!titleLists.has(poet)) {
    const cached = readCache()[poet];
    const p = cached && Date.now() - cached.t < CACHE_TTL
      ? Promise.resolve(cached.titles)
      : get(`/author,lines/${encodeURIComponent(poet)};love/title,linecount`).then((list) => {
        const titles = list
          .filter((x) => +x.linecount >= 4 && +x.linecount <= MAX_LINES && !/[;/]/.test(x.title) && !NOT_ROMANTIC.test(x.title))
          .map((x) => x.title);
        try {
          const all = readCache();
          all[poet] = { t: Date.now(), titles };
          localStorage.setItem(CACHE_KEY, JSON.stringify(all));
        } catch {}
        return titles;
      });
    p.catch(() => titleLists.delete(poet));
    titleLists.set(poet, p);
  }
  return titleLists.get(poet);
}

async function randomPoem() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const poet = pick(POETS);
    const titles = (await lovePoemTitles(poet)).filter((t) => !recent.includes(t));
    if (!titles.length) continue;
    const title = pick(titles);
    const found = await get(`/title/${encodeURIComponent(title)}:abs/title,author,lines`);
    const poem = found.find((p) => p.author === poet) ?? found[0];
    if (!poem) continue;
    const loveWords = poem.lines.join(' ').match(LOVE_WORDS)?.length ?? 0;
    if (loveWords < MIN_LOVE_WORDS) continue; // love only in passing: not a love poem
    return { kind: 'poem', key: poem.title, title: poem.title, by: poem.author, lines: poem.lines };
  }
  throw new Error('no love poem found');
}

// ---------------------------------------------------------------- quotes

function randomQuote() {
  const fresh = BOOK_QUOTES.filter((q) => !recent.includes(q.text));
  const q = pick(fresh.length ? fresh : BOOK_QUOTES);
  return { kind: 'quote', key: q.text, ...q };
}

// ---------------------------------------------------------------- ui

let upcomingPoem = null; // prefetched so "another one" feels instant
let loading = false;

async function nextLetter() {
  const wantPoem = mode === 'poems' || (mode === 'both' && Math.random() < 0.5);
  if (!wantPoem) return randomQuote();
  try {
    const poem = upcomingPoem ? await upcomingPoem : null;
    upcomingPoem = null;
    return poem ?? (await randomPoem());
  } catch (err) {
    if (mode === 'poems') throw err;
    return randomQuote(); // poetry site down: fall back to a book quote
  } finally {
    upcomingPoem = randomPoem().catch(() => null);
  }
}

async function show() {
  if (loading) return;
  loading = true;
  nextBtn.disabled = true;
  letter.classList.add('is-loading');
  try {
    render(await nextLetter());
  } catch {
    toast("the poets aren't answering right now ✉️ try again");
  } finally {
    loading = false;
    nextBtn.disabled = false;
    letter.classList.remove('is-loading');
  }
}

function render(item) {
  remember(item.key);
  const body = $('body');
  body.replaceChildren();

  if (item.kind === 'poem') {
    $('kind').textContent = 'a poem';
    $('title').textContent = item.title;
    let stanza = document.createElement('p');
    stanza.className = 'stanza';
    for (const line of item.lines) {
      if (!line.trim()) {
        if (stanza.childNodes.length) body.append(stanza);
        stanza = document.createElement('p');
        stanza.className = 'stanza';
        continue;
      }
      const span = document.createElement('span');
      span.className = 'line';
      span.textContent = line.trim();
      stanza.append(span);
    }
    if (stanza.childNodes.length) body.append(stanza);
    $('by').textContent = `— ${item.by}`;
  } else {
    $('kind').textContent = 'from a book';
    $('title').textContent = '';
    const q = document.createElement('blockquote');
    q.className = 'letter__quote';
    q.textContent = item.text;
    body.append(q);
    const by = $('by');
    by.replaceChildren(`— ${item.by}, `);
    const i = document.createElement('i');
    i.textContent = item.from;
    by.append(i);
  }

  letter.scrollTop = 0;
  replay(letter, 'deliver');
  if (Math.random() < 0.3) pick([mascots.him, mascots.her]).emote(pick(['🥹', '💕', '🥰']));
}

function setMode(m) {
  mode = m;
  toggle.style.setProperty('--i', MODES.indexOf(m));
  toggle.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === m));
  try { localStorage.setItem('bonny.loveMode', m); } catch {}
}

toggle.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.dataset.mode === mode) return;
  setMode(b.dataset.mode);
  show();
});
nextBtn.addEventListener('click', show);
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') show();
});
letter.addEventListener('dblclick', (e) => {
  burst(e.clientX, e.clientY, { count: 18, spread: 130 });
  mascots.her.emote('💕');
});

setMode(mode);
show();
