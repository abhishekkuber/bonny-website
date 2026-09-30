// Our weather: live weather for both homes (Open-Meteo: free, no key) and the
// two of them dressed for whichever home is selected.
//
// Preview any mood with ?mood=sunny|hot|cloudy|fog|rain|storm|cold|snow|night
import { CONFIG } from './config.js';
import { characterSVG } from './characters.js';
import { rand, toast } from './fx.js';

const HOMES = {
  her: { ...CONFIG.places.her, owner: CONFIG.her.nickname },
  him: { ...CONFIG.places.me, owner: CONFIG.me.nickname },
};
const REFRESH_MS = 15 * 60 * 1000;
const params = new URLSearchParams(location.search);
const forcedMood = params.get('mood');

const $ = (id) => document.getElementById(id);
const scene = $('scene');
const toggle = document.querySelector('.toggle');

// ---------------------------------------------------------------- scene

// Both characters share one coordinate system inside the scene svg: him at
// x=60, her 152 units to his right so their hands meet (see scene.js HOLD_GAP).
$('who-him').innerHTML = characterSVG('him', { attrs: 'x="60" y="20" width="140" height="362"' });
$('who-her').innerHTML = characterSVG('her', { attrs: 'x="212" y="20" width="140" height="362"' });
const chars = [...scene.querySelectorAll('.chr')];

const LOOKS = {
  loading: { eyes: 'normal', mouth: 'smile', blush: 0.45 },
  sunny: { eyes: 'normal', mouth: 'grin', blush: 0.5, acc: ['sunglasses'] },
  hot: { eyes: 'normal', mouth: 'o', blush: 0.8, acc: ['sunglasses', 'sweat'] },
  cloudy: { eyes: 'normal', mouth: 'smile', blush: 0.45, ly: -3 },
  fog: { eyes: 'normal', mouth: 'o', blush: 0.45 },
  rain: { eyes: 'happy', mouth: 'smile', blush: 0.6, ly: -2 },
  storm: { eyes: 'surprised', mouth: 'o', blush: 0.5 },
  cold: { eyes: 'closed', mouth: 'teeth', blush: 0.95, acc: ['scarf'] },
  snow: { eyes: 'closed', mouth: 'teeth', blush: 0.95, acc: ['scarf'] },
  night: { eyes: 'closed', mouth: 'smile', blush: 0.4 },
};

function dress(mood) {
  const look = LOOKS[mood];
  for (const c of chars) {
    c.dataset.eyes = look.eyes;
    c.dataset.mouth = look.mouth;
    c.style.setProperty('--blush', look.blush);
    c.style.setProperty('--ly', `${look.ly ?? 0}px`);
    c.classList.remove('acc-sunglasses', 'acc-scarf', 'acc-sweat');
    for (const a of look.acc ?? []) c.classList.add(`acc-${a}`);
  }
  scene.dataset.mood = mood;
  document.body.dataset.mood = mood;
}

// ---------------------------------------------------------------- sky particles

function fill(id, count, make) {
  const box = $(id);
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    make(s.style);
    box.append(s);
  }
}
fill('stars', 70, (s) => {
  s.left = `${rand(0, 100)}%`;
  s.top = `${rand(0, 70)}%`;
  s.setProperty('--dur', `${rand(2, 5).toFixed(1)}s`);
  s.setProperty('--delay', `${-rand(0, 5).toFixed(1)}s`);
});
fill('clouds', 6, (s) => {
  s.top = `${rand(4, 55)}%`;
  s.setProperty('--w', `${Math.round(rand(140, 280))}px`);
  s.setProperty('--o', rand(0.6, 0.95).toFixed(2));
  s.setProperty('--dur', `${Math.round(rand(60, 120))}s`);
  s.setProperty('--delay', `${-Math.round(rand(0, 120))}s`);
});
fill('rain', 110, (s) => {
  s.left = `${rand(0, 105)}%`;
  s.setProperty('--len', `${Math.round(rand(40, 80))}px`);
  s.setProperty('--dur', `${rand(0.6, 1.1).toFixed(2)}s`);
  s.setProperty('--delay', `${-rand(0, 1.2).toFixed(2)}s`);
});
fill('snow', 70, (s) => {
  s.left = `${rand(0, 100)}%`;
  s.setProperty('--size', `${Math.round(rand(4, 10))}px`);
  s.setProperty('--dur', `${rand(8, 16).toFixed(1)}s`);
  s.setProperty('--delay', `${-rand(0, 16).toFixed(1)}s`);
});

