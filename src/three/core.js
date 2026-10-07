import * as THREE from 'three';
import { isMobile } from '../core/utils.js';
export { createLoopRaw as createLoop } from './rawLoop.js';

export { THREE };

export function createRenderer(canvas, { alpha = true } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.25 : 1.5);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha,
    antialias: dpr < 2,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  return renderer;
}

// Keeps renderer + camera sized to the canvas's CSS box.
export function autoResize(renderer, camera, canvas, onResize) {
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    onResize?.(w, h);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  return () => ro.disconnect();
}

// Radial gradient texture used for soft floors and glows.
export function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
