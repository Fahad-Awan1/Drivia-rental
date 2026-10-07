// Global motion system (GSAP + ScrollTrigger), shared by every page.
//  - [data-split]            headings split into chars that rise out of a mask
//  - [data-split="scatter"]  chars assemble from a scatter, scrubbed by scroll
//  - [data-reveal="up|fade|scale|tilt|left|right|clip|blur"]  scroll-in entrances (batched + staggered)
//  - [data-parallax="0.12"]  scrubbed vertical parallax (images get it automatically in key places)
//  - .marquee                velocity-reactive marquees that follow scroll direction
//  - rolling hover labels on nav links, menu links and buttons
// Elements inside [data-reveal-manual] are prepared but left for page code to play (e.g. home hero).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, reducedMotion, isMobile } from './utils.js';

gsap.registerPlugin(ScrollTrigger);
// Let GSAP's ticker fall asleep ~0.5s after the last tween (default is 2s) so idle pages stop rendering.
gsap.config({ autoSleep: 30 });
export { gsap, ScrollTrigger };
// Dev-only handle for profiling (stripped from production builds).
if (import.meta.env.DEV) Object.assign(window, { __gsap: gsap, __ST: ScrollTrigger });

export const RM = reducedMotion();
const EASE = 'expo.out';

/* ---------- Page readiness: entrance animations wait for the page transition / loader ---------- */
let resolveReady;
export const pageReady = new Promise((r) => (resolveReady = r));
export const markReady = () => resolveReady();

/* ---------- Split text ---------- */
export function splitChars(el) {
  if (el.dataset.splitDone) return $$('.c', el);
  const label = el.textContent.replace(/\s+/g, ' ').trim();
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const w = document.createElement('span');
          w.className = 'w';
          w.setAttribute('aria-hidden', 'true');
          [...part].forEach((ch) => {
            const c = document.createElement('span');
            c.className = 'c';
            c.textContent = ch;
            w.append(c);
          });
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
  el.setAttribute('aria-label', label);
  el.classList.add('split');
  el.dataset.splitDone = '1';
  return $$('.c', el);
}

export function revealSplit(el, { delay = 0, duration = 1.15 } = {}) {
  const chars = splitChars(el);
  return gsap.fromTo(
    chars,
    { yPercent: 118, rotate: 9, opacity: 1 },
    { yPercent: 0, rotate: 0, duration, delay, ease: EASE, stagger: Math.min(0.028, 0.75 / chars.length) }
  );
}

/* ---------- Entrance variants ---------- */
const FROM = {
  up: { y: 56, opacity: 0 },
  blur: { opacity: 0, scale: 1.05 },
  fade: { opacity: 0 },
  scale: { opacity: 0, scale: 0.86 },
  tilt: { opacity: 0, y: 140, rotate: -6, transformOrigin: '0% 100%' },
  left: { opacity: 0, x: -70 },
  right: { opacity: 0, x: 70 },
};
const cssDelay = (el) => parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;

export function revealEl(el, delay = 0) {
  if (el.dataset.revealed) return null;
  el.dataset.revealed = '1';
  const variant = el.dataset.reveal || 'up';
  const d = delay + cssDelay(el);
  el.classList.add('is-in');
  if (variant === 'clip') {
    const img = $('img', el);
    const tl = gsap.timeline({ delay: d });
    tl.fromTo(el, { opacity: 1, clipPath: 'inset(100% 0% 0% 0% round 26px)' }, { clipPath: 'inset(0% 0% 0% 0% round 26px)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath' });
    if (img) tl.fromTo(img, { scale: 1.45 }, { scale: 1, duration: 2, ease: EASE, clearProps: 'transform' }, 0.1);
    return tl;
  }
  const from = FROM[variant] || FROM.up;
  return gsap.fromTo(el, from, {
    opacity: 1, y: 0, x: 0, rotate: 0, scale: 1,
    duration: variant === 'tilt' ? 1.4 : 1.2, delay: d, ease: EASE,
    force3D: true,
    clearProps: 'transform,opacity',
  });
}

