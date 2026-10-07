import { boot } from '../main.js';
import '../styles/pages/inner.css';
import '../styles/pages/booking.css';
import { $, $$, icon, params, toast, escapeHtml } from '../core/utils.js';
import { cars, getCar, CATEGORIES, money } from '../data/cars.js';
import { locations, getLocation } from '../data/locations.js';
import { EXTRAS, quote, daysBetween, YOUNG_DRIVER_FEE, ONE_WAY_FEE, minAgeFor } from '../data/pricing.js';
import { pic } from '../components/render.js';
import { initQuickSearch, isoDate } from '../components/quick-search.js';
import { validateForm } from '../components/validate.js';
import { initRoads } from '../components/road.js';

const STORE = 'drivia-booking-v1';
const form = $('[data-booking]');
const steps = $$('[data-step]', form);
let step = 1;
let catFilter = '';

/* ---------- Build controls ---------- */
initQuickSearch(form); // pickup branch options + linked dates
form.ret.innerHTML = locations.map((l) => `<option value="${l.id}">${l.city} · ${l.name}</option>`).join('');
const times = Array.from({ length: 31 }, (_, i) => {
  const h = 7 + Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
}).filter((t) => t <= '22:00');
$$('[data-times]').forEach((s) => (s.innerHTML = times.map((t) => `<option>${t}</option>`).join('')));
form.ftime.value = '10:00';
form.ttime.value = '10:00';

$('[data-bcats]').innerHTML = ['', ...CATEGORIES].map((c) => `<button type="button" class="chip" data-bcat="${c}" aria-pressed="${!c}">${c || 'All'}</button>`).join('');
$('[data-bcars]').innerHTML = [...cars]
  .sort((a, b) => a.price - b.price)
  .map(
    (c) => `
  <label class="bcar" data-cat="${c.category}" data-id="${c.id}">
    <input type="radio" name="car" value="${c.id}">
    ${pic(c.img, '', '96px')}
    <span class="bcar__info">
      <b>${c.name}</b>
      <small>${c.category} · ${c.seats} seats · ${c.transmission === 'Automatic' ? 'Auto' : 'Manual'}</small>
      <span class="bcar__price">${money(c.price)}<small>/day</small></span>
      <span class="bcar__lock" data-lock></span>
    </span>
  </label>`
  )
  .join('');
$('[data-bextras]').innerHTML = EXTRAS.map(
  (x) => `
  <label class="bextra">
    <input type="checkbox" name="extras" value="${x.id}">
    <div><b>${x.name}</b><small>${x.desc}</small></div>
    <span class="bextra__price">${money(x.price)}<small style="font-weight:400;color:var(--muted)">/${x.per}</small></span>
  </label>`
).join('');

/* ---------- State: URL prefill > saved session > defaults ---------- */
function readState() {
  const fd = new FormData(form);
  return {
    loc: fd.get('loc'), ret: fd.get('ret'), from: fd.get('from'), to: fd.get('to'),
    ftime: fd.get('ftime'), ttime: fd.get('ttime'), age: fd.get('age'), car: fd.get('car') || '',
    extras: fd.getAll('extras'), first: fd.get('first'), last: fd.get('last'), email: fd.get('email'),
    phone: fd.get('phone'), flight: fd.get('flight'), licence: fd.get('licence'), notes: fd.get('notes'), step,
  };
}
function writeState(s) {
  const today = isoDate(new Date());
  ['loc', 'ret', 'ftime', 'ttime', 'first', 'last', 'email', 'phone', 'flight', 'licence', 'notes'].forEach((k) => s[k] && form[k] && (form[k].value = s[k]));
  if (s.from && s.from >= today) form.from.value = s.from;
  form.from.dispatchEvent(new Event('change'));
  if (s.to && s.to > form.from.value) form.to.value = s.to;
  if (s.age) $(`input[name="age"][value="${s.age}"]`, form).checked = true;
  if (s.car && getCar(s.car)) $(`input[name="car"][value="${s.car}"]`, form).checked = true;
  $$('input[name="extras"]', form).forEach((i) => (i.checked = (s.extras || []).includes(i.value)));
}
const save = () => {
  try { sessionStorage.setItem(STORE, JSON.stringify(readState())); } catch {}
};

