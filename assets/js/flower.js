// The stitched flower: six round petals and a French-knot centre, filled with
// satin-stitch thread. The flower is a pie chart: each feeling gets a wedge as
// wide as its percentage, threaded in that feeling's colour.

import { FEELINGS, colorOf } from './emotion.js';

const RAD = Math.PI / 180;
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];
const R_IN = 22;   // threads start outside the centre knot
const R_OUT = 130; // ...and run past the petal edge; the clip trims them

/** Deterministic 0..1 "randomness" so a flower never changes between renders. */
const noise = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

function threads(a1, a2, color, step, fresh) {
  let out = '';
  let k = 0;
  for (let a = a1 + step / 2; a < a2; a += step, k++) {
    const t = (a - 90) * RAD; // 0 degrees = straight up, going clockwise
    const x1 = (Math.cos(t) * R_IN).toFixed(1);
    const y1 = (Math.sin(t) * R_IN).toFixed(1);
    const x2 = (Math.cos(t) * R_OUT).toFixed(1);
    const y2 = (Math.sin(t) * R_OUT).toFixed(1);
    const opacity = (0.72 + noise(a) * 0.28).toFixed(2); // thread sheen
    out += `<line${fresh ? ` class="thread-new" style="--d:${Math.round(k * 4)}ms"` : ''} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-opacity="${opacity}"/>`;
  }
  return out;
}

function knots() {
  let out = '';
  for (let i = 0; i < 46; i++) { // sunflower spiral packing
    const r = 3 + Math.sqrt(i / 46) * 20;
    const a = i * 137.5 * RAD;
    const x = (Math.cos(a) * r).toFixed(1);
    const y = (Math.sin(a) * r).toFixed(1);
    out += `<ellipse cx="${x}" cy="${y}" rx="3.3" ry="2.4" transform="rotate(${Math.round(noise(i) * 180)} ${x} ${y})" fill="#e9dca8" stroke="#bfae72" stroke-width="0.8"/>`;
  }
  return out;
}

/**
 * @param {Object|null} feelings  percentages {joy: 32, calm: 20, ...} adding up to 100, or null for a blank flower
 * @param {{id?: string, animate?: boolean, fine?: boolean}} opts
 *        animate: fade the threads in.  fine: fewer, thicker threads (small flowers).
 */
export function flowerSVG(feelings, { id = 'f', animate = false, fine = false } = {}) {
  const step = fine ? 3 : 1.2;
  let wedges = '';
  let angle = 0;
  if (feelings) {
    for (const key of Object.keys(FEELINGS)) {
      const span = (360 * (feelings[key] || 0)) / 100;
      if (!span) continue;
      wedges += threads(angle, angle + span, colorOf(key), step, animate);
      angle += span;
    }
  }

  const silhouette = PETAL_ANGLES.map((a) => `<circle cx="0" cy="-72" r="50" transform="rotate(${a})"/>`).join('')
    + '<circle r="52"/>';

  return `<svg class="flower" viewBox="-150 -150 300 300" role="img" aria-label="mood flower">
    <defs><clipPath id="${id}-sil">${silhouette}</clipPath></defs>
    <g clip-path="url(#${id}-sil)">
      <rect x="-150" y="-150" width="300" height="300" fill="${wedges ? 'none' : '#f6e6ee'}"/>
      <g stroke-width="${fine ? 3.4 : 1.9}" stroke-linecap="round">${wedges}</g>
    </g>
    <circle r="27" fill="#eadfae"/>
    ${knots()}
  </svg>`;
}
