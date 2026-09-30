// Same sky: real astronomy for London and Pune, computed in the browser with
// astronomy-engine (no API), plus NASA's Astronomy Picture of the Day.
import * as A from 'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/esm/astronomy.js';
import { CONFIG } from './config.js';
import { characterSVG } from './characters.js';
import { rand } from './fx.js';

const HOMES = {
  her: { ...CONFIG.places.her, who: 'her', owner: CONFIG.her.nickname, hours: CONFIG.skyDate.herHours },
  him: { ...CONFIG.places.me, who: 'him', owner: CONFIG.me.nickname, hours: CONFIG.skyDate.myHours },
};
for (const h of Object.values(HOMES)) h.obs = new A.Observer(h.lat, h.lon, 0);
const BOTH = [HOMES.her, HOMES.him];

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// ---------------------------------------------------------------- astro helpers

function altAz(body, date, obs) {
  const eq = A.Equator(body, date, obs, true, true);
  return A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
}
const riseSet = (body, obs, dir, from, days = 2) => A.SearchRiseSet(body, obs, dir, from, days)?.date ?? null;

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const compass = (az) => COMPASS[Math.round(az / 45) % 8];

function moonPhaseName(deg) {
  if (deg < 10 || deg >= 350) return 'new moon';
  if (deg < 80) return 'waxing crescent';
  if (deg < 100) return 'first quarter';
  if (deg < 170) return 'waxing gibbous';
  if (deg < 190) return 'full moon';
  if (deg < 260) return 'waning gibbous';
  if (deg < 280) return 'last quarter';
  return 'waning crescent';
}
const moonLit = (date) => A.Illumination('Moon', date).phase_fraction;

/** SVG moon with the right phase (northern hemisphere view). */
function moonSVG(phaseDeg, { id = 'm' } = {}) {
  const r = 50;
  const p = (phaseDeg * Math.PI) / 180;
  const tx = Math.abs(r * Math.cos(p));
  const outer = phaseDeg < 180 ? 1 : 0; // waxing: lit on the right
  const term = phaseDeg % 180 < 90 ? 0 : 1;
  const lit = `M0 ${-r} A ${r} ${r} 0 0 ${outer} 0 ${r} A ${tx} ${r} 0 0 ${term} 0 ${-r} Z`;
  return `<svg viewBox="-55 -55 110 110" aria-hidden="true">
    <defs><radialGradient id="${id}-g" cx="40%" cy="35%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f3dfb2"/></radialGradient></defs>
    <circle r="${r}" fill="#4a4270" opacity="0.55"/>
    <path d="${lit}" fill="url(#${id}-g)"/>
    <g fill="#e6cf9c" opacity="0.5"><circle cx="-14" cy="-12" r="7"/><circle cx="16" cy="10" r="9"/><circle cx="-6" cy="22" r="5"/><circle cx="22" cy="-20" r="4"/></g>
  </svg>`;
}

// ---------------------------------------------------------------- time helpers

