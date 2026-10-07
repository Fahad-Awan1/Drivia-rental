import { locations } from '../data/locations.js';
import { CATEGORIES } from '../data/cars.js';
import { $ } from '../core/utils.js';

export const isoDate = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Wires a pickup/return date pair so return can never precede pickup.
export function linkDates(from, to, { defaultDays = 3 } = {}) {
  const today = new Date();
  from.min = isoDate(today);
  if (!from.value) from.value = isoDate(addDays(today, 1));
  const sync = () => {
    const start = new Date(from.value || today);
    to.min = isoDate(addDays(start, 1));
    if (!to.value || to.value <= from.value) to.value = isoDate(addDays(start, defaultDays));
  };
  from.addEventListener('change', sync);
  sync();
}

export function initQuickSearch(form) {
  if (!form) return;
  const loc = $('[data-loc-select]', form);
  const cat = $('[data-cat-select]', form);
  loc.innerHTML = locations.map((l) => `<option value="${l.id}">${l.city} · ${l.name}</option>`).join('');
  cat?.insertAdjacentHTML('beforeend', CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join(''));
  linkDates($('[name="from"]', form), $('[name="to"]', form));
}