// ---------------------------------------------------------------- weather data

// WMO weather codes → words
const CONDITIONS = {
  0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'foggy', 48: 'freezing fog',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 56: 'freezing drizzle', 57: 'freezing drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'rain showers', 81: 'rain showers', 82: 'violent showers',
  85: 'snow showers', 86: 'heavy snow showers',
  95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'thunderstorm with hail',
};

function moodFor(cur) {
  const code = cur.weather_code;
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (cur.temperature_2m < 10) return 'cold';
  if (!cur.is_day) return 'night';
  if (code <= 2) return cur.temperature_2m >= 32 ? 'hot' : 'sunny';
  if (code === 45 || code === 48) return 'fog';
  return 'cloudy';
}

const LINES = {
  sunny: (c) => `sunglasses on. it's sunny in ${c} 😎`,
  hot: (c) => `it's properly hot in ${c}. stay hydrated 🥵`,
  cloudy: (c) => `grey skies over ${c}, still cute though ☁️`,
  fog: (c) => `can't see a thing in ${c} 🌫️`,
  rain: (c) => `sharing an umbrella in ${c} ☔`,
  storm: (c) => `thunder in ${c}! hold on tight ⛈️`,
  cold: (c) => `brr. it's freezing in ${c} 🥶`,
  snow: (c) => `it's snowing in ${c} ❄️`,
  night: (c) => `it's night in ${c}. sleepy time 🌙`,
};

let data = null; // { her: {...}, him: {...} }
let home = 'her';
try { if (localStorage.getItem('bonny.weatherHome') === 'him') home = 'him'; } catch {}

async function load() {
  const order = ['her', 'him'];
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: order.map((h) => HOMES[h].lat).join(','),
    longitude: order.map((h) => HOMES[h].lon).join(','),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: 1,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json(); // one entry per location, same order
  data = Object.fromEntries(order.map((h, i) => [h, json[i]]));
}

const round = (n) => Math.round(n);

function render({ animate = false } = {}) {
  const place = HOMES[home];
  const other = HOMES[home === 'her' ? 'him' : 'her'];

  toggle.dataset.home = home;
  toggle.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.home === home));
  $('city').textContent = place.city;
  if (animate) {
    const card = document.querySelector('.wx__card');
    card.classList.remove('swap');
    void card.offsetWidth;
    card.classList.add('swap');
  }
  renderTime();

  if (!data) {
    dress(forcedMood ?? 'loading');
    return;
  }
  const w = data[home];
  const cur = w.current;
  const mood = forcedMood ?? moodFor(cur);
  dress(mood);

  $('temp').textContent = `${round(cur.temperature_2m)}°`;
  $('condition').textContent = CONDITIONS[cur.weather_code] ?? 'weather';
  $('line').textContent = LINES[mood](place.city);
  $('feels').textContent = `${round(cur.apparent_temperature)}°`;
  $('hilo').textContent = `${round(w.daily.temperature_2m_max[0])}° / ${round(w.daily.temperature_2m_min[0])}°`;
  $('humidity').textContent = `${cur.relative_humidity_2m}%`;
  $('wind').textContent = `${round(cur.wind_speed_10m)} km/h`;

  const o = data[home === 'her' ? 'him' : 'her'].current;
  $('other').textContent = `meanwhile at ${other.owner}'s in ${other.city}: ${round(o.temperature_2m)}°, ${CONDITIONS[o.weather_code] ?? ''}`;
}

function renderTime() {
  const tz = HOMES[home].timezone;
  $('time').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date());
}

async function refresh() {
  try {
    await load();
  } catch {
    toast("couldn't reach the weather 🌧️ trying again soon");
  }
  render();
}

toggle.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.dataset.home === home) return;
  home = btn.dataset.home;
  try { localStorage.setItem('bonny.weatherHome', home); } catch {}
  render({ animate: true });
});

render();
refresh();
setInterval(refresh, REFRESH_MS);
setInterval(renderTime, 30 * 1000);
