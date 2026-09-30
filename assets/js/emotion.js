// Feelings and sentence helpers. Jev scores each feeling 0..2 per sentence.

export const FEELINGS = {
  joy:         { label: 'Joy',         color: '#c8973a' },
  calm:        { label: 'Calm',        color: '#6b9080' },
  sadness:     { label: 'Sadness',     color: '#4f7a99' },
  anxiety:     { label: 'Anxiety',     color: '#9a6fa8' },
  frustration: { label: 'Frustration', color: '#b5524a' },
  tenderness:  { label: 'Tenderness',  color: '#c9758f' },
};
export const colorOf = (key) => FEELINGS[key]?.color ?? '#b9aab2';

export const MAX_SENTENCES = 12;
export const BATCH = 8; // sentences per Jev request (the edge function's limit)

/** Sentences of `text`, in order. Punctuation is optional: a trailing fragment counts. */
export function splitSentences(text) {
  return (text.match(/[^.!?\n]+[.!?]*/g) ?? []).map((s) => s.trim()).filter((s) => s.length > 1).slice(0, MAX_SENTENCES);
}

/**
 * Raw scores {joy: 1.4, ...} -> whole-number percentages that add up to exactly 100,
 * so the pie always fills. Returns null when nothing registered at all.
 */
export function toPercents(scores) {
  const keys = Object.keys(FEELINGS);
  const total = keys.reduce((sum, k) => sum + (scores?.[k] || 0), 0);
  if (total < 0.05) return null;

  const raw = keys.map((k) => ((scores[k] || 0) / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  // hand the leftover points to the largest fractional parts
  raw.map((v, i) => [v - floors[i], i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => floors[i]++);
  return Object.fromEntries(keys.map((k, i) => [k, floors[i]]));
}
