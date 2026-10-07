import { boot } from '../main.js';
import '../styles/pages/home.css';
import '../styles/pages/proof.css';
import { gsap, ScrollTrigger, pageReady, markReady, revealSplit, revealEl, RM } from '../core/motion.js';
import { $, $$, reducedMotion, whenNear, tweenNumber, finePointer } from '../core/utils.js';
import { cars, money, getCar } from '../data/cars.js';
import { pic, faqHtml, bindAccordion, REVIEWS, reviewHtml } from '../components/render.js';
import { initTilt } from '../core/interactions.js';
import { initQuickSearch } from '../components/quick-search.js';
import { initRoads } from '../components/road.js';
import { dragScroll } from '../components/drag-scroll.js';
import { createOrbit } from '../components/orbit.js';

boot();

const hero = $('[data-hero]');
const heroImg = $('[data-hero-media] img');
const heroPicture = $('[data-hero-media] picture');

/* =====================================================================
   1. Hero entrance
   ===================================================================== */
// Hero starts "closed": photo zoomed inside a small rounded window, copy hidden.
if (!RM) {
  gsap.set(heroPicture, { clipPath: 'inset(22% 18% 22% 30% round 40px)', scale: 1.25 });
  gsap.set(hero.querySelectorAll('[data-reveal]'), { opacity: 0 });
}

function heroIntro() {
  if (RM) return;
  const tl = gsap.timeline();
  tl.to(heroPicture, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, duration: 1.8, ease: 'expo.inOut', clearProps: 'clipPath' }, 0)
    .add(() => revealSplit($('.hero__title'), { duration: 1.3 }), 0.55)
    .add(() => $$('.hero__content [data-reveal]').forEach((el, i) => revealEl(el, i * 0.12)), 1.0)
    .fromTo('.avail-card', { x: 120, opacity: 0, rotate: 6 }, { x: 0, opacity: 1, rotate: 0, duration: 1.3, ease: 'expo.out', clearProps: 'transform' }, 1.2)
    .add(() => {
      $$('.hero__bottom [data-reveal]').forEach((el) => el.classList.add('is-in'));
      gsap.set('.hero__bottom .socials', { opacity: 1 });
    }, 1.2)
    .fromTo('.hero__bottom .socials a', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'back.out(2)', stagger: 0.08 }, 1.35)
    .fromTo('.header__inner > *', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity' }, 0.9)
    .add(() => hero.classList.add('is-ready'), 1.2);
}

pageReady.then(heroIntro);

