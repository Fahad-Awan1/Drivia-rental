import { boot } from '../main.js';
import '../styles/pages/inner.css';
import '../styles/pages/contact.css';
import '../styles/pages/contact-form.css';
import { $, $$ } from '../core/utils.js';
import { gsap, RM } from '../core/motion.js';
import { locations } from '../data/locations.js';
import { faqHtml, bindAccordion } from '../components/render.js';
import { validateForm } from '../components/validate.js';
import { enhanceSelects } from '../components/dropdown.js';

$('[data-hours]').innerHTML = locations.map((l) => `<li><b>${l.city}</b><span>${l.hours}</span></li>`).join('');
const faqEl = $('[data-faq]');
faqEl.innerHTML = faqHtml();

boot();
bindAccordion(faqEl);

const form = $('[data-contact]');
const success = $('[data-success]');
enhanceSelects(form);

/* ---------- Progress: how many of the 5 required answers are complete ---------- */
const required = $$('[required]', form);
const bar = $('[data-cf-bar]');
const count = $('[data-cf-count]');
function progress() {
  const done = required.filter((el) => el.validity.valid).length;
  bar.style.transform = `scaleX(${done / required.length})`;
  count.textContent = done === required.length ? 'Ready to send ✓' : `${done} of ${required.length} done`;
}
form.addEventListener('input', progress);
form.addEventListener('change', progress);
progress();

/* ---------- Message: grows with its content, live character count ---------- */
const msg = $('#c-msg');
const chars = $('[data-cf-chars]');
const max = +msg.maxLength;
function grow() {
  msg.style.height = 'auto';
  msg.style.height = `${Math.max(150, msg.scrollHeight)}px`;
  chars.textContent = `${msg.value.length} / ${max}`;
  chars.classList.toggle('is-near', msg.value.length > max * 0.9);
}
msg.addEventListener('input', grow);

/* ---------- Submit: brief sending state, then the success card ---------- */
const submit = $('[data-cf-submit]');
validateForm(form, {
  onValid(data) {
    submit.classList.add('is-loading');
    submit.querySelector('.cf-submit__label').textContent = 'Sending…';
    setTimeout(() => {
      $('[data-success-name]').textContent = data.get('name').split(' ')[0];
      $('[data-success-email]').textContent = data.get('email');
      $('[data-success-ref]').textContent = 'MSG-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      form.hidden = true;
      success.hidden = false;
      if (!RM) gsap.fromTo(success.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.08 });
      success.focus();
      submit.classList.remove('is-loading');
      submit.querySelector('.cf-submit__label').textContent = 'Send message';
    }, RM ? 0 : 900);
  },
});

$('[data-again]').addEventListener('click', () => {
  form.reset();
  $$('.has-error', form).forEach((f) => f.classList.remove('has-error'));
  $$('.field__error', form).forEach((e) => (e.textContent = ''));
  success.hidden = true;
  form.hidden = false;
  setTimeout(() => (grow(), progress()));
  form.querySelector('input').focus();
});

// Field entrance: rows rise in sequence once the card is revealed.
if (!RM) {
  gsap.from($$('.cf-head, .contact__row, .ff--area, .cf-foot', form), {
    y: 26, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity',
    scrollTrigger: { trigger: form, start: 'top 85%', once: true },
  });
}
