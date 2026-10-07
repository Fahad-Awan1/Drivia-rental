// Page transitions: a champagne line draws across, two panels sweep up and the
// destination's name rises in. The next page opens covered and the panels lift away.
// Navigation stays real multi-page (plain location changes).
import { gsap, markReady, RM } from './motion.js';
import { $ } from './utils.js';

const NAMES = {
  '/': 'Home', '/index.html': 'Home', '/fleet.html': 'Fleet', '/car.html': 'Showroom', '/pricing.html': 'Pricing',
  '/locations.html': 'Locations', '/about.html': 'About', '/contact.html': 'Contact', '/booking.html': 'Booking', '/404.html': 'Lost',
};
const nameFor = (url) => NAMES[url.pathname] || 'Drivia';
const KEY = 'drv-t';

function setName(text) {
  const el = $('[data-pt-name]');
  if (!el) return [];
  el.innerHTML = [...text].map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  return [...el.children];
}

export function initTransitions() {
  const root = document.documentElement;
  const pt = $('.pt');
  const panelA = $('.pt__panel--a');
  const panelB = $('.pt__panel--b');
  const line = $('.pt__line');

  /* ---- Enter (this page was reached through a transition) ---- */
  if (root.classList.contains('is-entering') && pt && !RM) {
    let name = 'Drivia';
    try { name = sessionStorage.getItem(`${KEY}-name`) || nameFor(location); } catch {}
    const chars = setName(name);
    gsap.set([panelA, panelB], { yPercent: 0 });
    pt.classList.add('is-active');
    root.classList.remove('is-entering');
    const tl = gsap.timeline({ delay: 0.15, onComplete: () => pt.classList.remove('is-active') });
    tl.to(chars, { yPercent: -120, duration: 0.6, ease: 'expo.in', stagger: 0.025 })
      .to(panelB, { yPercent: -101, duration: 1, ease: 'expo.inOut' }, 0.35)
      .to(panelA, { yPercent: -101, duration: 1, ease: 'expo.inOut' }, 0.45)
      .add(markReady, 0.85);
  } else {
    gsap.set([panelA, panelB], { yPercent: 101 });
    root.classList.remove('is-entering');
    markReady();
  }

  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    pt?.classList.remove('is-active');
    gsap.set([panelA, panelB], { yPercent: 101 });
    gsap.set(line, { scaleX: 0 });
  });

  if (RM || !pt) return;

  /* ---- Leave ---- */
  let leaving = false;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (/^(mailto|tel|javascript):/.test(href) || href.startsWith('#')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    go(url);
  });

  function go(url) {
    if (leaving) return;
    leaving = true;
    const name = nameFor(url);
    try {
      sessionStorage.setItem(KEY, '1');
      sessionStorage.setItem(`${KEY}-name`, name);
    } catch {}
    const chars = setName(name);
    pt.classList.add('is-active');
    window.__lenis?.stop();
    gsap.set(chars, { yPercent: 120 });
    gsap
      .timeline({ onComplete: () => (location.href = url.href) })
      .fromTo(line, { scaleX: 0, transformOrigin: 'left' }, { scaleX: 1, duration: 0.45, ease: 'expo.inOut' })
      .fromTo(panelA, { yPercent: 101 }, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' }, 0.2)
      .fromTo(panelB, { yPercent: 101 }, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' }, 0.32)
      .set(line, { scaleX: 0 }, 0.9)
      .to(chars, { yPercent: 0, duration: 0.55, ease: 'expo.out', stagger: 0.03 }, 0.75)
      .to({}, { duration: 0.15 });
  }

  // Programmatic navigation (forms) can use the same transition.
  window.__driviaGo = (href) => go(new URL(href, location.href));
}
