import { $$ } from '../core/utils.js';

const MESSAGES = {
  valueMissing: 'This field is required.',
  typeMismatch: { email: 'Please enter a valid email address.', default: 'Please check this value.' },
  tooShort: (el) => `Please enter at least ${el.minLength} characters.`,
  patternMismatch: 'Please check the format.',
};

function messageFor(el) {
  const v = el.validity;
  if (v.valid) return '';
  if (el.type === 'checkbox') return 'Please tick this box to continue.';
  if (v.valueMissing) return MESSAGES.valueMissing;
  if (v.typeMismatch || (v.patternMismatch && el.type === 'email')) return MESSAGES.typeMismatch[el.type] || MESSAGES.typeMismatch.default;
  if (v.tooShort) return MESSAGES.tooShort(el);
  if (v.patternMismatch) return MESSAGES.patternMismatch;
  return el.validationMessage;
}

function showError(el) {
  const msg = messageFor(el);
  const field = el.closest('.field');
  const slot = field?.querySelector('.field__error') || el.form?.querySelector(`[data-${el.name}-error]`);
  field?.classList.toggle('has-error', !!msg);
  el.setAttribute('aria-invalid', String(!!msg));
  if (slot) {
    slot.textContent = msg;
    if (!slot.id) slot.id = `${el.id || el.name}-err`;
    el.setAttribute('aria-describedby', slot.id);
  }
  return !msg;
}

// Accessible inline validation for a <form novalidate>; validates on blur, then live once touched.
export function validateForm(form, { onValid, fields } = {}) {
  const controls = () => fields?.() || $$('input, select, textarea', form).filter((el) => el.willValidate);
  controls().forEach((el) => {
    el.addEventListener('blur', () => el.value && showError(el));
    el.addEventListener('input', () => el.getAttribute('aria-invalid') === 'true' && showError(el));
    el.addEventListener('change', () => el.getAttribute('aria-invalid') === 'true' && showError(el));
  });
  const check = () => {
    const results = controls().map(showError);
    const firstBad = controls().find((el) => !el.validity.valid);
    firstBad?.focus();
    return results.every(Boolean);
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (check()) onValid?.(new FormData(form));
  });
  return { check, controls };
}