// Pointer parallax on the hero photo + scroll depth (photo drifts, copy lifts away).
if (!RM) {
  if (finePointer()) {
    const px = gsap.quickTo(heroImg, 'x', { duration: 1.2, ease: 'power3.out' });
    const py = gsap.quickTo(heroImg, 'y', { duration: 1.2, ease: 'power3.out' });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      px(((e.clientX - r.left) / r.width - 0.5) * -26);
      py(((e.clientY - r.top) / r.height - 0.5) * -16);
    });
  }
  gsap.to(heroPicture, { yPercent: 14, ease: 'none', force3D: true, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__content', { y: -120, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 15%', scrub: true } });
  gsap.to('.hero__arc', { scaleY: 2.2, transformOrigin: 'top', ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
}

/* "Available today" card cycles through featured cars with a vertical text roll. */
const featured = cars.filter((c) => c.featured && !c.model3d);
const avail = $('[data-avail]');
const availImg = $('[data-avail-img]');
let ai = 0;
const showAvail = (i, animate) => {
  const c = featured[i];
  avail.href = `/car.html?id=${c.id}`;
  availImg.insertAdjacentHTML('beforeend', pic(c.img, '', '96px', { eager: true }));
  const pics = $$('picture', availImg);
  const fresh = pics.at(-1);
  if (animate && !RM) {
    gsap.fromTo(fresh, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut', onComplete: () => pics.slice(0, -1).forEach((p) => p.remove()) });
    const nameEl = $('[data-avail-name]');
    gsap.timeline()
      .to([nameEl, $('[data-avail-index]')], { yPercent: -100, opacity: 0, duration: 0.35, ease: 'power2.in' })
      .add(() => {
        nameEl.textContent = c.name;
        $('[data-avail-index]').textContent = `/${String(i + 1).padStart(2, '0')}`;
      })
      .fromTo([nameEl, $('[data-avail-index]')], { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
  } else {
    pics.slice(0, -1).forEach((p) => p.remove());
    $('[data-avail-name]').textContent = c.name;
    $('[data-avail-index]').textContent = `/${String(i + 1).padStart(2, '0')}`;
  }
};
showAvail(0, false);
featured.forEach((c) => (new Image().src = `/images/${c.img}-640.webp`));
setInterval(() => !document.hidden && showAvail((ai = (ai + 1) % featured.length), true), 4800);

/* =====================================================================
   2. Intro slider (mockup)
   ===================================================================== */
const track = $('[data-track]');
const stepBtns = $$('[data-steps] button');
const stepBar = $('[data-steps-bar]');
const cardStep = () => track.firstElementChild.getBoundingClientRect().width + 18;
const perSlide = () => (window.innerWidth >= 1024 ? 2 : 1);
const slideCount = 4;
const currentSlide = () => {
  const max = track.scrollWidth - track.clientWidth;
  return max <= 0 ? 0 : Math.round((track.scrollLeft / max) * (slideCount - 1));
};
const syncSteps = () => {
  const i = currentSlide();
  stepBtns.forEach((b, j) => b.classList.toggle('is-active', i === j));
  const max = track.scrollWidth - track.clientWidth;
  stepBar.style.transform = `scaleX(${0.25 + 0.75 * (max > 0 ? track.scrollLeft / max : 0)})`;
  $('[data-prev]').disabled = track.scrollLeft < 4;
  $('[data-next]').disabled = track.scrollLeft > max - 4;
};
const slideTo = (i) => {
  const max = track.scrollWidth - track.clientWidth;
  track.scrollTo({ left: (max * i) / (slideCount - 1), behavior: reducedMotion() ? 'auto' : 'smooth' });
};
track.addEventListener('scroll', syncSteps, { passive: true });
stepBtns.forEach((b, i) => b.addEventListener('click', () => slideTo(i)));
$('[data-prev]').addEventListener('click', () => track.scrollBy({ left: -cardStep() * perSlide(), behavior: 'smooth' }));
$('[data-next]').addEventListener('click', () => track.scrollBy({ left: cardStep() * perSlide(), behavior: 'smooth' }));
track.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') track.scrollBy({ left: cardStep(), behavior: 'smooth' });
  if (e.key === 'ArrowLeft') track.scrollBy({ left: -cardStep(), behavior: 'smooth' });
});
dragScroll(track, { onRelease: () => slideTo(currentSlide()) });
syncSteps();
// Cards lean as the slider moves (velocity skew), like objects with weight.
if (!RM) {
  const skewTo = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' });
  let lastLeft = track.scrollLeft;
  let settle;
  track.addEventListener('scroll', () => {
    skewTo(gsap.utils.clamp(-6, 6, -(track.scrollLeft - lastLeft) * 0.3));
    lastLeft = track.scrollLeft;
    clearTimeout(settle);
    settle = setTimeout(() => skewTo(0), 80);
  }, { passive: true });
}

/* =====================================================================
   3. Quick search
   ===================================================================== */
initQuickSearch($('.quick__form'));

/* =====================================================================
   4. Fleet showcase: orbit carousel
   ===================================================================== */
const showCars = cars.filter((c) => c.featured);
const orbitEl = $('[data-orbit]');
$('[data-orbit-stage]').innerHTML = showCars
  .map((c) => `<a class="orbit__card" href="/car.html?id=${c.id}" aria-label="${c.name}, ${money(c.price)} per day" draggable="false">${pic(c.img, '', '(max-width: 700px) 60vw, 330px')}<span class="orbit__tag">${c.name}<small>${c.category}</small></span></a>`)
  .join('');
$('[data-showcase-total]').textContent = String(showCars.length).padStart(2, '0');
const nameEl = $('[data-orbit-name]');
const setInfo = (i) => {
  const c = showCars[i];
  $('[data-showcase-count]').textContent = String(i + 1).padStart(2, '0');
  $('[data-showcase-bar]').style.transform = `scaleX(${(i + 1) / showCars.length})`;
  $('[data-orbit-view]').href = `/car.html?id=${c.id}`;
  $('[data-orbit-book]').href = `/booking.html?car=${c.id}`;
  $('[data-orbit-meta]').innerHTML = `<span>${c.category}</span><span>${c.hp} hp · 0–100 in ${c.accel}s</span><span><b>${money(c.price)}</b>/day</span>`;
  const old = [...nameEl.children];
  const fresh = [...c.name].map((ch) => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  if (RM || !old.length) return void (nameEl.innerHTML = fresh);
  gsap.to(old, {
    yPercent: -110, duration: 0.3, ease: 'power2.in', stagger: 0.01,
    onComplete: () => {
      nameEl.innerHTML = fresh;
      gsap.fromTo(nameEl.children, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.018 });
      gsap.fromTo('[data-orbit-meta] > *', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.05 });
    },
  });
};
const orbit = createOrbit(orbitEl, { count: showCars.length, onChange: setInfo });
$('[data-show-prev]').addEventListener('click', () => orbit.prev());
$('[data-show-next]').addEventListener('click', () => orbit.next());
// The badge plate rises from below as the section scrolls in.
if (!RM) gsap.fromTo('.orbit__badge', { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: orbitEl, start: 'top 95%', end: 'top 35%', scrub: 1 } });

/* =====================================================================
   5. Trip mood: circular wipe that grows from the chip you clicked
   ===================================================================== */
