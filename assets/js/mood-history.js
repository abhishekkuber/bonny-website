// Mood history: a calendar of the month, each day showing both flowers,
// redrawn from the stored percentages.
import { db, requireMember } from './db.js';
import { ambient } from './fx.js';
import { FEELINGS } from './emotion.js';
import { flowerSVG } from './flower.js';

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

ambient(6);

$('legend').innerHTML = Object.values(FEELINGS)
  .map((f) => `<li><span class="dot" style="background:${f.color}"></span>${f.label}</li>`).join('');

const now = new Date();
const thisYear = now.getUTCFullYear();   // days are UTC, like the database
const thisMonth = now.getUTCMonth();
let year = thisYear;
let month = thisMonth;
let me;
let names = {};
let rows = [];
let openDay = null;

const dayKey = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;

async function load() {
  $('month-name').textContent = `${MONTHS[month]} ${year}`;
  $('next').disabled = year === thisYear && month === thisMonth;
  $('detail').hidden = true;
  openDay = null;

  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const { data, error } = await db.from('moods').select('*')
    .gte('day', dayKey(1)).lte('day', dayKey(last)).order('day');
  if (error) return say(`couldn't load this month: ${error.message}`);
  say('');
  rows = data ?? [];
  paint(last);
}

function paint(daysInMonth) {
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Monday first
  const today = dayKey(now.getUTCDate());
  let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="dow">${d}</div>`).join('');
  html += '<div class="blank"></div>'.repeat(lead);

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(d);
    const mine = rows.find((r) => r.day === key && r.author_id === me.id);
    const theirs = rows.find((r) => r.day === key && r.author_id !== me.id);
    const flowers = [mine, theirs].map((r, i) => r
      ? `<span class="cell__flower">${flowerSVG(r.feelings, { id: `c${d}${i}`, fine: true })}</span>` : '').join('');
    html += `<button type="button" class="cell${key === today ? ' is-today' : ''}${mine || theirs ? '' : ' is-empty'}" data-day="${key}" ${mine || theirs ? '' : 'disabled'}>
      <span class="cell__num">${d}</span><span class="cell__flowers">${flowers}</span></button>`;
  }
  $('calendar').innerHTML = html;
}

function showDay(key) {
  openDay = key;
  const people = rows.filter((r) => r.day === key)
    .sort((a, b) => (a.author_id === me.id ? -1 : 0) - (b.author_id === me.id ? -1 : 0));
  $('detail').innerHTML = `<h3 class="detail__date">${key}</h3><div class="detail__people">${people.map((r) => {
    const list = r.feelings
      ? Object.entries(FEELINGS).filter(([k]) => r.feelings[k]).sort((a, b) => r.feelings[b[0]] - r.feelings[a[0]])
        .map(([k, f]) => `<li><span class="dot" style="background:${f.color}"></span>${f.label}<b>${r.feelings[k]}%</b></li>`).join('')
      : '<li class="none">jev had not read anything</li>';
    return `<article class="person">
      <div class="person__flower">${flowerSVG(r.feelings, { id: `d${r.author_id.slice(0, 4)}` })}</div>
      <div><h4>${esc(names[r.author_id] ?? '?')}</h4><ul class="pcts">${list}</ul>
      ${r.note ? `<p class="words">${esc(r.note)}</p>` : ''}</div></article>`;
  }).join('')}</div>`;
  $('detail').hidden = false;
  $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

$('calendar').addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (cell && !cell.disabled) showDay(cell.dataset.day);
});
$('prev').addEventListener('click', () => { month--; if (month < 0) { month = 11; year--; } load(); });
$('next').addEventListener('click', () => { month++; if (month > 11) { month = 0; year++; } load(); });

const say = (msg) => { $('status').textContent = msg; $('status').hidden = !msg; };

(async () => {
  me = await requireMember();
  const { data: profiles } = await db.from('profiles').select('id, nickname');
  names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.nickname]));
  await load();
})().catch((err) => { console.error(err); say(`couldn't connect: ${err.message ?? err}`); });