// Play everything inside a container now (used for heroes once the loader/transition finishes).
export function revealGroup(root, { delay = 0 } = {}) {
  const tl = gsap.timeline({ delay });
  $$('[data-split]', root).forEach((el, i) => tl.add(revealSplit(el), i * 0.12));
  $$('[data-reveal]', root).forEach((el, i) => tl.add(() => revealEl(el), 0.35 + i * 0.09));
  return tl;
}

const passed = (el) => el.getBoundingClientRect().bottom < 0;
function showNow(el) {
  el.dataset.revealed = '1';
  el.classList.add('is-in');
  gsap.set(el, { clearProps: 'transform,opacity,clipPath' });
}

/* ---------- Scan: register scroll-driven entrances for a root ---------- */
function scan(root = document) {
  const manual = (el) => el.closest('[data-reveal-manual]');

  $$('[data-split]', root).forEach((el) => {
    if (el.dataset.motion) return;
    el.dataset.motion = '1';
    const chars = splitChars(el);
    if (manual(el)) return gsap.set(chars, { yPercent: 118 });
    if (el.dataset.split === 'scatter') {
      gsap.fromTo(
        chars,
        { yPercent: () => gsap.utils.random(-160, 160), xPercent: () => gsap.utils.random(-60, 60), rotate: () => gsap.utils.random(-45, 45), opacity: 0 },
        { yPercent: 0, xPercent: 0, rotate: 0, opacity: 1, ease: 'power3.out', stagger: { each: 0.02, from: 'random' }, scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 45%', scrub: 1 } }
      );
      return;
    }
    gsap.set(chars, { yPercent: 118 });
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      // Scrolled past already (fast scroll / anchor jump): show it instantly, don't spend frames on it.
      onEnter: () => pageReady.then(() => (passed(el) ? gsap.set(chars, { yPercent: 0, rotate: 0 }) : revealSplit(el))),
    });
  });

  const reveals = $$('[data-reveal]', root).filter((el) => !el.dataset.motion && !manual(el));
  reveals.forEach((el) => (el.dataset.motion = '1'));
  if (reveals.length) {
    ScrollTrigger.batch(reveals, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => pageReady.then(() => {
        let i = 0;
        batch.forEach((el) => (passed(el) ? showNow(el) : revealEl(el, i++ * 0.09)));
      }),
    });
  }

  $$('[data-parallax]', root).forEach((el) => {
    if (el.dataset.motion) return;
    el.dataset.motion = '1';
    const amt = parseFloat(el.dataset.parallax) || 0.12;
    gsap.fromTo(el, { yPercent: -amt * 100 }, { yPercent: amt * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---------- Rolling hover labels ---------- */
function rollify(host) {
  if (host.dataset.roll) return;
  const node = [...host.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  if (!node) return;
  host.dataset.roll = '1';
  const text = node.textContent.trim();
  const trailing = /\s$/.test(node.textContent) ? ' ' : '';
  const row = (cls) => `<span class="roll__row ${cls}" aria-hidden="true">${[...text].map((ch, i) => `<span class="roll__ch" style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</span>`;
  const span = document.createElement('span');
  span.className = 'roll';
  span.innerHTML = row('roll__row--a') + row('roll__row--b');
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;
  node.replaceWith(sr, span, trailing);
}
export function initRolls(root = document) {
  $$('.nav a, .menu__links a, .btn, .footer__links a, .hero__link', root).forEach(rollify);
}

/* ---------- Velocity-reactive marquees (follow scroll direction) ----------
   Each strip is a Web Animations API loop, so it scrolls on the compositor (GPU thread) with no
   per-frame JavaScript. Scrolling the page only changes the loop's playback rate: faster with scroll
   speed, reversed with scroll direction, slower under the pointer, paused while off-screen. */
function initMarquees(lenis) {
  // Declared before the strips are built: build() calls apply() immediately.
  let scrollDir = 1;
  const apply = (it) => {
    if (it.anim) it.anim.playbackRate = scrollDir * (it.hover ? 0.25 : 1) * it.boost;
  };
  const items = $$('.marquee').map((m) => {
    m.dataset.marquee = '1';
    const track = $('.marquee__track', m);
    const it = { m, track, dir: m.classList.contains('marquee--reverse') ? 1 : -1, anim: null, hover: false, visible: false, boost: 1 };
    it.build = () => {
      const half = track.scrollWidth / 2;
      if (!half || !track.animate) return;
      const dur = (parseFloat(getComputedStyle(m).getPropertyValue('--dur')) || 40) * 1000;
      const prev = it.anim ? (it.anim.currentTime || 0) % dur : 0;
      it.anim?.cancel();
      const [from, to] = it.dir < 0 ? [0, -half] : [-half, 0];
      it.anim = track.animate([{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }], { duration: dur, iterations: Infinity });
      it.anim.currentTime = prev;
      apply(it);
      if (!it.visible) it.anim.pause();
    };
    it.build();
    let rt;
    new ResizeObserver(() => (clearTimeout(rt), (rt = setTimeout(it.build, 150)))).observe(track);
    new IntersectionObserver(([e]) => {
      it.visible = e.isIntersecting;
      if (!it.anim) return;
      it.visible ? it.anim.play() : it.anim.pause();
    }).observe(m);
    m.addEventListener('pointerenter', () => ((it.hover = true), apply(it)));
    m.addEventListener('pointerleave', () => ((it.hover = false), apply(it)));
    return it;
  });
  if (!items.length) return;
  // Ease the speed boost in and out (GSAP only wakes while the page is actually scrolling).
  const boostTo = items.map((it) => gsap.quickTo(it, 'boost', { duration: 0.6, ease: 'power3.out', onUpdate: () => apply(it) }));
  let settle;
  lenis?.on('scroll', ({ velocity, direction }) => {
    if (direction && direction !== scrollDir) {
      scrollDir = direction;
      items.forEach(apply);
    }
    const target = 1 + Math.min(5, Math.abs(velocity) * 0.35);
    items.forEach((it, i) => it.visible && boostTo[i](target));
    clearTimeout(settle);
    settle = setTimeout(() => items.forEach((it, i) => boostTo[i](1)), 120);
  });
}

/* ---------- Footer giant wordmark rises letter by letter ---------- */
function initFooter() {
  const giant = $('.footer__giant');
  if (!giant) return;
  giant.innerHTML = [...giant.textContent].map((c) => `<span style="display:inline-block">${c}</span>`).join('');
  gsap.fromTo(giant.children, { yPercent: 100 }, { yPercent: 0, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: giant, start: 'top 100%', end: 'bottom 95%', scrub: 1 } });
}

/* ---------- Inner page heroes: frame opens, photo settles, image parallax ---------- */
function initPageHero() {
  const hero = $('.page-hero, .about-hero, .lost');
  if (!hero) return;
  const img = $('.page-hero__media img', hero);
  gsap.set(hero, { clipPath: 'inset(6% 4% 0% 4% round 34px)' });
  if (img) gsap.set(img, { scale: 1.35 });
  pageReady.then(() => {
    gsap.to(hero, { clipPath: 'inset(0% 0% 0% 0% round 26px)', duration: 1.6, ease: 'expo.inOut', clearProps: 'clipPath' });
    if (img) gsap.to(img, { scale: 1.12, duration: 2.2, ease: EASE });
  });
  if (img) gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
}

/* ---------- Pause looping CSS animations while off-screen ---------- */
const LOOPING = '.circle-badge, .tile--drivers, .car-stage, .hero, .chat, .orbit, .locs__map-wrap, .locs-head';
function gateAnimations() {
  const els = $$(LOOPING);
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting)));
  els.forEach((el) => {
    el.classList.add('is-offscreen');
    io.observe(el);
  });
}

export function initMotion(lenis) {
  if (RM) {
    document.documentElement.classList.add('rm');
    markReady();
    return;
  }
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
  }
  initRolls();
  // Defer the scan so page scripts can render dynamic content first.
  requestAnimationFrame(() => {
    initPageHero();
    scan();
    initFooter();
    initMarquees(lenis);
    gateAnimations();
    ScrollTrigger.refresh();
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

export const refreshMotion = (root) => !RM && (scan(root), initRolls(root), ScrollTrigger.refresh());
export { isMobile };
