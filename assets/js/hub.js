import { ambient, burst, leaveTo, pick, toast } from './fx.js';
import { startScene } from './scene.js';

ambient();
startScene();

const TEASES = ['coming soon 🛠️💕', 'patience, bonny 😌', 'still being built with love', 'soon soon soon'];

document.querySelectorAll('.soon').forEach((tile) => {
  tile.addEventListener('click', (e) => {
    burst(e.clientX, e.clientY, { count: 8, spread: 90 });
    toast(pick(TEASES));
  });
});

document.querySelectorAll('a.tile').forEach((tile) => {
  tile.addEventListener('click', (e) => {
    e.preventDefault();
    burst(e.clientX, e.clientY, { count: 10, spread: 100 });
    leaveTo(tile.href);
  });
});

const repay = document.getElementById('repay');
repay.addEventListener('click', (e) => {
  e.preventDefault();
  leaveTo(repay.href);
});

// Today's moods under the title: each person's strongest feeling, once they've saved one.
(async () => {
  const { db, whoami } = await import('./db.js');
  if (!(await whoami())) return;
  const { FEELINGS } = await import('./emotion.js');
  const day = new Date().toISOString().slice(0, 10);
  const [{ data: rows }, { data: people }] = await Promise.all([
    db.from('moods').select('author_id, feelings').eq('day', day),
    db.from('profiles').select('id, nickname'),
  ]);
  const name = Object.fromEntries((people ?? []).map((p) => [p.id, p.nickname]));
  const parts = (rows ?? []).filter((r) => r.feelings).map((r) => {
    const top = Object.keys(FEELINGS).reduce((a, b) => (r.feelings[b] > r.feelings[a] ? b : a));
    return `<span class="mood-chip"><i style="background:${FEELINGS[top].color}"></i>${name[r.author_id] ?? '?'} · ${FEELINGS[top].label.toLowerCase()}</span>`;
  });
  if (!parts.length) return;
  const el = document.getElementById('moods');
  el.innerHTML = parts.join('');
  el.hidden = false;
})().catch(() => {});

// A dot on the daily-question tile when they've asked something you haven't answered.
(async () => {
  const { db, whoami } = await import('./db.js');
  const me = await whoami();
  if (!me) return;
  const { data } = await db.from('asks').select('author_id, replies(id)').neq('author_id', me.id);
  const waiting = (data ?? []).filter((a) => !(Array.isArray(a.replies) ? a.replies.length : a.replies)).length;
  if (!waiting) return;
  const badge = document.createElement('span');
  badge.className = 'tile__badge';
  badge.textContent = waiting;
  badge.title = 'a question is waiting for you';
  document.querySelector('a.tile[href="pages/question.html"]')?.append(badge);
})().catch(() => {});

// "your turn" dot on a game tile when a match is waiting for you.
(async () => {
  const { db, whoami } = await import('./db.js');
  const me = await whoami();
  if (!me) return;
  const { data } = await db.from('matches').select('game').eq('status', 'active').eq('turn_id', me.id);
  const waiting = {};
  for (const m of data ?? []) waiting[m.game] = (waiting[m.game] ?? 0) + 1;
  for (const [game, n] of Object.entries(waiting)) {
    const tile = document.querySelector(`a.tile[data-game="${game}"]`);
    if (!tile) continue;
    const badge = document.createElement('span');
    badge.className = 'tile__badge';
    badge.textContent = 'your turn';
    tile.append(badge);
  }
})().catch(() => {});