const fmtCache = new Map();
function fmt(date, tz, opts) {
  const key = tz + JSON.stringify(opts);
  if (!fmtCache.has(key)) fmtCache.set(key, new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts }));
  return fmtCache.get(key).format(date);
}
const hhmm = (d, tz) => fmt(d, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayName = (d, tz) => fmt(d, tz, { weekday: 'short', day: 'numeric', month: 'short' });
const localHour = (d, tz) => {
  const [h, m] = hhmm(d, tz).split(':').map(Number);
  return h + m / 60;
};
const sameLocalDay = (a, b, tz) => dayName(a, tz) === dayName(b, tz);
function whenLocal(d, tz, now = new Date()) {
  if (sameLocalDay(d, now, tz)) return hhmm(d, tz);
  if (sameLocalDay(d, new Date(now.getTime() + DAY), tz)) return `tomorrow ${hhmm(d, tz)}`;
  return `${dayName(d, tz)} ${hhmm(d, tz)}`;
}
function inHowLong(ms) {
  const m = Math.round(ms / MIN);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}
// hours like [8, 25] run past midnight (25 = 1am)
const awake = (home, d) => {
  const h = localHour(d, home.timezone);
  const [from, to] = home.hours;
  return to <= 24 ? h >= from && h < to : h >= from || h < to - 24;
};

// ---------------------------------------------------------------- 1. sky windows

// Sky colours by sun altitude (degrees). Interpolated between stops.
const SKY = [
  { alt: -18, top: [10, 14, 40], bottom: [36, 30, 78], ground: [20, 18, 40] },
  { alt: -10, top: [24, 30, 84], bottom: [96, 72, 140], ground: [34, 30, 60] },
  { alt: -4, top: [66, 72, 150], bottom: [240, 150, 160], ground: [70, 60, 90] },
  { alt: 0, top: [110, 130, 205], bottom: [255, 176, 120], ground: [96, 100, 100] },
  { alt: 6, top: [130, 190, 250], bottom: [255, 222, 180], ground: [110, 150, 110] },
  { alt: 25, top: [90, 170, 245], bottom: [205, 232, 255], ground: [118, 160, 112] },
];
function skyColors(alt) {
  const a = Math.max(SKY[0].alt, Math.min(SKY.at(-1).alt, alt));
  let i = 0;
  while (i < SKY.length - 2 && a > SKY[i + 1].alt) i++;
  const [lo, hi] = [SKY[i], SKY[i + 1]];
  const t = (a - lo.alt) / (hi.alt - lo.alt);
  const mix = (k) => `rgb(${lo[k].map((v, j) => Math.round(v + (hi[k][j] - v) * t)).join(',')})`;
  return { top: mix('top'), bottom: mix('bottom'), ground: mix('ground') };
}

function dayState(home, now) {
  const alt = altAz('Sun', now, home.obs).altitude;
  const rising = altAz('Sun', new Date(now.getTime() + 10 * MIN), home.obs).altitude > alt;
  if (alt >= 6) return 'daytime';
  if (alt >= -1) return 'golden hour';
  if (alt >= -6) return rising ? 'dawn' : 'dusk';
  if (alt >= -12) return 'blue hour';
  return 'night';
}

// map an altitude/azimuth onto the window
const skyX = (az) => `${5 + (Math.max(60, Math.min(300, az)) - 60) / 240 * 90}%`;
const skyY = (alt) => `${82 - (Math.max(-5, Math.min(65, alt)) + 5) / 70 * 72}%`;

function buildWindow(home) {
  const w = $(`win-${home.who}`);
  w.innerHTML = `
    <div class="window__stars"></div>
    <div class="window__sun"></div>
    <div class="window__moon"></div>
    <svg class="window__ground" viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true">
      <path d="${home.who === 'her'
        ? 'M0 40 Q60 22 120 34 T240 30 T400 26 V70 H0 Z'
        : 'M0 30 Q50 14 110 30 Q170 44 230 24 Q300 6 400 32 V70 H0 Z'}"/>
    </svg>
    <div class="window__who" style="left:${home.who === 'her' ? 18 : 70}%">${characterSVG(home.who)}</div>
    <div class="window__label">
      <div><div class="window__city">${home.city}</div><div class="window__whose">${home.owner}'s sky</div></div>
      <div class="window__clock"></div>
    </div>
    <div class="window__state"></div>`;
  const stars = w.querySelector('.window__stars');
  for (let i = 0; i < 40; i++) {
    const s = el('span');
    s.style.left = `${rand(0, 100)}%`;
    s.style.top = `${rand(0, 70)}%`;
    s.style.setProperty('--dur', `${rand(2, 5).toFixed(1)}s`);
    s.style.setProperty('--delay', `${-rand(0, 5).toFixed(1)}s`);
    stars.append(s);
  }
  // looking up at the sky
  const chr = w.querySelector('.chr');
  chr.style.setProperty('--ly', '-3px');
  chr.style.setProperty('--lx', home.who === 'her' ? '2px' : '-2px');
}

function renderWindow(home, now) {
  const w = $(`win-${home.who}`);
  const sun = altAz('Sun', now, home.obs);
  const moon = altAz('Moon', now, home.obs);
  const c = skyColors(sun.altitude);
  w.style.setProperty('--top', c.top);
  w.style.setProperty('--bottom', c.bottom);
  w.style.setProperty('--ground', c.ground);
  w.style.setProperty('--stars', Math.max(0, Math.min(1, (-sun.altitude - 3) / 10)).toFixed(2));

  const sunEl = w.querySelector('.window__sun');
  sunEl.style.left = skyX(sun.azimuth);
  sunEl.style.top = skyY(sun.altitude);
  sunEl.style.opacity = sun.altitude > -2 ? 1 : 0;

  const moonEl = w.querySelector('.window__moon');
  moonEl.innerHTML = moonSVG(A.MoonPhase(now), { id: `wm-${home.who}` });
  moonEl.style.left = skyX(moon.azimuth);
  moonEl.style.top = skyY(moon.altitude);
  moonEl.style.opacity = moon.altitude > -2 ? (sun.altitude > 5 ? 0.55 : 1) : 0;

  w.querySelector('.window__clock').textContent = hhmm(now, home.timezone);

  const state = dayState(home, now);
  const set = riseSet('Sun', home.obs, -1, now);
  const rise = riseSet('Sun', home.obs, +1, now);
  const next = set && (!rise || set < rise) ? ['sunset', set] : ['sunrise', rise];
  const soon = next[1] && next[1] - now < 3 * HOUR ? `in ${inHowLong(next[1] - now)}` : `at ${hhmm(next[1], home.timezone)}`;
  w.querySelector('.window__state').textContent = `${state} · ${next[0]} ${soon}`;
}

// ---------------------------------------------------------------- 2. the moon

const moonUp = (home, d, min = 5) => altAz('Moon', d, home.obs).altitude > min;

function nextSharedMoon(now) {
  for (let t = now.getTime(); t < now.getTime() + 3 * DAY; t += 5 * MIN) {
    const d = new Date(t);
    if (BOTH.every((h) => moonUp(h, d))) return d;
  }
  return null;
}

function renderMoon(now) {
  const phase = A.MoonPhase(now);
  $('moon-big').innerHTML = moonSVG(phase, { id: 'big' });
  $('moon-phase').textContent = moonPhaseName(phase);
  $('moon-lit').textContent = `${Math.round(moonLit(now) * 100)}% lit · the same for both of you`;

  const list = $('moon-where');
  list.replaceChildren();
  for (const h of BOTH) {
    const pos = altAz('Moon', now, h.obs);
    const up = pos.altitude > 0;
    const li = el('li');
    li.append(el('span', `dot${up ? ' up' : ''}`));
    const b = el('b', null, h.owner);
    li.append(b);
    if (up) {
      const sets = riseSet('Moon', h.obs, -1, now);
      li.append(` · up in the ${compass(pos.azimuth)}, ${Math.round(pos.altitude)}° high${sets ? `, sets ${whenLocal(sets, h.timezone, now)}` : ''}`);
    } else {
      const rises = riseSet('Moon', h.obs, +1, now);
      li.append(` · below the horizon${rises ? `, rises ${whenLocal(rises, h.timezone, now)}` : ''}`);
    }
    list.append(li);
  }

  const banner = $('moon-banner');
  if (BOTH.every((h) => moonUp(h, now, 0))) {
    banner.className = 'banner live';
    banner.textContent = "look up 🌙 you're both under the moon right now";
  } else {
    const next = nextSharedMoon(now);
    banner.className = 'banner';
    banner.textContent = next
      ? `next time you're both under it: ${whenLocal(next, HOMES.her.timezone, now)} for ${HOMES.her.owner} · ${whenLocal(next, HOMES.him.timezone, now)} for ${HOMES.him.owner}`
      : 'the moon is hiding from one of you for a few days';
  }

  const km = Math.round(A.Libration(now).dist_km);
  $('moon-distance').textContent = `it's ${km.toLocaleString('en-GB')} km from both of you. you're only ${Math.round(distanceKm()).toLocaleString('en-GB')} km from each other.`;
}

function distanceKm() {
  const rad = (d) => (d * Math.PI) / 180;
  const [a, b] = BOTH;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------- 3. sky date

function skyDates(now, days = 30) {
  const step = 10 * MIN;
  const start = Math.ceil(now.getTime() / step) * step;
  const found = [];
  let cur = null;
  for (let t = start; t < start + days * DAY; t += step) {
    const d = new Date(t);
    const ok = BOTH.every((h) => awake(h, d) && moonUp(h, d, 5));
    if (ok) {
      cur ??= { start: d };
      cur.end = new Date(t + step);
    } else if (cur) {
      if (cur.end - cur.start >= 15 * MIN) found.push(cur);
      cur = null;
    }
  }
  if (cur && cur.end - cur.start >= 15 * MIN) found.push(cur);
  return found;
}

function icsFor(win) {
  const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//bonny//same sky//EN',
    'BEGIN:VEVENT',
    `UID:${stamp(win.start)}-skydate@bonny`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(win.start)}`,
    `DTEND:${stamp(win.end)}`,
    'SUMMARY:sky date 🌙',
    'DESCRIPTION:go outside and look up at the moon together',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
}

function renderSkyDate(now) {
  const wins = skyDates(now);
  const main = $('date-main');
  const more = $('date-more');
  main.replaceChildren();
  more.replaceChildren();
  if (!wins.length) {
    main.append(el('div', 'date-main__day', 'no sky date this month'));
    main.append(el('div', 'date-main__note', "the moon isn't up for both of you at a decent hour. try widening the hours in config.js"));
    return;
  }
  const [first, ...rest] = wins;
  const her = HOMES.her;
  const him = HOMES.him;
  const days = Math.round((first.start - now) / DAY);
  const when = sameLocalDay(first.start, now, her.timezone) ? 'today' : days <= 1 ? 'tomorrow' : `in ${days} days`;
  main.append(el('div', 'date-main__day', `${dayName(first.start, her.timezone)} · ${when}`));
  const times = el('div', 'date-main__times');
  for (const h of [her, him]) {
    const box = el('div');
    box.append(el('small', null, `${h.owner} · ${h.city}`));
    box.append(el('b', null, `${hhmm(first.start, h.timezone)}–${hhmm(first.end, h.timezone)}`));
    times.append(box);
  }
  main.append(times);

  const daylight = BOTH.filter((h) => altAz('Sun', first.start, h.obs).altitude > 0).map((h) => h.owner);
  const lit = Math.round(moonLit(first.start) * 100);
  main.append(el('div', 'date-main__note',
    `${moonPhaseName(A.MoonPhase(first.start))}, ${lit}% lit${daylight.length ? ` · daytime moon for ${daylight.join(' & ')}, look for it pale in the sky` : ''}`));

  const cal = el('a', 'btn btn--ghost', 'add to calendar');
  cal.href = icsFor(first);
  cal.download = 'sky-date.ics';
  main.append(cal);

  for (const w of rest.slice(0, 3)) {
    more.append(el('li', null, `also ${dayName(w.start, her.timezone)}: ${hhmm(w.start, her.timezone)} for ${her.owner} · ${hhmm(w.start, him.timezone)} for ${him.owner}`));
  }
}

// ---------------------------------------------------------------- 4. planets tonight

const PLANETS = [
  { name: 'Venus', color: '#fff2c4' },
  { name: 'Jupiter', color: '#f3d9a8' },
  { name: 'Mars', color: '#ff8a65' },
  { name: 'Saturn', color: '#e8cf8a' },
  { name: 'Mercury', color: '#c9c2bb' },
];
const brightness = (mag) => (mag < -2 ? 'dazzling' : mag < 0 ? 'very bright' : mag < 1.5 ? 'bright' : 'faint');

function darkWindow(home, now) {
  const sunAlt = altAz('Sun', now, home.obs).altitude;
  const start = sunAlt < -6 ? now : A.SearchAltitude('Sun', home.obs, -1, now, 1, -6)?.date;
  if (!start) return null;
  const end = A.SearchAltitude('Sun', home.obs, +1, start, 1, -6)?.date ?? new Date(start.getTime() + 10 * HOUR);
  return { start, end };
}

function planetsTonight(home, now) {
  const dark = darkWindow(home, now);
  if (!dark) return { dark, seen: [] };
  const seen = [];
  for (const p of PLANETS) {
    let first = null;
    let last = null;
    let best = null;
    for (let t = dark.start.getTime(); t <= dark.end.getTime(); t += 15 * MIN) {
      const d = new Date(t);
      const pos = altAz(p.name, d, home.obs);
      if (pos.altitude > 10) {
        first ??= d;
        last = d;
        if (!best || pos.altitude > best.alt) best = { alt: pos.altitude, az: pos.azimuth, t: d };
      }
    }
    if (best) seen.push({ ...p, first, last, best, mag: A.Illumination(p.name, best.t).mag });
  }
  seen.sort((a, b) => a.mag - b.mag);
  return { dark, seen };
}

function renderPlanets(now) {
  for (const h of BOTH) {
    const box = $(`planets-${h.who}`);
    box.replaceChildren();
    const { dark, seen } = planetsTonight(h, now);
    box.append(el('h3', null, `${h.owner} · ${h.city}`));
    box.append(el('div', 'muted small', dark ? `dark from ${hhmm(dark.start, h.timezone)} to ${hhmm(dark.end, h.timezone)}` : 'no proper darkness tonight'));
    const ul = el('ul');
    for (const p of seen) {
      const li = el('li', 'planet');
      const dot = el('span', 'planet__dot');
      dot.style.color = p.color;
      li.append(dot);
      const body = el('div');
      body.append(el('b', null, `${p.name}`), ` · ${brightness(p.mag)}`);
      const from = p.first.getTime() === dark.start.getTime() ? 'from dusk' : `from ${hhmm(p.first, h.timezone)}`;
      const until = dark.end - p.last <= 15 * MIN ? 'until dawn' : `until ${hhmm(p.last, h.timezone)}`;
      body.append(el('span', null, `${from} ${until}, highest (${Math.round(p.best.alt)}°) at ${hhmm(p.best.t, h.timezone)} in the ${compass(p.best.az)}`));
      li.append(body);
      ul.append(li);
    }
    if (!seen.length) ul.append(el('li', 'muted', 'no bright planets up tonight'));
    box.append(ul);
  }
}

// ---------------------------------------------------------------- 5. upcoming events

const FULL_MOON_NAMES = ['wolf', 'snow', 'worm', 'pink', 'flower', 'strawberry', 'buck', 'sturgeon', 'harvest', "hunter's", 'beaver', 'cold'];

// Annual meteor showers: [name, month (0-based), peak day, meteors/hour at best, note]
const SHOWERS = [
  ['Quadrantids', 0, 3, 110, 'short, sharp peak before dawn'],
  ['Lyrids', 3, 22, 18, 'best after midnight'],
  ['Eta Aquariids', 4, 6, 50, 'best before dawn, better from Pune'],
  ['Perseids', 7, 12, 100, 'the famous summer one, best after midnight'],
  ['Draconids', 9, 8, 10, 'best in the evening'],
  ['Orionids', 9, 21, 20, "bits of Halley's comet, best before dawn"],
  ['Leonids', 10, 17, 15, 'best before dawn'],
  ['Geminids', 11, 14, 150, 'the best shower of the year, bright and colourful'],
];

function upcomingEvents(now) {
  const end = new Date(now.getTime() + 365 * DAY);
  const events = [];
  const both = { her: true, him: true };

  // full moons
  let mq = A.SearchMoonQuarter(now);
  let fulls = 0;
  while (fulls < 3) {
    if (mq.quarter === 2) {
      const d = mq.time.date;
      const km = A.Libration(d).dist_km;
      const name = `${FULL_MOON_NAMES[d.getUTCMonth()]} moon`;
      events.push({
        date: d,
        title: km < 360000 ? `super full moon (${name})` : `full moon (${name})`,
        detail: km < 360000 ? `extra big and bright, only ${Math.round(km).toLocaleString('en-GB')} km away` : 'the same full moon for both of you',
        who: both,
      });
      fulls++;
    }
    mq = A.NextMoonQuarter(mq);
  }

  // lunar eclipses: visible where the moon is up at the peak
  let le = A.SearchLunarEclipse(now);
  while (le.peak.date < end) {
    const d = le.peak.date;
    events.push({
      date: d,
      title: `${le.kind} lunar eclipse`,
      detail: le.kind === 'total' ? 'the moon turns red' : le.kind === 'partial' ? 'a bite out of the moon' : 'the moon dims slightly',
      who: { her: moonUp(HOMES.her, d, 0), him: moonUp(HOMES.him, d, 0) },
    });
    le = A.NextLunarEclipse(le.peak);
  }

  // solar eclipses, per city
  const solar = new Map();
  for (const h of BOTH) {
    const se = A.SearchLocalSolarEclipse(now, h.obs);
    if (se.peak.time.date < end && se.peak.altitude > 0) {
      const key = se.peak.time.date.toISOString().slice(0, 10);
      const e = solar.get(key) ?? { date: se.peak.time.date, title: `${se.kind} solar eclipse`, detail: `${Math.round(se.obscuration * 100)}% of the sun covered at best. never look directly at it!`, who: { her: false, him: false } };
      e.who[h.who] = true;
      solar.set(key, e);
    }
  }
  events.push(...solar.values());

  // next equinox / solstice
  for (const year of [now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
    const s = A.Seasons(year);
    for (const [t, title, detail] of [
      [s.mar_equinox, 'march equinox', 'day and night the same length, spring begins'],
      [s.jun_solstice, 'june solstice', 'the longest day of the year for both of you'],
      [s.sep_equinox, 'september equinox', 'day and night the same length, autumn begins'],
      [s.dec_solstice, 'december solstice', 'the longest night of the year for both of you'],
    ]) {
      if (t.date > now && t.date < end) events.push({ date: t.date, title, detail, who: both });
    }
  }

  // meteor showers, with how much the moon will wash them out
  for (const [name, month, day, rate, note] of SHOWERS) {
    let d = new Date(Date.UTC(now.getUTCFullYear(), month, day, 2));
    if (d < now) d = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day, 2));
    if (d > end) continue;
    const lit = Math.round(moonLit(d) * 100);
    const moonNote = lit < 30 ? 'dark skies, great year for it' : lit > 70 ? `bright ${lit}% moon will wash out the faint ones` : `moon ${lit}% lit`;
    events.push({ date: d, title: `${name} meteor shower`, detail: `up to ${rate}/hour · ${note} · ${moonNote}`, who: both });
  }

  return events.sort((a, b) => a.date - b.date).slice(0, 10);
}

function renderEvents(now) {
  const list = $('events');
  list.replaceChildren();
  for (const e of upcomingEvents(now)) {
    const li = el('li', 'event');
    const date = el('div', 'event__date');
    date.append(el('b', null, fmt(e.date, HOMES.her.timezone, { day: 'numeric' })), el('small', null, fmt(e.date, HOMES.her.timezone, { month: 'short', year: '2-digit' })));
    const text = el('div');
    text.append(el('div', 'event__title', e.title), el('div', 'event__detail', e.detail));
    const who = el('div', 'event__who');
    for (const h of BOTH) who.append(el('span', `chip${e.who[h.who] ? ' yes' : ''}`, `${h.city} ${e.who[h.who] ? '✓' : '✗'}`));
    li.append(date, text, who);
    list.append(li);
  }
}

// ---------------------------------------------------------------- 6. NASA APOD

const APOD_CACHE = 'bonny.apod.v1';

async function loadApod() {
  const key = CONFIG.nasa.apiKey || 'DEMO_KEY';
  try {
    const cached = JSON.parse(localStorage.getItem(APOD_CACHE));
    if (cached && Date.now() - cached.t < 3 * HOUR) return cached.data;
  } catch {}
  const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}&thumbs=true`);
  if (!res.ok) throw new Error(`apod ${res.status}`);
  const data = await res.json();
  try { localStorage.setItem(APOD_CACHE, JSON.stringify({ t: Date.now(), data })); } catch {}
  return data;
}

