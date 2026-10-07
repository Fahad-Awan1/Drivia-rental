// First-visit loader inspired by the reference: a counter climbs while flat, car-themed
// shapes pop in until they fill the screen, then a dark panel sweeps up and lifts away.
import { gsap } from '../core/motion.js';
import { $ } from '../core/utils.js';

const C = { ink: '#0e0e0f', champ: '#cdbba3', gold: '#b39c7e', red: '#a30d12', blue: '#10284a', amber: '#f5a524', sage: '#5f7a63', rust: '#c4562b' };
const BG = '#f1ede6';

// Flat silhouettes (viewBox 0 0 100 100), filled with one colour; BG punches holes.
const SHAPES = [
  // sports car (side)
  (f) => `<path fill="${f}" d="M6 64c1-9 9-13 21-15l13-12c6-5 18-5 26-1l13 10c9 2 15 6 15 14v6c0 2-2 3-4 3h-4a10 10 0 0 0-19 0H39a10 10 0 0 0-19 0h-9c-3 0-5-2-5-5z"/><circle cx="29" cy="70" r="8" fill="${f}"/><circle cx="77" cy="70" r="8" fill="${f}"/><circle cx="29" cy="70" r="3" fill="${BG}"/><circle cx="77" cy="70" r="3" fill="${BG}"/>`,
  // alloy wheel
  (f) => `<circle cx="50" cy="50" r="44" fill="${f}"/><circle cx="50" cy="50" r="30" fill="${BG}"/><circle cx="50" cy="50" r="10" fill="${f}"/>${[0, 72, 144, 216, 288].map((a) => `<rect x="46" y="18" width="8" height="26" rx="4" fill="${f}" transform="rotate(${a} 50 50)"/>`).join('')}`,
  // key
  (f) => `<circle cx="30" cy="50" r="22" fill="${f}"/><circle cx="24" cy="50" r="7" fill="${BG}"/><path fill="${f}" d="M48 44h44v12h-6v10h-10V56h-6v8H60v-8H48z"/>`,
  // steering wheel
  (f) => `<circle cx="50" cy="50" r="44" fill="${f}"/><circle cx="50" cy="50" r="33" fill="${BG}"/><path fill="${f}" d="M17 50h66v8H58l-4 26h-8l-4-26H17z"/><circle cx="50" cy="54" r="9" fill="${f}"/>`,
  // map pin
  (f) => `<path fill="${f}" d="M50 6a32 32 0 0 0-32 32c0 24 32 56 32 56s32-32 32-56A32 32 0 0 0 50 6z"/><circle cx="50" cy="38" r="12" fill="${BG}"/>`,
  // traffic cone
  (f) => `<path fill="${f}" d="M42 8h16l26 76H16z"/><path fill="${BG}" d="M35 38h30l4 12H31zm-6 22h42l4 12H25z"/><rect x="8" y="84" width="84" height="10" rx="3" fill="${f}"/>`,
  // speedometer
  (f) => `<path fill="${f}" d="M50 14a42 42 0 0 1 42 42c0 9-3 17-8 24H16c-5-7-8-15-8-24a42 42 0 0 1 42-42z"/><path fill="${BG}" d="M50 26a30 30 0 0 1 30 30c0 6-1 11-4 16H24c-3-5-4-10-4-16a30 30 0 0 1 30-30z"/><path fill="${f}" d="M47 58l20-22 4 4-21 21z"/><circle cx="50" cy="60" r="6" fill="${f}"/>`,
  // fuel drop / EV bolt
  (f) => `<path fill="${f}" d="M50 4C38 24 22 40 22 60a28 28 0 0 0 56 0C78 40 62 24 50 4z"/><path fill="${BG}" d="M54 36 38 62h12l-4 20 18-28H52z"/>`,
];

export function runLoader({ ready }) {
  const el = $('[data-loader]');
  if (!el || getComputedStyle(el).display === 'none') return Promise.resolve(false);
  const shapesEl = $('[data-loader-shapes]', el);
  const countEl = $('[data-loader-count]', el);
  const sweep = $('.loader__sweep', el);
  const palette = Object.values(C);

  // Jittered grid so shapes cover the whole screen without obvious repetition.
  const cols = innerWidth < 700 ? 4 : 7;
  const rows = innerWidth < 700 ? 7 : 4;
  const html = [];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5 + (Math.random() - 0.5) * 0.5) / cols) * 100;
      const y = ((r + 0.5 + (Math.random() - 0.5) * 0.5) / rows) * 100;
      const s = (innerWidth < 700 ? 22 : 15) + Math.random() * 8;
      const shape = SHAPES[n % SHAPES.length];
      const color = palette[(n * 3 + r) % palette.length];
      html.push(`<div class="loader__shape" style="--x:${x}%;--y:${y}%;--s:${s}vmax" data-r="${(Math.random() - 0.5) * 70}"><svg viewBox="0 0 100 100" aria-hidden="true">${shape(color)}</svg></div>`);
      n++;
    }
  }
  shapesEl.innerHTML = html.join('');
  const shapes = gsap.utils.shuffle([...shapesEl.children]);
  shapes.forEach((sh) => gsap.set(sh, { xPercent: -50, yPercent: -50, scale: 0, rotate: +sh.dataset.r - 40 }));

  const counter = { v: 0 };
  return new Promise((resolve) => {
    const tl = gsap.timeline({ paused: true });
    tl.to(counter, { v: 100, duration: 2.4, ease: 'power2.inOut', onUpdate: () => (countEl.textContent = Math.round(counter.v)) }, 0)
      .to(shapes, { scale: 1, rotate: '+=40', duration: 0.7, ease: 'back.out(2.2)', stagger: { each: 2.1 / shapes.length } }, 0.25)
      .to(countEl.parentElement, { scale: 0.6, opacity: 0, duration: 0.5, ease: 'power2.in' }, 2.35)
      .to(sweep, { yPercent: 0, duration: 0.8, ease: 'expo.inOut' }, 2.55)
      .add(() => resolve(true), 3.15)
      .to(el, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 3.2)
      .add(() => el.remove());
    gsap.set(sweep, { yPercent: 101, visibility: 'visible' });
    // Hold at ~90% until the hero photo is decoded, so the reveal never shows a blank frame.
    tl.addPause(2.05, () => ready.then(() => tl.play()));
    tl.play();
  });
}
