import { boot } from '../main.js';
import '../styles/pages/inner.css';
import '../styles/pages/car.css';
import { $, $$, icon, params, webglAvailable, whenNear } from '../core/utils.js';
import { cars, getCar, money } from '../data/cars.js';
import { quote, daysBetween } from '../data/pricing.js';
import { carCard, pic } from '../components/render.js';
import { initQuickSearch } from '../components/quick-search.js';
import { initTilt } from '../core/interactions.js';
import { PAINTS } from '../data/paints.js';

const car = getCar(params().get('id')) || getCar('ferrari-458');
if (params().get('id') !== car.id) history.replaceState(null, '', `?id=${car.id}`);

/* ---------- Fill content (before boot so reveals pick up final markup) ---------- */
document.title = `${car.name} rental from ${money(car.price)}/day | Drivia`;
$('meta[name="description"]').setAttribute('content', `Rent the ${car.name} with Drivia: ${car.hp} hp, ${car.seats} seats, from ${money(car.price)} per day. ${car.tagline}`);
$('[data-car-name]').textContent = car.name;
$('[data-car-crumb]').textContent = car.name;
$('[data-car-tagline]').textContent = car.tagline;
$('[data-car-price]').textContent = money(car.price);
$('[data-car-tags]').innerHTML = `<span class="tag">${car.category}</span><span class="tag"><i class="dot"></i>Available today</span>${car.model3d ? `<span class="tag tag--accent">${icon('rotate')} 3D showroom</span>` : ''}`;
$('[data-car-rating]').innerHTML = `${icon('star')}${car.rating.toFixed(1)} <span style="color:var(--muted);font-weight:400">(${car.trips} trips)</span>`;

const SPECS = [
  ['bolt', `${car.hp}`, 'Horsepower'],
  ['speed', `${car.accel}s`, '0–100 km/h'],
  ['speed', `${car.top}`, 'Top speed, km/h'],
  ['seat', `${car.seats}`, `Seats · ${car.doors} doors`],
  ['gear', car.transmission === 'Automatic' ? 'Auto' : 'Manual', 'Transmission'],
  [car.fuel === 'Electric' ? 'bolt' : 'fuel', car.range ? `${car.range} km` : car.fuel, car.range ? 'Range' : 'Fuel'],
];
$('[data-specs]').innerHTML = SPECS.map(([i, v, l], n) => `<div class="spec" data-reveal="tilt" style="--d:${n * 0.05}s">${icon(i)}<b>${v}</b><span>${l}</span></div>`).join('');

const sporty = car.category === 'Sports';
$('[data-about]').textContent =
  `${car.tagline} The ${car.name} pairs ${car.hp} horsepower with a ${car.transmission.toLowerCase()} gearbox, reaching 100 km/h in ${car.accel} seconds. ` +
  (sporty
    ? 'It’s perfect for coastal drives, mountain passes and making an entrance. Every Signature rental includes full coverage and door-to-door delivery.'
    : car.category === 'Electric'
      ? `With ${car.range} km of range, it covers a full day of exploring on one charge. We deliver it charged to 80% or more, with a charging card included.`
      : `With room for ${car.seats}, it’s a comfortable, dependable choice for city breaks, business trips and family holidays.`);
$('[data-km-included]').textContent = `${sporty ? 250 : ['SUV', 'Electric', 'Luxury'].includes(car.category) ? 350 : 200} km per day included`;
$('[data-min-age]').textContent = `${sporty ? 25 : ['Electric', 'Luxury'].includes(car.category) ? 23 : 21} years · licence held ${sporty ? '3' : '1'}+ years`;
$('[data-deposit]').textContent = `${money(quote({ carId: car.id }).deposit)}, released after return`;
$('[data-fuel-policy]').textContent = car.fuel === 'Electric' ? 'Return with 20%+ charge' : 'Full to full';

