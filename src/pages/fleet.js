import { boot } from '../main.js';
import { gsap, pageReady, RM } from '../core/motion.js';
import '../styles/pages/inner.css';
import '../styles/pages/fleet.css';
import { $, $$, reducedMotion, toast } from '../core/utils.js';
import { cars, CATEGORIES, money, getCar } from '../data/cars.js';
import { carCard, pic } from '../components/render.js';
import { initTilt } from '../core/interactions.js';
import { initRoads } from '../components/road.js';

boot();
initRoads();

const grid = $('[data-grid]');
const ui = {
  q: $('[data-q]'),
  sort: $('[data-sort]'),
  max: $('[data-max]'),
  seats: $('[data-seats]'),
  trans: $('[data-trans]'),
  fuel: $('[data-fuel]'),
};

/* ---------- State <-> URL ---------- */
const url = new URLSearchParams(location.search);
const state = {
  category: CATEGORIES.includes(url.get('category')) ? url.get('category') : '',
  q: url.get('q') || '',
  sort: url.get('sort') || 'featured',
  max: +url.get('max') || 1200,
  seats: +url.get('seats') || 0,
  trans: url.get('trans') || '',
  fuel: url.get('fuel') || '',
};
const writeUrl = () => {
  const p = new URLSearchParams();
  if (state.category) p.set('category', state.category);
  if (state.q) p.set('q', state.q);
  if (state.sort !== 'featured') p.set('sort', state.sort);
  if (state.max < 1200) p.set('max', state.max);
  if (state.seats) p.set('seats', state.seats);
  if (state.trans) p.set('trans', state.trans);
  if (state.fuel) p.set('fuel', state.fuel);
  history.replaceState(null, '', `${location.pathname}${p.size ? '?' + p : ''}`);
};

/* ---------- Render once, then filter by toggling/reordering nodes ---------- */
grid.innerHTML = cars.map((c) => carCard(c, { compare: true })).join('');
const nodes = new Map($$('.car-card', grid).map((n) => [n.dataset.id, n]));

const catsEl = $('[data-cats]');
const countIn = (cat) => cars.filter((c) => !cat || c.category === cat).length;
catsEl.innerHTML = ['', ...CATEGORIES]
  .map((c) => `<button class="chip" type="button" data-cat="${c}" aria-pressed="false">${c || 'All cars'}<small>${countIn(c)}</small></button>`)
  .join('');

const SORTS = {
  featured: (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  accel: (a, b) => a.accel - b.accel,
  hp: (a, b) => b.hp - a.hp,
  rating: (a, b) => b.rating - a.rating || b.trips - a.trips,
};

function matches(c) {
  const q = state.q.trim().toLowerCase();
  return (
    (!state.category || c.category === state.category) &&
    (!q || `${c.name} ${c.brand} ${c.category} ${c.fuel}`.toLowerCase().includes(q)) &&
    c.price <= state.max &&
    c.seats >= state.seats &&
    (!state.trans || c.transmission === state.trans) &&
    (!state.fuel || c.fuel === state.fuel)
  );
}

function syncControls() {
  $$('[data-cat]', catsEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.category)));
  ui.q.value = state.q;
  ui.sort.value = state.sort;
  ui.max.value = state.max;
  ui.seats.value = state.seats;
  ui.trans.value = state.trans;
  ui.fuel.value = state.fuel;
  $('[data-max-label]').textContent = state.max >= 1200 ? 'Any' : money(state.max);
}

function apply({ animate = true } = {}) {
  const list = cars.filter(matches).sort(SORTS[state.sort] || SORTS.featured);
  // FLIP: remember where visible cards were before re-ordering.
  const before = new Map();
  if (animate && !reducedMotion()) nodes.forEach((n, id) => !n.classList.contains('is-hidden') && before.set(id, n.getBoundingClientRect()));

  const visible = new Set(list.map((c) => c.id));
  list.forEach((c) => grid.append(nodes.get(c.id)));
  nodes.forEach((n, id) => n.classList.toggle('is-hidden', !visible.has(id)));

  if (animate && !reducedMotion()) {
    list.forEach((c, i) => {
      const n = nodes.get(c.id);
      const was = before.get(c.id);
      const now = n.getBoundingClientRect();
      if (was) {
        const dx = was.left - now.left;
        const dy = was.top - now.top;
        if (dx || dy) n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' });
      } else {
        n.animate([{ opacity: 0, transform: 'translateY(24px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: Math.min(i, 8) * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      }
    });
  }
  $('[data-count]').textContent = `Showing ${list.length} of ${cars.length} cars${state.category ? ` in ${state.category}` : ''}`;
  $('[data-empty]').hidden = list.length > 0;
  syncControls();
  writeUrl();
}

catsEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  state.category = b.dataset.cat;
  apply();
});
let qTimer;
ui.q.addEventListener('input', () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => ((state.q = ui.q.value), apply()), 180);
});
ui.sort.addEventListener('change', () => ((state.sort = ui.sort.value), apply()));
ui.max.addEventListener('input', () => {
  state.max = +ui.max.value;
  $('[data-max-label]').textContent = state.max >= 1200 ? 'Any' : money(state.max);
});
ui.max.addEventListener('change', () => apply());
ui.seats.addEventListener('change', () => ((state.seats = +ui.seats.value), apply()));
ui.trans.addEventListener('change', () => ((state.trans = ui.trans.value), apply()));
ui.fuel.addEventListener('change', () => ((state.fuel = ui.fuel.value), apply()));
$$('[data-reset]').forEach((b) =>
  b.addEventListener('click', () => {
    Object.assign(state, { category: '', q: '', sort: 'featured', max: 1200, seats: 0, trans: '', fuel: '' });
    apply();
  })
);
const more = $('[data-more]');
const panel = $('[data-panel]');
more.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  more.setAttribute('aria-expanded', String(!panel.hidden));
});
if (state.max < 1200 || state.seats || state.trans || state.fuel) more.click();

