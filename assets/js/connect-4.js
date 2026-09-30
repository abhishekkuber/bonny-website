// Connect 4: turn-based and asynchronous, one row per game in `matches`.
// Board is a flat array of 42 cells, index = row * 7 + col, row 0 is the top.
import { db, requireMember } from './db.js';
import { ambient, burst, toast } from './fx.js';
import { abandonMatch, createMatch, loadMatches, nextFirstMover, submitMove, tally, watchMatches } from './match.js';

const GAME = 'connect-4';
const COLS = 7;
const ROWS = 6;
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]]; // right, down, down-right, down-left

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
let matches = [];     // newest first
let sawFinish = null; // id of a finished game we've already celebrated

const nameOf = (id) => (id === me.id ? 'you' : them?.nickname ?? '?');

/** The game on screen: the active one, otherwise the latest one that finished. */
const current = () => matches.find((m) => m.status === 'active') ?? matches.find((m) => m.status !== 'abandoned') ?? null;

/** The four winning cells, { line }, or { draw: true } when the board is full, else null. */
function outcome(board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const mark = board[r * COLS + c];
      if (!mark) continue;
      for (const [dr, dc] of DIRS) {
        const line = [];
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr * COLS + cc] !== mark) break;
          line.push(rr * COLS + cc);
        }
        if (line.length === 4) return { line };
      }
    }
  }
  return board.every(Boolean) ? { draw: true } : null;
}

/** Lowest empty cell in a column, or -1 if it's full. */
function landing(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) if (!board[r * COLS + col]) return r * COLS + col;
  return -1;
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
    chip.append(el('span', `disc disc--${m.state.marks[id]} disc--chip`), el('span', '', nameOf(id)));
    box.append(chip);
  }
}

function paintBoard(m) {
  const frame = $('board');
  frame.replaceChildren();
  const board = m?.state.board ?? Array(COLS * ROWS).fill(null);
  const myTurn = m?.status === 'active' && m.turn_id === me.id;
  const myMark = m?.state.marks?.[me.id];

  for (let c = 0; c < COLS; c++) {
    const col = el('button', 'col');
    col.type = 'button';
    col.setAttribute('aria-label', `drop in column ${c + 1}`);
    col.disabled = !myTurn || landing(board, c) < 0;
    col.append(el('span', `ghost disc disc--${myMark ?? 'r'}`)); // preview above the column on hover

    for (let r = 0; r < ROWS; r++) {
      const i = r * COLS + c;
      const hole = el('span', 'hole');
      if (board[i]) {
        const disc = el('span', `disc disc--${board[i]}${m.state.last === i ? ' is-last' : ''}${m.state.line?.includes(i) ? ' is-win' : ''}`);
        disc.style.setProperty('--fall', r + 1);
        hole.append(disc);
      }
      col.append(hole);
    }
    col.addEventListener('click', () => play(c));
    frame.append(col);
  }
}

function paintLine(m) {
  let text = '';
  if (!m) text = them ? '' : 'the other player has not joined yet 🫧';
  else if (m.status === 'active') text = m.turn_id === me.id ? 'your turn 👆' : `waiting for ${them?.nickname ?? 'them'} 🫧`;
  else if (m.status === 'draw') text = "the board is full. it's a draw 🤝";
  else if (m.status === 'won') text = m.winner_id === me.id ? 'four in a row, you won! 🎉' : `${nameOf(m.winner_id)} won. rematch? 😏`;
  $('line').textContent = text;

  // celebrate once when a game ends while you're looking
  if (m && m.status === 'won' && m.winner_id === me.id && sawFinish !== m.id) {
    sawFinish = m.id;
    burst(innerWidth / 2, innerHeight / 3, { count: 24, spread: 220 });
  } else if (m && m.status !== 'active') sawFinish = m.id;
}

// ---------- actions ----------

async function play(col) {
  const m = current();
  if (!m || m.status !== 'active' || m.turn_id !== me.id) return;
  const spot = landing(m.state.board, col);
  if (spot < 0) return;

  const state = structuredClone(m.state);
  state.board[spot] = state.marks[me.id];
  state.last = spot;
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
  // r = rose, y = the other colour; whoever moves first is rose
  const state = { first, marks: { [first]: 'r', [other]: 'y' }, board: Array(COLS * ROWS).fill(null), line: null, last: null };
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
