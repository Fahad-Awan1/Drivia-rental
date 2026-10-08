import { gsap } from 'gsap';
import { $, $$, finePointer, reducedMotion, toast } from './utils.js';

export function initHeader(lenis) {
  const header = $('[data-header]');
  if (!header) return;
  let last = 0;
  const onScroll = (y) => {
    header.classList.toggle('is-scrolled', y > 40);
    const hide = y > 400 && y > last + 2 && !document.documentElement.classList.contains('menu-open');
    if (hide) header.classList.add('is-hidden');
    else if (y < last - 2 || y < 400) header.classList.remove('is-hidden');
    last = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  onScroll(window.scrollY);

  // Mark the current page in both navs.
  const page = document.body.dataset.page;
  $$(`[data-nav="${page}"]`).forEach((a) => a.setAttribute('aria-current', 'page'));

  initGearNav();
  initGauge(lenis);
}

// Gear-selector nav: a pill slides behind the current page, glides to the hovered/focused link with a
// little spring, and returns when the pointer leaves, like a gear lever moving between positions.
function initGearNav() {
  const bar = $('[data-nav-bar]');
  const pill = $('[data-nav-pill]');
  if (!bar || !pill) return;
  const links = $$('a', bar);
  const home = links.find((a) => a.getAttribute('aria-current') === 'page');
  let target = null;
  const moveTo = (link, instant = false) => {
    target = link;
    links.forEach((a) => a.classList.toggle('is-pilled', a === link));
    if (!link) return gsap.to(pill, { opacity: 0, scale: 0.85, duration: 0.35, ease: 'power2.out' });
    const b = bar.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    gsap.to(pill, {
      x: r.left - b.left, width: r.width, opacity: 1, scale: 1,
      duration: instant || reducedMotion() ? 0 : 0.6, ease: 'back.out(1.25)', overwrite: true,
    });
  };
  links.forEach((a) => {
    a.addEventListener('pointerenter', () => moveTo(a));
    a.addEventListener('focus', () => moveTo(a));
  });
  bar.addEventListener('pointerleave', () => moveTo(home || null));
  bar.addEventListener('focusout', (e) => !bar.contains(e.relatedTarget) && moveTo(home || null));
  // Place it once fonts have settled (link widths depend on them), and keep it aligned on resize.
  const place = () => moveTo(target || home || null, true);
  (document.fonts?.ready || Promise.resolve()).then(place);
  window.addEventListener('resize', place);
}

// Speedometer gauge: needle + arc follow scroll progress; clicking glides back to the top.
function initGauge(lenis) {
  const g = $('[data-gauge]');
  if (!g) return;
  const fill = $('[data-gauge-fill]', g);
  const needle = $('[data-gauge-needle]', g);
  const val = $('[data-gauge-val]', g);
  let raf = 0;
  const update = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    fill.style.strokeDashoffset = String(100 - p * 100);
    needle.style.transform = `rotate(${-135 + p * 270}deg)`;
    const pct = Math.round(p * 100);
    if (val.textContent !== String(pct)) {
      val.textContent = pct;
      g.setAttribute('aria-label', `Back to top, ${pct}% scrolled`);
    }
  };
  const queue = () => raf || (raf = requestAnimationFrame(update));
  if (lenis) lenis.on('scroll', queue);
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
  g.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 1.4 }) : window.scrollTo({ top: 0, behavior: 'smooth' })));
}

export function initMenu(lenis) {
  const btn = $('[data-menu-toggle]');
  const menu = $('#menu');
  if (!btn || !menu) return;
  const root = document.documentElement;
  const set = (open) => {
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.inert = !open;
    open ? lenis?.stop() : lenis?.start();
    if (open) $('a', menu)?.focus({ preventScroll: true });
  };
  menu.inert = true;
  btn.addEventListener('click', () => set(!root.classList.contains('menu-open')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && root.classList.contains('menu-open') && (set(false), btn.focus()));
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => e.matches && set(false));
  // Coming back to this page from the back/forward cache: the menu may still be open from the tap that left it.
  window.addEventListener('drivia:restored', () => root.classList.contains('menu-open') && set(false));
}

export function initCursor() {
  if (!finePointer() || reducedMotion()) return;
  const cursor = $('.cursor');
  if (!cursor) return;
  const ring = $('.cursor__ring', cursor);
  const dot = $('.cursor__dot', cursor);
  const label = $('span', ring);
  gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
  const dx = gsap.quickSetter(dot, 'x', 'px');
  const dy = gsap.quickSetter(dot, 'y', 'px');
  window.addEventListener('pointermove', (e) => {
    if (!cursor.classList.contains('is-ready')) {
      gsap.set(ring, { x: e.clientX, y: e.clientY });
      cursor.classList.add('is-ready');
    }
    dx(e.clientX);
    dy(e.clientY);
    rx(e.clientX);
    ry(e.clientY);
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button, input, select, textarea, label, summary');
    cursor.classList.remove('is-label', 'is-link');
    if (!t) return;
    if (t.dataset.cursor) {
      label.textContent = t.dataset.cursor;
      cursor.classList.add('is-label');
    } else cursor.classList.add('is-link');
  });
}

export function initMagnetic() {
  if (!finePointer() || reducedMotion()) return;
  $$('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic) || 0.3;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
      el.style.transform = '';
      setTimeout(() => (el.style.transition = ''), 600);
    });
  });
}

// Subtle 3D tilt for cards on desktop.
export function initTilt(root = document) {
  if (!finePointer() || reducedMotion()) return;
  $$('[data-tilt]', root).forEach((el) => {
    if (el.dataset.tiltBound) return;
    el.dataset.tiltBound = '1';
    const max = parseFloat(el.dataset.tilt) || 6;
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
      el.style.transform = '';
      setTimeout(() => (el.style.transition = ''), 800);
    });
  });
}

export function initNewsletter() {
  $$('[data-newsletter]').forEach((f) =>
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      f.reset();
      toast('You’re in! Watch your inbox for weekend deals.');
    })
  );
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}