let saved = {};
try { saved = JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch {}
const p = params();
const fromUrl = {
  loc: getLocation(p.get('loc')) ? p.get('loc') : undefined,
  car: getCar(p.get('car')) ? p.get('car') : undefined,
  from: p.get('from') || undefined,
  to: p.get('to') || undefined,
  extras: p.get('extras') ? p.get('extras').split(',') : undefined,
};
const initial = { ...saved, ...Object.fromEntries(Object.entries(fromUrl).filter(([, v]) => v)) };
if (!initial.ret) initial.ret = initial.loc;
writeState(initial);
if (CATEGORIES.includes(p.get('category'))) catFilter = p.get('category');

/* ---------- Derived pricing ---------- */
function fees(s, days) {
  const f = [];
  if (+s.age < 25) f.push({ label: `Young driver (${days} d)`, amount: YOUNG_DRIVER_FEE * days });
  if (s.ret && s.loc && s.ret !== s.loc) f.push({ label: 'One-way fee', amount: ONE_WAY_FEE });
  return f;
}
function currentQuote(s = readState()) {
  if (!s.car) return null;
  const days = daysBetween(s.from, s.to);
  return quote({ carId: s.car, days, extras: s.extras, fees: fees(s, days) });
}
const fmtDate = (d, t) => `${new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${t}`;

function renderSummary() {
  const s = readState();
  const q = currentQuote(s);
  const car = getCar(s.car);
  const days = daysBetween(s.from, s.to);
  const L = getLocation(s.loc);
  const R = getLocation(s.ret);
  $('[data-summary]').innerHTML = `
    <div class="summary__car">${car ? `${pic(car.img, car.name, '(max-width: 1023px) 120px, 380px')}<b>${car.name}</b>` : `<span class="summary__empty">${icon('car')}<span>Pick a car to see<br>your total</span></span>`}</div>
    <div class="summary__trip">
      <div>${icon('pin')}<span><b>${L?.city || '—'}</b>${R && R.id !== L?.id ? ` → <b>${R.city}</b>` : ''}</span></div>
      <div>${icon('calendar')}<span><b>${fmtDate(s.from, s.ftime)}</b><br>to <b>${fmtDate(s.to, s.ttime)}</b> · ${days} day${days > 1 ? 's' : ''}</span></div>
    </div>
    <dl class="quote">
      ${q ? `
        <div><dt>${money(q.car.price)} × ${days} day${days > 1 ? 's' : ''}</dt><dd>${money(q.base)}</dd></div>
        ${q.discount ? `<div class="discount"><dt>Long-rental discount</dt><dd>−${money(q.discount)}</dd></div>` : ''}
        ${q.extrasTotal ? `<div><dt>Extras (${s.extras.length})</dt><dd>${money(q.extrasTotal)}</dd></div>` : ''}
        ${q.fees.map((f) => `<div><dt>${f.label}</dt><dd>${money(f.amount)}</dd></div>`).join('')}
        <div><dt>Taxes & fees (8%)</dt><dd>${money(q.tax)}</dd></div>
        <div class="total"><dt>Total</dt><dd>${money(q.total)}</dd></div>
        <div><dt>Deposit hold</dt><dd>${money(q.deposit)}</dd></div>`
        : `<div class="total"><dt>Total</dt><dd>—</dd></div>`}
    </dl>`;
  $('[data-oneway-hint]').textContent = s.ret !== s.loc ? `One-way trip: +${money(ONE_WAY_FEE)} relocation fee` : '';
}

// Lock cars the driver is too young for, and apply category filter.
function renderCars() {
  const age = +readState().age;
  $$('.bcar').forEach((el) => {
    const car = getCar(el.dataset.id);
    const min = minAgeFor(car);
    const locked = age < min;
    el.classList.toggle('is-locked', locked);
    el.querySelector('input').disabled = locked;
    el.querySelector('[data-lock]').textContent = locked ? `Driver must be ${min}+` : '';
    if (locked && el.querySelector('input').checked) el.querySelector('input').checked = false;
    el.classList.toggle('is-hidden', !!catFilter && el.dataset.cat !== catFilter);
  });
  $$('[data-bcat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bcat === catFilter)));
}
$('[data-bcats]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bcat]');
  if (!b) return;
  catFilter = b.dataset.bcat;
  renderCars();
});

/* ---------- Steps ---------- */
const stepper = $('[data-stepper]');
const backBtn = $('[data-back]');
const nextBtn = $('[data-next]');
let maxReached = 1;

function goTo(n, { focus = true } = {}) {
  step = n;
  maxReached = Math.max(maxReached, n);
  steps.forEach((s) => (s.hidden = +s.dataset.step !== n));
  $$('li', stepper).forEach((li, i) => {
    li.classList.toggle('is-current', i + 1 === n);
    li.classList.toggle('is-done', i + 1 < n);
    li.querySelector('button').disabled = i + 1 > maxReached;
    li.querySelector('button').setAttribute('aria-current', i + 1 === n ? 'step' : 'false');
  });
  backBtn.hidden = n === 1;
  nextBtn.firstChild.textContent = n === 4 ? 'Confirm booking ' : 'Continue ';
  if (focus) {
    const top = $('.book-head').getBoundingClientRect().top + window.scrollY - 20;
    window.__lenis ? window.__lenis.scrollTo(top) : window.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => steps[n - 1].querySelector('.bstep__title')?.focus?.(), 400);
  }
  save();
}
steps.forEach((s) => s.querySelector('.bstep__title').setAttribute('tabindex', '-1'));

