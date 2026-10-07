// Orbit carousel: cars ride an arc around a badge (after the reference's jar slider).
// The cars drift continuously, slow down under the pointer, pause while dragging, and resume
// after arrow/keyboard/tap navigation. Clicking a side card centres it; the centre card opens.
//
// Performance design:
//  - Every car sits in a "slot" on one wheel; turning the wheel moves them all.
//  - The idle drift is a Web Animations API rotation, so it runs on the compositor (GPU thread)
//    and costs the page nothing per frame. JavaScript only checks ~10x a second which car is
//    centred, then lets CSS transitions ease each car's size and brightness.
//  - Only while dragging or snapping (arrows, taps, flings) does JS drive the wheel per frame.
import { gsap } from '../core/motion.js';
import { $, $$, reducedMotion } from '../core/utils.js';

const DRIFT = 0.2; // cars per second while idle
const HOVER_RATE = 0.25; // drift slows to a quarter under the pointer so a car can be clicked
const LAPS = 100000; // the drift animation's length in cars (effectively endless)

export function createOrbit(root, { count, onChange }) {
  const stage = $('[data-orbit-stage]', root);
  const cards = $$('.orbit__card', stage);
  const n = count;
  const RM = reducedMotion();
  const st = { pos: 0, active: -1, visible: false, hover: false };
  let geo = {};
  let drift = null; // { anim, p0 } while the compositor is turning the wheel
  let tween = null;
  let drag = null;

  // Build the wheel: card -> slot -> wheel
  const wheel = document.createElement('div');
  wheel.className = 'orbit__wheel';
  const slots = cards.map((card) => {
    const slot = document.createElement('div');
    slot.className = 'orbit__slot';
    slot.append(card);
    wheel.append(slot);
    return slot;
  });
  stage.append(wheel);
  const slotK = cards.map(() => NaN);
  const band = cards.map(() => NaN);

  const DEG = 180 / Math.PI;
  const angle = (p) => -p * geo.step * DEG;
  const setWheel = (p) => (wheel.style.transform = `rotate(${angle(p).toFixed(3)}deg)`);
  const wrap = (v) => ((((v + n / 2) % n) + n) % n) - n / 2;

  // Current position, read from the compositor animation while drifting.
  const currentPos = () => {
    if (!drift) return st.pos;
    const t = drift.anim.currentTime || 0;
    return drift.p0 + (t / drift.anim.effect.getTiming().duration) * LAPS;
  };

  // Re-seat cars that wrapped around, set size/brightness bands, report the centred car.
  function update(force) {
    st.pos = currentPos();
    cards.forEach((card, i) => {
      const off = wrap(i - st.pos);
      const k = Math.round(st.pos + off);
      if (k !== slotK[i] || force) {
        slotK[i] = k;
        slots[i].style.transform = `rotate(${(k * geo.step * DEG).toFixed(3)}deg)`;
      }
      const b = Math.min(4, Math.round(Math.abs(off) * 2) / 2);
      if (b !== band[i] || force) {
        band[i] = b;
        const scale = b < 1 ? 1.06 - b * 0.13 : Math.max(0.7, 0.93 - (b - 1) * 0.08);
        const fade = b > 3 ? 0 : 1 - Math.min(0.72, Math.max(0, b - 0.35) * 0.42);
        card.style.transform = `scale(${scale.toFixed(3)})`;
        card.style.opacity = fade.toFixed(3);
        slots[i].style.zIndex = String(10 - Math.round(b));
        const cur = b < 0.5;
        card.setAttribute('aria-current', String(cur));
        card.tabIndex = cur ? 0 : -1;
      }
    });
    const idx = ((Math.round(st.pos) % n) + n) % n;
    if (idx !== st.active) {
      st.active = idx;
      onChange?.(idx);
    }
  }

  /* ---- Compositor drift ---- */
  function startDrift() {
    stopDrift();
    if (RM || !wheel.animate) return;
    const p0 = st.pos;
    const anim = wheel.animate(
      [{ transform: `rotate(${angle(p0)}deg)` }, { transform: `rotate(${angle(p0 + LAPS)}deg)` }],
      { duration: (LAPS / DRIFT) * 1000, easing: 'linear', fill: 'forwards' }
    );
    if (st.hover) anim.playbackRate = HOVER_RATE;
    if (!st.visible) anim.pause();
    drift = { anim, p0 };
  }
  function stopDrift() {
    if (!drift) return;
    st.pos = currentPos();
    setWheel(st.pos); // pin the inline transform first so cancelling doesn't jump
    drift.anim.cancel();
    drift = null;
  }

  const layout = () => {
    const w = root.clientWidth;
    const mobile = w < 700;
    const cw = mobile ? Math.min(220, w * 0.56) : Math.min(320, w * 0.22);
    geo = { mobile, cw, ch: cw * 1.28, R: mobile ? 560 : Math.max(900, w * 0.85), step: mobile ? 0.4 : 0.3, top: mobile ? 52 : 76 };
    root.style.setProperty('--cw', `${cw}px`);
    root.style.setProperty('--ch', `${geo.ch}px`);
    root.style.setProperty('--orbit-r', `${geo.R}px`);
    root.style.setProperty('--orbit-top', `${geo.top}px`);
    const drifting = !!drift;
    stopDrift();
    setWheel(st.pos);
    update(true);
    if (drifting) startDrift(); // the step angle may have changed
  };

  /* ---- JS-driven moves (snap, drag) ---- */
  const frame = () => {
    setWheel(st.pos);
    update();
  };
  const goTo = (t, dur = 1.1) => {
    stopDrift();
    tween?.kill();
    gsap.ticker.add(frame);
    tween = gsap.to(st, {
      pos: t,
      duration: RM ? 0 : dur,
      ease: 'expo.out',
      onComplete: () => {
        tween = null;
        gsap.ticker.remove(frame);
        frame();
        startDrift();
      },
    });
  };
  // Step from where the carousel is heading so quick taps never skip a car.
  const base = () => (tween ? Math.round(tween.vars.pos) : Math.round(currentPos()));
  const next = () => goTo(base() + 1);
  const prev = () => goTo(base() - 1);

  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, pos: currentPos(), moved: false, t: performance.now(), lastX: e.clientX, v: 0 };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(e.clientY - drag.y) > 10 && Math.abs(e.clientY - drag.y) > Math.abs(dx)) return void (drag = null); // vertical scroll wins
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      stopDrift();
      tween?.kill();
      tween = null;
      drag.pos = st.pos;
      gsap.ticker.add(frame);
      root.classList.add('is-dragging');
    }
    const now = performance.now();
    drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.t);
    drag.t = now;
    drag.lastX = e.clientX;
    st.pos = drag.pos - dx / (geo.R * geo.step * 0.9);
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    root.classList.remove('is-dragging');
    if (!d.moved) return;
    gsap.ticker.remove(frame);
    goTo(Math.round(st.pos - d.v * 1.6), 1.3); // fling with momentum, settle, then drift again
    const swallow = (ev) => (ev.preventDefault(), ev.stopPropagation());
    root.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => root.removeEventListener('click', swallow, { capture: true }), 0);
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  stage.addEventListener('click', (e) => {
    const card = e.target.closest('.orbit__card');
    if (!card) return;
    const off = wrap(cards.indexOf(card) - currentPos());
    if (Math.abs(off) >= 0.5) {
      e.preventDefault();
      goTo(Math.round(currentPos() + off));
    }
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') (e.preventDefault(), next());
    if (e.key === 'ArrowLeft') (e.preventDefault(), prev());
  });

  // Hover slows the drift on desktop (touch screens keep it moving).
  const setHover = (on) => {
    st.hover = on;
    drift?.anim.updatePlaybackRate(on ? HOVER_RATE : 1);
  };
  root.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && setHover(true));
  root.addEventListener('pointerleave', () => setHover(false));
  root.addEventListener('focusin', () => setHover(true));
  root.addEventListener('focusout', () => setHover(false));

  // Only work while on screen: the drift pauses and the 10x/second check stops.
  let poll = 0;
  new IntersectionObserver(([e]) => {
    st.visible = e.isIntersecting;
    clearInterval(poll);
    if (st.visible) {
      if (drift) drift.anim.play();
      else if (!tween && !drag) startDrift();
      poll = setInterval(() => drift && update(), 100);
    } else drift?.anim.pause();
  }).observe(root);

  layout();
  new ResizeObserver(layout).observe(root);

  return { next, prev, goTo, get index() { return st.active; } };
}
