import { reply } from './chat-engine.js';
import { DEFAULT_CHIPS } from '../data/chatbot-kb.js';
import { money } from '../data/cars.js';
import manifest from '../data/images.json';
import { picture } from '../utils/pic.js';
import { $, icon, escapeHtml, reducedMotion } from '../core/utils.js';

const STORE = 'drivia-chat-v1';

const carCardHtml = (c) => `
  <div class="chat-car">
    ${picture(manifest, { name: c.img, alt: c.name, sizes: '120px', cls: 'chat-car__img' })}
    <div class="chat-car__body">
      <b>${c.name}</b>
      <span>${c.category} · ${money(c.price)}/day</span>
      <div class="chat-car__links">
        <a href="/car.html?id=${c.id}">Details</a>
        <a href="/booking.html?car=${c.id}" class="is-primary">Book</a>
      </div>
    </div>
  </div>`;

function renderBot(r) {
  let html = `<div class="chat-msg__text">${r.html}</div>`;
  if (r.cards?.length) html += `<div class="chat-cards">${r.cards.map((c) => carCardHtml(c.car)).join('')}</div>`;
  if (r.links?.length) html += `<div class="chat-links">${r.links.map(([t, h]) => `<a href="${h}">${t} ${icon('arrow-up-right')}</a>`).join('')}</div>`;
  return html;
}

export function createChat() {
  const launcher = $('.chat-launcher');
  const el = document.createElement('section');
  el.className = 'chat';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Drivia assistant');
  el.setAttribute('aria-modal', 'false');
  el.inert = true;
  el.innerHTML = `
    <header class="chat__head">
      <div class="chat__avatar"><svg aria-hidden="true"><use href="#logo-mark"/></svg></div>
      <div class="chat__who"><b>Drivia Assistant</b><span><i class="chat__online"></i>Online · replies instantly</span></div>
      <button class="chat__reset" type="button" aria-label="Restart conversation" title="Restart">${icon('rotate')}</button>
      <button class="chat__close" type="button" aria-label="Close chat">${icon('close')}</button>
    </header>
    <div class="chat__body" data-lenis-prevent aria-live="polite"></div>
    <div class="chat__chips" data-lenis-prevent></div>
    <form class="chat__form" autocomplete="off">
      <label class="sr-only" for="chat-input">Your message</label>
      <input id="chat-input" type="text" placeholder="Ask about cars, prices, locations…" maxlength="300">
      <button type="submit" aria-label="Send">${icon('send')}</button>
    </form>`;
  document.body.append(el);

  const body = $('.chat__body', el);
  const chipsEl = $('.chat__chips', el);
  const form = $('.chat__form', el);
  const input = $('input', form);
  const ctx = {};
  let history = [];
  let busy = false;

  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (saved) ({ history } = saved), Object.assign(ctx, saved.ctx || {});
  } catch {}
  const save = () => {
    try { sessionStorage.setItem(STORE, JSON.stringify({ history: history.slice(-40), ctx })); } catch {}
  };

  const scrollDown = () => body.scrollTo({ top: body.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' });

  function addMsg(from, html, persist = true) {
    const m = document.createElement('div');
    m.className = `chat-msg chat-msg--${from}`;
    m.innerHTML = html;
    body.append(m);
    if (persist) {
      history.push({ from, html });
      save();
    }
    scrollDown();
  }

  function setChips(list = DEFAULT_CHIPS) {
    chipsEl.innerHTML = list.map((c) => `<button type="button" class="chat-chip">${escapeHtml(c)}</button>`).join('');
  }

  function greet() {
    addMsg('bot', renderBot({ html: 'Hi there! 👋 I’m the <b>Drivia</b> assistant. Ask me about our cars, prices, documents, delivery or locations.' }));
    setChips();
  }

  function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    addMsg('user', `<div class="chat-msg__text">${escapeHtml(text)}</div>`);
    chipsEl.innerHTML = '';
    const typing = document.createElement('div');
    typing.className = 'chat-msg chat-msg--bot chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    body.append(typing);
    scrollDown();
    const r = reply(text, ctx);
    const delay = reducedMotion() ? 0 : Math.min(1300, 450 + r.html.length * 2.5);
    setTimeout(() => {
      typing.remove();
      addMsg('bot', renderBot(r));
      setChips(r.chips?.length ? r.chips : DEFAULT_CHIPS);
      busy = false;
    }, delay);
  }

  if (history.length) {
    history.forEach((m) => addMsg(m.from, m.html, false));
    setChips();
  } else greet();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
    input.value = '';
  });
  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.chat-chip');
    if (b) ask(b.textContent);
  });
  $('.chat__close', el).addEventListener('click', () => api.close());
  $('.chat__reset', el).addEventListener('click', () => {
    history = [];
    Object.keys(ctx).forEach((k) => delete ctx[k]);
    body.innerHTML = '';
    save();
    greet();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && api.isOpen && api.close());

  const api = {
    isOpen: false,
    open(message) {
      api.isOpen = true;
      el.inert = false;
      document.documentElement.classList.add('chat-open');
      launcher?.setAttribute('aria-expanded', 'true');
      if (window.matchMedia('(max-width: 600px)').matches) window.__lenis?.stop();
      setTimeout(() => (message ? ask(message) : input.focus({ preventScroll: true })), 350);
      scrollDown();
    },
    close() {
      api.isOpen = false;
      el.inert = true;
      document.documentElement.classList.remove('chat-open');
      launcher?.setAttribute('aria-expanded', 'false');
      window.__lenis?.start();
      launcher?.focus({ preventScroll: true });
    },
    toggle() {
      api.isOpen ? api.close() : api.open();
    },
  };
  return api;
}
