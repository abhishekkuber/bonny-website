// Shared animation helpers. Styles live in theme.css.

export const HEARTS = ['💖', '💗', '💕', '💘', '💞', '🩷'];

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const rand = (min, max) => min + Math.random() * (max - min);

/** Explode hearts outward from a screen point. */
export function burst(x, y, { count = 14, spread = 140, items = HEARTS } = {}) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    const angle = rand(0, Math.PI * 2);
    const dist = rand(spread * 0.4, spread);
    el.className = 'fx-heart';
    el.textContent = pick(items);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.fontSize = `${Math.round(rand(16, 32))}px`;
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * dist - 40}px`);
    el.style.setProperty('--rot', `${rand(-60, 60)}deg`);
    el.style.setProperty('--s', rand(0.8, 1.6).toFixed(2));
    el.style.setProperty('--dur', `${Math.round(rand(700, 1200))}ms`);
    el.addEventListener('animationend', () => el.remove());
    document.body.append(el);
  }
}

/** Hearts falling from the top of the screen for `duration` ms. */
export function rain(duration = 3000, { every = 45, items = HEARTS } = {}) {
  const timer = setInterval(() => {
    const el = document.createElement('span');
    el.className = 'fx-rain';
    el.textContent = pick(items);
    el.style.left = `${rand(0, 100)}vw`;
    el.style.fontSize = `${Math.round(rand(18, 38))}px`;
    el.style.setProperty('--rot', `${rand(-270, 270)}deg`);
    el.style.setProperty('--dur', `${Math.round(rand(2200, 3800))}ms`);
    el.addEventListener('animationend', () => el.remove());
    document.body.append(el);
  }, every);
  setTimeout(() => clearInterval(timer), duration);
}

/** Soft hearts drifting up in the background, forever. */
export function ambient(count = 16) {
  const layer = document.createElement('div');
  layer.className = 'ambient';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.textContent = pick(HEARTS);
    s.style.setProperty('--x', `${rand(0, 100)}%`);
    s.style.setProperty('--size', `${Math.round(rand(14, 34))}px`);
    s.style.setProperty('--dur', `${rand(14, 26).toFixed(1)}s`);
    s.style.setProperty('--delay', `${-rand(0, 26).toFixed(1)}s`);
    s.style.setProperty('--sway', `${rand(-60, 60)}px`);
    s.style.setProperty('--rot', `${rand(-90, 90)}deg`);
    layer.append(s);
  }
  document.body.prepend(layer);
}

/** Restartable CSS animation helper. */
export function replay(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // force reflow so the animation restarts
  el.classList.add(className);
}

export function shake(el = document.querySelector('main')) {
  replay(el, 'shake');
}

let toastEl;
let toastTimer;
export function toast(message, ms = 2200) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    document.body.append(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

/** Fade the page out, then navigate. */
export function leaveTo(href) {
  document.body.classList.add('leaving');
  setTimeout(() => { location.href = href; }, 480);
}