const similar = cars.filter((c) => c.id !== car.id && c.category === car.category).concat(cars.filter((c) => c.id !== car.id && c.category !== car.category && c.featured));
$('[data-similar]').innerHTML = similar.slice(0, 3).map((c) => carCard(c)).join('');
document.querySelectorAll('[data-similar] .car-card').forEach((el, i) => ((el.dataset.reveal = 'tilt'), el.style.setProperty('--d', `${i * 0.08}s`)));

boot();
initTilt($('[data-similar]'));

/* ---------- Stage: 3D showroom or photo ---------- */
const stage = $('[data-stage]');
$('[data-photo]').innerHTML = pic(car.img, car.name, '100vw', { eager: true });

if (car.model3d && webglAvailable()) {
  stage.classList.add('is-3d', 'is-loading');
  whenNear(stage, async () => {
    try {
      const { createShowroom } = await import('../three/showroom.js');
      const room = await createShowroom($('[data-showroom]'), $('[data-hotspots]'));
      stage.classList.remove('is-loading');
      $('[data-stage-ui]').hidden = false;
      $('[data-stage-hint]').hidden = false;
      bindStageUI(room);
    } catch (err) {
      console.warn('Showroom unavailable', err);
      stage.classList.remove('is-3d', 'is-loading');
    }
  }, '200px');
}

function bindStageUI(room) {
  const sw = $('[data-swatches]');
  sw.innerHTML = PAINTS.map((p, i) => `<button type="button" class="swatch" style="--c:${p.hex}" aria-pressed="${i === 0}" aria-label="${p.name}" title="${p.name}" data-hex="${p.hex}"></button>`).join('');
  sw.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    $$('.swatch', sw).forEach((s) => s.setAttribute('aria-pressed', String(s === b)));
    $('[data-paint-name]').textContent = b.title;
    room.paint(b.dataset.hex);
  });
  const toggle = (sel, fn) => {
    const b = $(sel);
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      fn(on, b);
    });
  };
  toggle('[data-theme-toggle]', (on, b) => {
    room.setTheme(on ? 'day' : 'night');
    stage.classList.toggle('is-day', on);
    b.querySelector('use').setAttribute('href', on ? '#i-moon' : '#i-sun');
    b.querySelector('span').textContent = on ? 'Night' : 'Day';
  });
  toggle('[data-drive]', (on) => room.setDrive(on));
  toggle('[data-rotate]', (on) => room.setAutoRotate(on));
}

/* ---------- Booking widget ---------- */
const form = $('[data-book-form]');
initQuickSearch(form);
const p = params();
if (p.get('loc')) form.loc.value = p.get('loc');

function renderQuote() {
  const days = daysBetween(form.from.value, form.to.value);
  const extras = $$('input[name="extras"]:checked', form).map((i) => i.value);
  const q = quote({ carId: car.id, days, extras });
  $('[data-quote]').innerHTML = `
    <div><dt>${money(car.price)} × ${days} day${days > 1 ? 's' : ''}</dt><dd>${money(q.base)}</dd></div>
    ${q.discount ? `<div class="discount"><dt>${days >= 28 ? 'Monthly' : 'Weekly'} discount</dt><dd>−${money(q.discount)}</dd></div>` : ''}
    ${q.extrasTotal ? `<div><dt>Extras</dt><dd>${money(q.extrasTotal)}</dd></div>` : ''}
    <div><dt>Taxes & fees (8%)</dt><dd>${money(q.tax)}</dd></div>
    <div class="total"><dt>Total</dt><dd>${money(q.total)}</dd></div>`;
}
form.addEventListener('input', renderQuote);
form.addEventListener('change', renderQuote);
renderQuote();
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const qs = new URLSearchParams({ car: car.id, loc: form.loc.value, from: form.from.value, to: form.to.value });
  const extras = $$('input[name="extras"]:checked', form).map((i) => i.value);
  if (extras.length) qs.set('extras', extras.join(','));
  location.href = `/booking.html?${qs}`;
});
