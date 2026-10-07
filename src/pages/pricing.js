import { boot } from '../main.js';
import '../styles/pages/inner.css';
import '../styles/pages/pricing.css';
import { $, $$, icon, tweenNumber } from '../core/utils.js';
import { cars, getCar, money } from '../data/cars.js';
import { TIERS, EXTRAS, quote, discountFor } from '../data/pricing.js';
import { faqHtml, bindAccordion, pic } from '../components/render.js';
import { faq } from '../data/faq.js';
import { initRoads } from '../components/road.js';

/* ---------- Tiers ---------- */
const PERIODS = { day: { mult: 1, label: '/day' }, week: { mult: 7, label: '/week' }, month: { mult: 30, label: '/month' } };
const EXTRA_ICONS = { insurance: 'shield', driver: 'key', 'child-seat': 'seat', wifi: 'bolt', delivery: 'pin', chauffeur: 'car' };
const priceFor = (from, period) => from * PERIODS[period].mult * (1 - discountFor(PERIODS[period].mult));

$('[data-plans]').innerHTML = TIERS.map(
  (t, i) => `
  <article class="plan ${t.popular ? 'plan--popular' : ''}" data-reveal="tilt" style="--d:${i * 0.08}s">
    ${t.popular ? '<span class="tag tag--accent plan__badge">Most popular</span>' : ''}
    <div><h3>${t.name}</h3><p class="plan__blurb">${t.blurb}</p></div>
    <div>
      <div class="plan__price"><small>from</small><b data-plan-price="${t.from}">${money(t.from)}</b></div>
      <div class="plan__per" data-plan-per>per day, before taxes</div>
    </div>
    <div class="plan__cars">${t.cats.map((c) => `<a class="tag" href="/fleet.html?category=${c}">${c}</a>`).join('')}</div>
    <ul class="check-list" role="list">${t.perks.map((p) => `<li>${icon('check')}<span>${p}</span></li>`).join('')}</ul>
    <a class="btn ${t.popular ? 'btn--light' : ''} btn--block" href="/fleet.html?category=${t.cats[0]}">See ${t.name} cars <span class="btn__icon">${icon('arrow')}</span></a>
  </article>`
).join('');

const billing = $('[data-billing]');
billing.addEventListener('click', (e) => {
  const b = e.target.closest('[data-period]');
  if (!b) return;
  const period = b.dataset.period;
  $$('[data-period]', billing).forEach((x, i) => {
    const on = x === b;
    x.setAttribute('aria-checked', String(on));
    if (on) billing.style.setProperty('--idx', i);
  });
  $$('[data-plan-price]').forEach((el) => tweenNumber(el, priceFor(+el.dataset.planPrice, period), { format: money }));
  $$('[data-plan-per]').forEach((el) => (el.textContent = { day: 'per day, before taxes', week: 'per week · 15% off applied', month: 'per 30 days · 30% off applied' }[period]));
});
billing.addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const btns = $$('[data-period]', billing);
  const i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
  const next = btns[(i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length];
  next.click();
  next.focus();
});
$$('[data-plan-price]').forEach((el) => (el.dataset.value = el.dataset.planPrice));

/* ---------- Extras ---------- */
$('[data-extras]').innerHTML = EXTRAS.map(
  (x, i) => `
  <article class="extra" data-reveal="tilt" style="--d:${(i % 3) * 0.08}s">
    <div class="extra__top">
      <span class="extra__icon">${icon(EXTRA_ICONS[x.id] || 'plus')}</span>
      <span class="extra__n">${String(i + 1).padStart(2, '0')}</span>
    </div>
    <h3>${x.name}</h3>
    <p>${x.desc}</p>
    <div class="extra__price"><b>${money(x.price)}</b><span>per ${x.per}</span><a href="/booking.html" aria-label="Add ${x.name} when booking">${icon('plus')}</a></div>
  </article>`
).join('');

/* ---------- Estimator ---------- */
const form = $('[data-estimator]');
const carSel = $('[data-est-car]');
carSel.innerHTML = [...cars].sort((a, b) => a.price - b.price).map((c) => `<option value="${c.id}">${c.name} · ${money(c.price)}/day</option>`).join('');
carSel.value = 'bmw-m5';
$('[data-est-extras]').insertAdjacentHTML(
  'beforeend',
  EXTRAS.map((x) => `<label class="est-extra"><input type="checkbox" name="extras" value="${x.id}">${x.name}<span>${money(x.price)}/${x.per}</span></label>`).join('')
);

const daysEl = $('[data-est-days]');
const totalEl = $('[data-est-total]');
let lastCar = '';
function estimate() {
  const days = +daysEl.value;
  const extras = $$('input[name="extras"]:checked', form).map((i) => i.value);
  const q = quote({ carId: carSel.value, days, extras });
  $('[data-days-label]').textContent = `${days} day${days > 1 ? 's' : ''}${days >= 28 ? ' · monthly rate' : days >= 7 ? ' · weekly rate' : ''}`;
  daysEl.style.setProperty('--p', ((days - 1) / 34) * 100 + '%');
  if (carSel.value !== lastCar) {
    lastCar = carSel.value;
    const c = getCar(lastCar);
    $('[data-est-preview]').innerHTML = `<figure style="margin:0">${pic(c.img, c.name, '(max-width: 1024px) 100vw, 420px')}<figcaption>${c.name}</figcaption></figure>`;
  }
  $('[data-est-quote]').innerHTML = `
    <div><dt>${money(q.car.price)} × ${days} day${days > 1 ? 's' : ''}</dt><dd>${money(q.base)}</dd></div>
    ${q.discount ? `<div class="discount"><dt>Long-rental discount</dt><dd>−${money(q.discount)}</dd></div>` : ''}
    <div><dt>Extras</dt><dd>${money(q.extrasTotal)}</dd></div>
    <div><dt>Taxes & fees (8%)</dt><dd>${money(q.tax)}</dd></div>
    <div><dt>Refundable deposit</dt><dd>${money(q.deposit)}</dd></div>`;
  tweenNumber(totalEl, q.total, { duration: 600, format: money });
  $('[data-est-perday]').textContent = `≈ ${money(q.total / days)} per day, all-in`;
  const qs = new URLSearchParams({ car: q.car.id });
  if (extras.length) qs.set('extras', extras.join(','));
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  qs.set('from', iso(from));
  qs.set('to', iso(to));
  $('[data-est-book]').href = `/booking.html?${qs}`;
}
form.addEventListener('input', estimate);
estimate();

/* ---------- FAQ ---------- */
const pricingFaq = faq.filter((f) => /deposit|cancel|fuel|deliver|age/i.test(f.q)).concat([
  { q: 'Are taxes included in the prices shown?', a: 'Daily rates are shown before tax so you can compare cars easily. Every quote, estimator total and checkout summary includes the 8% tax, with nothing added at the desk.' },
  { q: 'How do weekly and monthly discounts work?', a: 'They apply automatically: 15% off the base rate for 7–27 days and 30% off for 28 days or more. Extras are not discounted.' },
]);
const faqEl = $('[data-faq]');
faqEl.innerHTML = faqHtml(pricingFaq);

boot();
bindAccordion(faqEl);
initRoads({ speed: 1.2 });
