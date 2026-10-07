import { $$, whenNear, isMobile } from '../core/utils.js';

// Lazily starts the light-trail road shader on every [data-road-canvas] when it nears the viewport.
export function initRoads(opts = {}) {
  $$('[data-road-canvas]').forEach((canvas) =>
    whenNear(canvas, async () => {
      const { createRoadScene } = await import('../three/roadScene.js');
      createRoadScene(canvas, { speed: isMobile() ? 0.8 : 1, ...opts });
    })
  );
}
