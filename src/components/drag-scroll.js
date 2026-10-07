// Mouse drag-to-scroll for horizontal scroll-snap tracks. Touch keeps native swiping.
// A plain click still follows links; a real drag (> 6px) swallows the click that ends it.
export function dragScroll(track, { onRelease } = {}) {
  let drag = null;
  track.addEventListener('dragstart', (e) => e.preventDefault());
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      track.classList.add('is-dragging');
    }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    track.classList.remove('is-dragging');
    if (moved) {
      const swallow = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      track.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => track.removeEventListener('click', swallow, { capture: true }), 0);
      onRelease?.();
    }
  });
}