const setErr = (sel, msg) => ($(sel).textContent = msg);
function validateStep(n) {
  const s = readState();
  if (n === 1) {
    const toField = form.to.closest('.field');
    const bad = !s.from || !s.to || s.to <= s.from;
    toField.classList.toggle('has-error', bad);
    toField.querySelector('.field__error').textContent = bad ? 'Return must be after pick-up.' : '';
    if (bad) form.to.focus();
    return !bad;
  }
  if (n === 2) {
    setErr('[data-car-error]', s.car ? '' : 'Please choose a car to continue.');
    if (!s.car) toast('Please choose a car to continue.');
    return !!s.car;
  }
  if (n === 4) return details.check();
  return true;
}
const details = validateForm(steps[3], { fields: () => $$('input, select, textarea', steps[3]).filter((el) => el.willValidate) });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateStep(step)) return;
  if (step < 4) return goTo(step + 1);
  confirmBooking();
});
backBtn.addEventListener('click', () => step > 1 && goTo(step - 1));
stepper.addEventListener('click', (e) => {
  const b = e.target.closest('[data-goto]');
  if (b && !b.disabled) goTo(+b.dataset.goto);
});
form.addEventListener('change', (e) => {
  if (e.target.name === 'age') renderCars();
  if (e.target.name === 'loc' && form.ret.dataset.touched !== '1') form.ret.value = form.loc.value;
  if (e.target.name === 'ret') form.ret.dataset.touched = '1';
  renderSummary();
  save();
});
form.addEventListener('input', () => save());

/* ---------- Confirmation ---------- */
let booking = null;
function confirmBooking() {
  const s = readState();
  const q = currentQuote(s);
  const ref = 'DRV-' + Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
  booking = { ...s, ref, total: q.total, car: getCar(s.car) };
  $('[data-done-name]').textContent = s.first;
  $('[data-done-ref]').textContent = ref;
  $('[data-done-email]').textContent = s.email;
  const L = getLocation(s.loc);
  const R = getLocation(s.ret);
  $('[data-done-summary]').innerHTML = `
    <div><span>Car</span><b>${booking.car.name}</b></div>
    <div><span>Pick-up</span><b>${L.city} · ${fmtDate(s.from, s.ftime)}</b></div>
    <div><span>Return</span><b>${R.city} · ${fmtDate(s.to, s.ttime)}</b></div>
    ${s.extras.length ? `<div><span>Extras</span><b>${s.extras.map((id) => EXTRAS.find((x) => x.id === id).name).join(', ')}</b></div>` : ''}
    ${s.notes ? `<div><span>Notes</span><b>${escapeHtml(s.notes)}</b></div>` : ''}
    <div class="total"><span>Pay at pick-up</span><b>${money(q.total)}</b></div>`;
  $('[data-booking-wrap]').hidden = true;
  $('.book-head').hidden = true;
  const done = $('[data-done]');
  done.hidden = false;
  window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0);
  done.focus();
  initRoads({ speed: 1.4 });
  try { sessionStorage.removeItem(STORE); } catch {}
}

// Calendar invite (.ics) for the pickup and return.
$('[data-ics]').addEventListener('click', () => {
  if (!booking) return;
  const L = getLocation(booking.loc);
  const R = getLocation(booking.ret);
  const stamp = (d, t) => `${d.replace(/-/g, '')}T${t.replace(':', '')}00`;
  const ev = (uid, start, title, loc) => [
    'BEGIN:VEVENT', `UID:${uid}@drivia.example`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${start}`, `DURATION:PT30M`, `SUMMARY:${title}`, `LOCATION:${loc.address.replace(/,/g, '\\,')}`,
    `DESCRIPTION:Drivia booking ${booking.ref} · ${booking.car.name}`, 'END:VEVENT',
  ];
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Drivia//Booking//EN',
    ...ev(`${booking.ref}-pickup`, stamp(booking.from, booking.ftime), `Pick up ${booking.car.name} (Drivia)`, L),
    ...ev(`${booking.ref}-return`, stamp(booking.to, booking.ttime), `Return ${booking.car.name} (Drivia)`, R),
    'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `drivia-${booking.ref}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('[data-print]').addEventListener('click', () => window.print());

/* ---------- Start ---------- */
boot();
renderCars();
renderSummary();
// Jump straight to the car step when arriving with dates, or to extras when a car is preselected.
const startStep = fromUrl.car ? 3 : fromUrl.from ? 2 : Math.min(saved.step || 1, 3);
maxReached = startStep;
goTo(startStep, { focus: false });
