// Tic tac toe: turn-based and asynchronous, one row per game in `matches`.
import { db, requireMember } from './db.js';
import { ambient, burst, toast } from './fx.js';
import { abandonMatch, createMatch, loadMatches, nextFirstMover, submitMove, tally, watchMatches } from './match.js';

const GAME = 'tic-tac-toe';
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

const $ = (id) => document.getElementById(id);
const say = (msg) => { $('status').textContent = msg; $('status').hidden = !msg; };

/** Tiny DOM helper: all text goes in via textContent, never innerHTML. */
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

ambient(6);

let me;
let them = null;
let matches = [];   // newest first
let sawFinish = null; // id of a finished game we've already celebrated

const glyph = (mark) => (mark === 'x' ? 'X' : 'O');
const nameOf = (id) => (id === me.id ? 'you' : them?.nickname ?? '?');

/** The game on screen: the active one, otherwise the latest one that finished. */
const current = () => matches.find((m) => m.status === 'active') ?? matches.find((m) => m.status !== 'abandoned') ?? null;

function outcome(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { line };
  }
  return board.every(Boolean) ? { draw: true } : null;
}

// ---------- painting ----------

function paint() {
  const m = current();
  paintScore();
  paintPlayers(m);
  paintBoard(m);
  paintLine(m);

  const active = m?.status === 'active';
  $('new').hidden = active || !them;
  $('new').textContent = m ? 'play again' : 'start a game';
  $('abandon').hidden = !active;
}

function paintScore() {
  const finished = matches.filter((x) => x.status === 'won' || x.status === 'draw');
  if (!finished.length) { $('score').textContent = them ? 'no games yet. start one!' : 'waiting for them to join…'; return; }
  const { wins, draws } = tally(finished);
  $('score').textContent = `you ${wins[me.id] ?? 0} · ${them?.nickname ?? 'them'} ${them ? wins[them.id] ?? 0 : 0} · ${draws} draw${draws === 1 ? '' : 's'}`;
}

function paintPlayers(m) {
  const box = $('players');
  box.replaceChildren();
  if (!m) return;
  for (const id of [me.id, them?.id].filter(Boolean)) {
    const chip = el('div', `player${m.turn_id === id ? ' is-turn' : ''}`);
    chip.append(el('span', `mark mark--${m.state.marks[id]}`, glyph(m.state.marks[id])), el('span', '', nameOf(id)));
    box.append(chip);
  }
}

function paintBoard(m) {
  const board = $('board');
  board.replaceChildren();
  const cells = m?.state.board ?? Array(9).fill(null);
  const myTurn = m?.status === 'active' && m.turn_id === me.id;

  cells.forEach((mark, i) => {
    const cell = el('button', 'cell');
    cell.type = 'button';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `square ${i + 1}${mark ? `, ${glyph(mark)}` : ''}`);
    if (mark) cell.append(el('span', `mark mark--${mark}${m.state.last === i ? ' is-last' : ''}`, glyph(mark)));
    if (m?.state.line?.includes(i)) cell.classList.add('is-win');
    cell.disabled = !myTurn || !!mark;
    cell.addEventListener('click', () => play(i));
    board.append(cell);
  });
}

function paintLine(m) {
  let text = '';
  if (!m) text = them ? '' : 'the other player has not joined yet 🫧';
  else if (m.status === 'active') text = m.turn_id === me.id ? 'your turn 👆' : `waiting for ${them?.nickname ?? 'them'} 🫧`;
  else if (m.status === 'draw') text = "it's a draw 🤝";
  else if (m.status === 'won') text = m.winner_id === me.id ? 'you won! 🎉' : `${nameOf(m.winner_id)} won. rematch? 😏`;
  $('line').textContent = text;

  // celebrate once when a game ends while you're looking
  if (m && m.status === 'won' && m.winner_id === me.id && sawFinish !== m.id) {
    sawFinish = m.id;
    burst(innerWidth / 2, innerHeight / 3, { count: 24, spread: 220 });
  } else if (m && m.status !== 'active') sawFinish = m.id;
}

// ---------- actions ----------

async function play(i) {
  const m = current();
  if (!m || m.status !== 'active' || m.turn_id !== me.id || m.state.board[i]) return;

  const state = structuredClone(m.state);
  state.board[i] = state.marks[me.id];
  state.last = i;
  const res = outcome(state.board);

  let result = { status: 'active', nextTurn: them.id };
  if (res?.line) { state.line = res.line; result = { status: 'won' }; }
  else if (res?.draw) result = { status: 'draw' };

  try {
    const updated = await submitMove(m, me.id, state, result);
    if (!updated) { say("that move didn't go through, the board has been refreshed"); return refresh(); }
    say('');
    matches = matches.map((x) => (x.id === updated.id ? updated : x));
    paint();
  } catch (err) {
    console.error(err);
    say(`couldn't play that: ${err.message}`);
  }
}

$('new').addEventListener('click', async () => {
  const first = nextFirstMover(matches, me.id, them?.id);
  const other = first === me.id ? them.id : me.id;
  const state = { first, marks: { [first]: 'x', [other]: 'o' }, board: Array(9).fill(null), line: null, last: null };
  try {
    const created = await createMatch(GAME, state, first);
    say('');
    matches = [created, ...matches];
    paint();
    toast(first === me.id ? 'you go first 💋' : `${them.nickname} goes first`);
  } catch (err) {
    console.error(err);
    say(`couldn't start a game: ${err.message}`);
  }
});

$('abandon').addEventListener('click', async () => {
  const m = current();
  if (!m || m.status !== 'active') return;
  if (!confirm('abandon this game? it will not count for either of you.')) return;
  try { await abandonMatch(m.id); await refresh(); } catch (err) { say(`couldn't abandon: ${err.message}`); }
});

// ---------- load + live updates ----------

async function refresh() {
  matches = await loadMatches(GAME);
  paint();
}

async function boot() {
  me = await requireMember();
  const { data: profiles } = await db.from('profiles').select('id, nickname');
  them = (profiles ?? []).find((p) => p.id !== me.id) ?? null;
  await refresh();
  watchMatches(GAME, () => refresh());
}

boot().catch((err) => { console.error(err); say(`couldn't connect: ${err.message ?? err}`); });
