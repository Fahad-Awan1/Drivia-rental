import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter-tight/latin-500.css';
import '@fontsource/inter-tight/latin-600.css';
import '@fontsource/inter-tight/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/chatbot.css';
import './styles/motion.css';

import Lenis from 'lenis';
import { reducedMotion } from './core/utils.js';
import { initMotion } from './core/motion.js';
import { initTransitions } from './core/transition.js';
import { initHeader, initMenu, initCursor, initMagnetic, initTilt, initNewsletter } from './core/interactions.js';
import { mountChatLauncher } from './components/chat-launcher.js';

export let lenis = null;

// Lenis normally runs requestAnimationFrame forever (autoRaf). Every frame of that forces the
// browser through a full render pass even when the page is still, which starves real animation
// and scrolling of time. Instead, run its loop only while a scroll is actually in progress.
function driveOnDemand(l) {
  let id = 0;
  let still = 0;
  const tick = (t) => {
    l.raf(t);
    still = l.isScrolling ? 0 : still + 1;
    id = still > 3 ? 0 : requestAnimationFrame(tick);
  };
  const wake = () => {
    still = 0;
    if (id) return;
    // Lenis measures each frame against the previous one. After sleeping, that gap could be seconds,
    // which would finish a smooth scroll in a single jump. Reset its clock so the glide starts fresh.
    l.time = 0;
    id = requestAnimationFrame(tick);
  };
  ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, wake, { passive: true })
  );
  const scrollTo = l.scrollTo.bind(l);
  l.scrollTo = (...args) => (wake(), scrollTo(...args));
  const start = l.start.bind(l);
  l.start = (...args) => (wake(), start(...args));
  wake();
}

export function boot() {
  if (!reducedMotion()) {
    lenis = new Lenis({ lerp: 0.1, anchors: { offset: -90 } });
    window.__lenis = lenis;
    driveOnDemand(lenis);
  }
  initMotion(lenis);
  initTransitions();
  initHeader(lenis);
  initMenu(lenis);
  initCursor();
  initMagnetic();
  initTilt();
  initNewsletter();
  mountChatLauncher();
  return { lenis };
}
