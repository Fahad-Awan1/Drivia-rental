import { icon } from '../core/utils.js';

// Tiny always-loaded launcher; the assistant itself is fetched on first interaction or when the browser is idle.
let chatPromise;
const loadChat = () => (chatPromise ??= import('./chatbot.js').then((m) => m.createChat()));

export function openChat(message) {
  loadChat().then((chat) => chat.open(message));
}

export function mountChatLauncher() {
  const btn = document.createElement('button');
  btn.className = 'chat-launcher';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Chat with the Drivia assistant');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = `${icon('chat', 'chat-launcher__icon')}${icon('close', 'chat-launcher__close')}<span class="chat-launcher__hint">Hi! Need a car? <b>Ask me</b></span>`;
  document.body.append(btn);
  btn.addEventListener('click', () => loadChat().then((chat) => chat.toggle()));
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-chat]');
    if (t) {
      e.preventDefault();
      openChat(t.dataset.openChat || undefined);
    }
  });
  setTimeout(() => btn.classList.add('show-hint'), 4500);
  setTimeout(() => btn.classList.remove('show-hint'), 11000);
  ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(() => loadChat(), { timeout: 6000 });
}
