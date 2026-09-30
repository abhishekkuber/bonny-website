// Shared plumbing for turn-based games (tic tac toe, connect 4, ...), all stored in
// the `matches` table: one row per game, `state` is whatever that game needs.
//
//   game        'tic-tac-toe' | 'connect-4' | ...
//   state       jsonb; we always put { first: <uid>, ... } in it (who moved first)
//   turn_id     whose move it is (null once the game is over)
//   status      'active' | 'won' | 'draw' | 'abandoned'
//   winner_id   set when status = 'won'
//
// Games are asynchronous: you make a move, close the tab, and the other person
// finds it waiting. Realtime makes it live when you're both looking.

import { db } from './db.js';

export async function loadMatches(game) {
  const { data, error } = await db.from('matches').select('*').eq('game', game).order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function createMatch(game, state, firstMoverId) {
  const { data, error } = await db.from('matches').insert({ game, state, turn_id: firstMoverId }).select().single();
  if (error) throw error;
  return data;
}

/**
 * Play a move. The update only goes through if it is *still* my turn and the game
 * is still active, so two clicks (or two tabs) can never both land. Returns the
 * updated row, or null if the move was refused.
 *   result: { status: 'active', nextTurn } | { status: 'won' } | { status: 'draw' }
 */
export async function submitMove(match, meId, state, result) {
  const patch = {
    state,
    status: result.status,
    winner_id: result.status === 'won' ? meId : null,
    turn_id: result.status === 'active' ? result.nextTurn : null,
  };
  const { data, error } = await db.from('matches').update(patch)
    .eq('id', match.id).eq('turn_id', meId).eq('status', 'active').select();
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function abandonMatch(id) {
  const { error } = await db.from('matches').update({ status: 'abandoned', turn_id: null }).eq('id', id).eq('status', 'active');
  if (error) throw error;
}

/** Wins per person and draws across finished games. */
export function tally(matches) {
  const wins = {};
  let draws = 0;
  for (const m of matches) {
    if (m.status === 'won' && m.winner_id) wins[m.winner_id] = (wins[m.winner_id] ?? 0) + 1;
    if (m.status === 'draw') draws += 1;
  }
  return { wins, draws };
}

/** Alternate who moves first: whoever did not go first last time (me, the very first time). */
export function nextFirstMover(matches, meId, themId) {
  const last = matches.find((m) => m.state?.first);
  if (!last || !themId) return meId;
  return last.state.first === meId ? themId : meId;
}

/** Call onChange whenever any match of this game changes. Returns the channel. */
export function watchMatches(game, onChange) {
  return db.channel(`matches-${game}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `game=eq.${game}` }, onChange)
    .subscribe();
}
