import { boot } from '../main.js';
import { gsap, RM } from '../core/motion.js';
import '../styles/pages/inner.css';
import '../styles/pages/about.css';
import { $, finePointer, visibility } from '../core/utils.js';
import { cars } from '../data/cars.js';
import { initRoads } from '../components/road.js';

const brands = [...new Set(cars.map((c) => c.brand))];
const html = brands.map((b) => `<span class="brand">${b}</span>`).join('');
$('[data-brands]').innerHTML = html + html.replace(/class="brand"/g, 'class="brand" aria-hidden="true"');

const { lenis } = boot();
initRoads();

// Timeline cards drift sideways with the scroll; team portraits colour up as they arrive.
if (!RM) {
  gsap.fromTo('.timeline', { x: 160 }, { x: -120, ease: 'none', scrollTrigger: { trigger: '.timeline-sec', start: 'top bottom', end: 'bottom top', scrub: 1 } });
  gsap.fromTo('.member img', { filter: 'grayscale(1)', scale: 1.15 }, { filter: 'grayscale(0)', scale: 1, duration: 1.6, ease: 'expo.out', stagger: 0.12, clearProps: 'filter,transform', scrollTrigger: { trigger: '.team', start: 'top 75%', once: true } });
  gsap.fromTo('.about-hero__wheel', { scale: 0.6, rotate: -90, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 1.8, ease: 'expo.out', delay: 0.6 });
}

/* ---------- Values: on touch screens (no hover), each card lights up as it passes the middle of the
   screen, so the dark "hover" state travels down the list card by card while you scroll. ---------- */
if (!finePointer()) {
  const lit = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-lit', e.isIntersecting)),
    { rootMargin: '-49% 0px -50% 0px' } // a thin line across the middle of the screen: one card at a time
  );
  document.querySelectorAll('.value').forEach((card) => lit.observe(card));
}

/* ---------- Hero wheel: a real photo, spun on the compositor ----------
   One Web Animations loop turns the wheel (no per-frame JavaScript). Scroll speed temporarily
   raises its playback rate, the pointer tilts it in 3D, and it pauses while off-screen. */
const wheelBox = $('[data-wheel]');
const spin = $('[data-wheel-spin]');
const tilt = $('[data-wheel-tilt]');
if (!RM && spin.animate) {
  const BASE = 1; // one full turn per 10s at rest
  const loop = spin.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], { duration: 10000, iterations: Infinity });
  const state = { rate: BASE };
  const rateTo = gsap.quickTo(state, 'rate', { duration: 0.9, ease: 'power3.out', onUpdate: () => (loop.playbackRate = state.rate) });
  let settle;
  const kick = (v) => {
    rateTo(BASE + Math.min(14, Math.abs(v) * 0.9));
    clearTimeout(settle);
    settle = setTimeout(() => rateTo(BASE), 140);
  };
  if (lenis) lenis.on('scroll', ({ velocity }) => kick(velocity));
  else window.addEventListener('wheel', (e) => kick(e.deltaY / 4), { passive: true });
  visibility(wheelBox, (on) => (on ? loop.play() : loop.pause()));

  if (finePointer()) {
    const rx = gsap.quickTo(tilt, 'rotationX', { duration: 1, ease: 'power3.out' });
    const ry = gsap.quickTo(tilt, 'rotationY', { duration: 1, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => {
      rx(((e.clientY / innerHeight) - 0.5) * -18);
      ry(((e.clientX / innerWidth) - 0.5) * 26 - 8);
    }, { passive: true });
  }
  gsap.set(tilt, { rotationY: -8, rotationX: 4 });
}