apply({ animate: false });
initTilt(grid);
// Cards are dealt in like a hand of cards once the page transition clears.
if (!RM) {
  const first = [...nodes.values()].filter((n) => !n.classList.contains('is-hidden')).slice(0, 9);
  gsap.set(first, { opacity: 0, y: 120, rotate: (i) => (i % 3 - 1) * 4, transformOrigin: '50% 100%' });
  pageReady.then(() => gsap.to(first, { opacity: 1, y: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity' }));
}

/* ---------- Compare (up to 3) ---------- */
const MAX_CMP = 3;
let compare = [];
try { compare = JSON.parse(sessionStorage.getItem('drivia-compare') || '[]').filter(getCar); } catch {}
const bar = $('[data-compare-bar]');
const modal = $('[data-compare-modal]');

function renderCompare() {
  try { sessionStorage.setItem('drivia-compare', JSON.stringify(compare)); } catch {}
  $$('[data-compare]', grid).forEach((b) => b.setAttribute('aria-pressed', String(compare.includes(b.dataset.compare))));
  $('[data-compare-items]').innerHTML = compare.map((id) => pic(getCar(id).img, getCar(id).name, '44px')).join('');
  bar.classList.toggle('is-on', compare.length > 0);
  $('[data-compare-open]').disabled = compare.length < 2;
}

grid.addEventListener('click', (e) => {
  const b = e.target.closest('[data-compare]');
  if (!b) return;
  const id = b.dataset.compare;
  if (compare.includes(id)) compare = compare.filter((x) => x !== id);
  else if (compare.length >= MAX_CMP) return toast(`You can compare up to ${MAX_CMP} cars.`);
  else compare.push(id);
  renderCompare();
  if (compare.length === 1) toast('Added. Pick one more car to compare.');
});
$('[data-compare-clear]').addEventListener('click', () => ((compare = []), renderCompare()));

const ROWS = [
  ['Price / day', (c) => money(c.price), (c) => -c.price],
  ['Category', (c) => c.category],
  ['Power', (c) => `${c.hp} hp`, (c) => c.hp],
  ['0–100 km/h', (c) => `${c.accel} s`, (c) => -c.accel],
  ['Top speed', (c) => `${c.top} km/h`, (c) => c.top],
  ['Seats', (c) => c.seats, (c) => c.seats],
  ['Transmission', (c) => c.transmission],
  ['Fuel', (c) => (c.range ? `Electric · ${c.range} km` : c.fuel)],
  ['Rating', (c) => `★ ${c.rating.toFixed(1)} (${c.trips} trips)`, (c) => c.rating],
];

function openCompare() {
  const list = compare.map(getCar);
  const head = list.map((c) => `<th scope="col">${pic(c.img, c.name, '240px')}<b>${c.name}</b></th>`).join('');
  const body = ROWS.map(([label, fmt, score]) => {
    const best = score ? Math.max(...list.map(score)) : null;
    return `<tr><th scope="row">${label}</th>${list.map((c) => `<td class="${score && score(c) === best ? 'best' : ''}">${fmt(c)}</td>`).join('')}</tr>`;
  }).join('');
  const book = `<tr><th></th>${list.map((c) => `<td><a class="btn btn--sm" href="/booking.html?car=${c.id}">Book <span class="btn__icon"><svg><use href="#i-arrow"/></svg></span></a></td>`).join('')}</tr>`;
  $('[data-compare-table]').innerHTML = `<table><thead><tr><th></th>${head}</tr></thead><tbody>${body}${book}</tbody></table>`;
  modal.classList.add('is-open');
  window.__lenis?.stop();
  $('[data-compare-close]').focus();
}
const closeCompare = () => {
  modal.classList.remove('is-open');
  window.__lenis?.start();
};
$('[data-compare-open]').addEventListener('click', openCompare);
$('[data-compare-close]').addEventListener('click', closeCompare);
modal.addEventListener('click', (e) => e.target === modal && closeCompare());
document.addEventListener('keydown', (e) => e.key === 'Escape' && modal.classList.contains('is-open') && closeCompare());
renderCompare();