const MOODS = {
  coast: { title: 'Coastal cruise', desc: 'Top down, sea breeze, golden hour. Cars that love a winding shoreline.', img: 'scene-beach', cars: ['mercedes-amg-gt', 'ford-mustang', 'chevrolet-camaro'] },
  mountain: { title: 'Mountain escape', desc: 'Grip, space and comfort for alpine passes and lakeside weekends.', img: 'scene-lake', cars: ['ford-expedition', 'audi-rs6', 'porsche-panamera'] },
  city: { title: 'City nights', desc: 'Easy to park, impossible to ignore. Made for neon-lit boulevards.', img: 'scene-city', cars: ['tesla-model-3', 'bmw-m4', 'nissan-juke'] },
  business: { title: 'Business trip', desc: 'Arrive composed. Executive saloons with chauffeur on request.', img: 'scene-interior', cars: ['bmw-m5', 'porsche-panamera', 'toyota-camry'] },
};
const moodStage = $('[data-mood-stage]');
const moodMedia = $('[data-mood-media]');
const moodCars = $('[data-mood-cars]');
function setMood(key, origin) {
  const m = MOODS[key];
  $$('[data-mood]').forEach((b) => {
    const on = b.dataset.mood === key;
    b.setAttribute('aria-selected', String(on));
    b.setAttribute('aria-pressed', String(on));
  });
  moodMedia.insertAdjacentHTML('beforeend', pic(m.img, '', '(max-width: 1320px) 100vw, 1320px'));
  const pics = $$('picture', moodMedia);
  const fresh = pics.at(-1);
  fresh.style.setProperty('--cx', origin ? `${origin.x}%` : '50%');
  fresh.style.setProperty('--cy', origin ? `${origin.y}%` : '100%');
  const img = $('img', fresh);
  const show = () => requestAnimationFrame(() => requestAnimationFrame(() => fresh.classList.add('is-on')));
  img.complete ? show() : img.addEventListener('load', show, { once: true });
  setTimeout(() => pics.slice(0, -1).forEach((p) => p.remove()), 1600);
  const title = $('[data-mood-title]');
  if (RM) {
    title.textContent = m.title;
  } else {
    gsap.to(title, { yPercent: -60, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => {
      title.textContent = m.title;
      gsap.fromTo(title, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out' });
    } });
  }
  $('[data-mood-desc]').textContent = m.desc;
  moodCars.innerHTML = m.cars
    .map(getCar)
    .map((c, i) => `<a class="mood-car" href="/car.html?id=${c.id}" style="--i:${i}">${pic(c.img, '', '76px')}<div><b>${c.name}</b><span>${c.category} · from ${money(c.price)}/day</span></div></a>`)
    .join('');
}
$('[data-mood-tabs]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mood]');
  if (!b || b.getAttribute('aria-pressed') === 'true') return;
  const s = moodStage.getBoundingClientRect();
  const r = b.getBoundingClientRect();
  setMood(b.dataset.mood, { x: ((r.left + r.width / 2 - s.left) / s.width) * 100, y: ((r.top + r.height / 2 - s.top) / s.height) * 100 });
});
whenNear($('.mood'), () => setMood('coast'), '600px');

/* =====================================================================
   6. How it works: road draws and a car drives along it
   ===================================================================== */
const path = $('[data-how-path]');
const carDot = $('[data-how-car]');
if (path && !RM) {
  const len = path.getTotalLength();
  const svg = path.ownerSVGElement;
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  const place = (p) => {
    const L = Math.max(1, p * len);
    const pt = path.getPointAtLength(L);
    const ahead = path.getPointAtLength(Math.min(len, L + 4));
    const sx = svg.clientWidth / 400;
    const sy = svg.clientHeight / 1000;
    const ang = (Math.atan2((ahead.y - pt.y) * sy, (ahead.x - pt.x) * sx) * 180) / Math.PI - 90;
    carDot.style.transform = `translate(${pt.x * sx}px, ${pt.y * sy}px) rotate(${ang}deg)`;
  };
  place(0);
  gsap.to(path, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '.how__road', start: 'top 70%', end: 'bottom 60%', scrub: 0.6, onUpdate: (st) => place(st.progress) },
  });
} else if (carDot) carDot.hidden = true;

/* =====================================================================
   7. Stats (count up), reviews, FAQ
   ===================================================================== */
$$('[data-count]').forEach((el) => {
  whenNear(el, () => pageReady.then(() => {
    const dec = +el.dataset.decimals || 0;
    tweenNumber(el, +el.dataset.count, { duration: 2000, format: (v) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) });
  }), '-10%');
});

// One row of reviews, duplicated for a seamless loop; it glides in from the right.
$('[data-reviews]').innerHTML = REVIEWS.map((r) => reviewHtml(r)).join('') + REVIEWS.map((r) => reviewHtml(r, { hidden: true })).join('');
if (!RM) {
  gsap.fromTo('.reviews__rows', { xPercent: 22, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'expo.out', duration: 1.8, scrollTrigger: { trigger: '.reviews__rows', start: 'top 90%', once: true } });
}

const faqEl = $('[data-faq]');
faqEl.removeAttribute('data-reveal');
faqEl.innerHTML = faqHtml();
$$('details', faqEl).forEach((d) => d.setAttribute('data-reveal', 'up'));
bindAccordion(faqEl);

/* =====================================================================
   8. CTA: road shader; heading assembles from a scatter (scrubbed)
   ===================================================================== */
initRoads();
initTilt();
window.addEventListener('load', () => ScrollTrigger.refresh());
