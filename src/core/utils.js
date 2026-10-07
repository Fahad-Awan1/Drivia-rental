export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const icon = (name, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const arrowBtn = (label, href, variant = '', extra = '') =>
  `<a class="btn ${variant}" href="${href}" ${extra}>${label} <span class="btn__icon">${icon('arrow')}</span></a>`;

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

let toastTimer;
export function toast(msg, ms = 3200) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), ms);
}

// Run fn when el scrolls near the viewport (used to lazy-load heavy modules such as Three.js or Leaflet).
export function whenNear(el, fn, rootMargin = '300px') {
  if (!el) return;
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      fn();
    }
  }, { rootMargin });
  io.observe(el);
}

// Track visibility so render loops can pause off-screen.
export function visibility(el, cb) {
  const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: '100px' });
  io.observe(el);
  return () => io.disconnect();
}

export const stars = (n) =>
  Array.from({ length: 5 }, (_, i) => `<svg class="${i < Math.round(n) ? '' : 'off'}" aria-hidden="true"><use href="#i-star"/></svg>`).join('');

export function tweenNumber(el, to, { duration = 900, format = (v) => Math.round(v).toLocaleString('en-US') } = {}) {
  const from = parseFloat(el.dataset.value || '0');
  el.dataset.value = to;
  if (reducedMotion()) return void (el.textContent = format(to));
  const start = performance.now();
  const step = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const e = 1 - Math.pow(1 - t, 4);
    el.textContent = format(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export const params = () => new URLSearchParams(location.search);
