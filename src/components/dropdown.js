// Custom dropdown that progressively enhances a native <select data-dropdown>.
// Follows the WAI-ARIA "select-only combobox" pattern: a button (role=combobox) opens a listbox;
// arrows / Home / End move, Enter / Space choose, Escape closes, typing jumps to a matching option.
// The native <select> stays in the form (visually hidden) so validation and FormData keep working.
import { icon } from '../core/utils.js';

let uid = 0;

export function enhanceSelect(select) {
  if (select.dataset.enhanced) return null;
  select.dataset.enhanced = '1';
  const id = `dd-${++uid}`;
  const label = document.querySelector(`label[for="${select.id}"]`);
  const placeholder = select.options[0]?.value === '' ? select.options[0].text : 'Select';
  const opts = [...select.options].filter((o) => o.value !== '' || o.text !== placeholder);

  const wrap = document.createElement('div');
  wrap.className = 'dd';
  wrap.innerHTML = `
    <button type="button" class="dd__btn" role="combobox" aria-haspopup="listbox" aria-expanded="false"
      aria-controls="${id}-list" ${label ? `aria-labelledby="${label.id || (label.id = `${id}-label`)} ${id}-value"` : ''}>
      <span class="ff__icon dd__icon" aria-hidden="true">${icon('chat')}</span>
      <span class="dd__value" id="${id}-value"></span>
      <span class="dd__chev" aria-hidden="true"></span>
    </button>
    <ul class="dd__list" id="${id}-list" role="listbox" tabindex="-1" ${label ? `aria-labelledby="${label.id}"` : ''}>
      ${opts
        .map(
          (o, i) => `
        <li class="dd__opt" role="option" id="${id}-o${i}" data-value="${o.value || o.text}" aria-selected="false" style="--i:${i}">
          <span class="dd__opt-icon" aria-hidden="true">${icon(o.dataset.icon || 'arrow')}</span>
          <span class="dd__opt-text"><b>${o.text}</b>${o.dataset.desc ? `<small>${o.dataset.desc}</small>` : ''}</span>
          <span class="dd__tick" aria-hidden="true">${icon('check')}</span>
        </li>`
        )
        .join('')}
    </ul>`;
  select.after(wrap);
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  const btn = wrap.querySelector('.dd__btn');
  const list = wrap.querySelector('.dd__list');
  const items = [...list.children];
  const valueEl = wrap.querySelector('.dd__value');
  const iconEl = wrap.querySelector('.dd__icon');
  const field = select.closest('.field');
  let active = -1;
  let typed = '';
  let typedTimer;

  const isOpen = () => wrap.classList.contains('is-open');

  function render() {
    const current = items.findIndex((li) => li.dataset.value === select.value);
    items.forEach((li, i) => li.setAttribute('aria-selected', String(i === current)));
    valueEl.textContent = current >= 0 ? items[current].querySelector('b').textContent : '';
    iconEl.innerHTML = icon(current >= 0 ? opts[current].dataset.icon || 'chat' : 'chat');
    field?.classList.toggle('is-filled', current >= 0);
  }

  function setActive(i) {
    active = (i + items.length) % items.length;
    items.forEach((li, j) => li.classList.toggle('is-active', j === active));
    btn.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (isOpen()) return;
    wrap.classList.add('is-open');
    field?.classList.add('is-focused');
    btn.setAttribute('aria-expanded', 'true');
    const current = items.findIndex((li) => li.dataset.value === select.value);
    setActive(current >= 0 ? current : 0);
    document.addEventListener('pointerdown', onOutside, true);
  }
  function close({ focus = false } = {}) {
    if (!isOpen()) return;
    wrap.classList.remove('is-open');
    field?.classList.remove('is-focused');
    btn.setAttribute('aria-expanded', 'false');
    btn.removeAttribute('aria-activedescendant');
    document.removeEventListener('pointerdown', onOutside, true);
    if (focus) btn.focus();
  }
  const onOutside = (e) => !wrap.contains(e.target) && close();

  function choose(i) {
    const value = items[i].dataset.value;
    select.value = value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    render();
    close({ focus: true });
    wrap.classList.remove('is-picked');
    void wrap.offsetWidth; // restart the little "picked" pulse
    wrap.classList.add('is-picked');
  }

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.dd__opt');
    if (li) choose(items.indexOf(li));
  });
  list.addEventListener('pointermove', (e) => {
    const li = e.target.closest('.dd__opt');
    if (li && items.indexOf(li) !== active) setActive(items.indexOf(li));
  });

  btn.addEventListener('keydown', (e) => {
    const k = e.key;
    if (!isOpen()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) {
        e.preventDefault();
        open();
        if (k === 'ArrowUp') setActive(items.length - 1);
      }
      return;
    }
    if (k === 'ArrowDown') (e.preventDefault(), setActive(active + 1));
    else if (k === 'ArrowUp') (e.preventDefault(), setActive(active - 1));
    else if (k === 'Home') (e.preventDefault(), setActive(0));
    else if (k === 'End') (e.preventDefault(), setActive(items.length - 1));
    else if (k === 'Enter' || k === ' ') (e.preventDefault(), choose(active));
    else if (k === 'Escape') (e.preventDefault(), close());
    else if (k === 'Tab') close();
    else if (k.length === 1 && /\S/.test(k)) {
      // type-ahead
      typed += k.toLowerCase();
      clearTimeout(typedTimer);
      typedTimer = setTimeout(() => (typed = ''), 600);
      const hit = items.findIndex((li) => li.dataset.value.toLowerCase().startsWith(typed));
      if (hit >= 0) setActive(hit);
    }
  });
  btn.addEventListener('focus', () => field?.classList.add('is-focused'));
  btn.addEventListener('blur', () => !isOpen() && field?.classList.remove('is-focused'));

  // Validation focuses the first invalid control; send that focus to the visible button.
  select.addEventListener('focus', () => btn.focus());
  // Keep in sync if the form is reset or the value is set from code.
  select.form?.addEventListener('reset', () => setTimeout(render));
  select.addEventListener('change', render);

  render();
  return { open, close, render };
}

export const enhanceSelects = (root = document) => [...root.querySelectorAll('select[data-dropdown]')].map(enhanceSelect);
