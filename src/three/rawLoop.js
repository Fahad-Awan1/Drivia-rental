import { visibility, reducedMotion } from '../core/utils.js';

// requestAnimationFrame loop that pauses when the canvas is off-screen or the tab is hidden.
// With reduced motion it renders a single still frame.
export function createLoopRaw(canvas, tick) {
  let visible = false;
  let raf = 0;
  let last = 0;
  const still = reducedMotion();
  const frame = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    tick(dt);
    raf = still ? 0 : requestAnimationFrame(frame);
  };
  const update = () => {
    const run = visible && !document.hidden;
    if (run && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const stop = visibility(canvas, (v) => ((visible = v), update()));
  document.addEventListener('visibilitychange', update);
  return {
    dispose() {
      stop();
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', update);
    },
  };
}