async function renderApod() {
  const body = $('apod-body');
  try {
    const a = await loadApod();
    body.replaceChildren();
    const media = el('a', 'apod__media');
    media.href = a.hdurl || a.url;
    media.target = '_blank';
    media.rel = 'noopener';
    const img = el('img');
    img.src = a.media_type === 'video' ? a.thumbnail_url : a.url;
    img.alt = a.title;
    img.loading = 'lazy';
    media.append(img);

    const text = el('div');
    text.append(el('h3', 'apod__title', a.title));
    const credit = a.copyright ? ` · © ${a.copyright.replace(/\s+/g, ' ').trim()}` : '';
    text.append(el('p', 'apod__meta', `${a.date}${credit}${a.media_type === 'video' ? ' · video, click to watch' : ''}`));
    const p = el('p', 'apod__text', a.explanation);
    const more = el('button', 'apod__more', 'read more');
    more.type = 'button';
    more.addEventListener('click', () => {
      p.classList.toggle('open');
      more.textContent = p.classList.contains('open') ? 'less' : 'read more';
    });
    text.append(p, more);
    if (!CONFIG.nasa.apiKey) text.append(el('p', 'muted small', "using NASA's shared demo key; add your own in config.js"));
    body.append(media, text);
  } catch {
    body.replaceChildren(el('p', 'muted', "couldn't reach NASA right now 🛰️ (with the demo key this happens when it's busy)"));
  }
}

// ---------------------------------------------------------------- go

$('subtitle').textContent = `one moon, two cities, ${Math.round(distanceKm()).toLocaleString('en-GB')} km apart.`;
BOTH.forEach(buildWindow);

function tick() {
  const now = new Date();
  BOTH.forEach((h) => renderWindow(h, now));
  renderMoon(now);
}
function hourly() {
  const now = new Date();
  renderSkyDate(now);
  renderPlanets(now);
  renderEvents(now);
}

tick();
hourly();
renderApod();
setInterval(tick, MIN);
setInterval(hourly, HOUR);
