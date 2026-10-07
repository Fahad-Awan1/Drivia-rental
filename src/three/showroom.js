import { THREE, createRenderer, createLoop, autoResize, radialTexture, damp } from './core.js';
import { loadCar, studioEnvironment, paintTo, PAINTS } from './car.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { isMobile } from '../core/utils.js';

// Points of interest in the car's local space (+z is the rear of this model).
export const HOTSPOTS = [
  { id: 'engine', pos: [0, 0.98, 1.25], title: 'Mid-mounted V8', text: '4.5 L naturally aspirated V8 · 562 hp · 9,000 rpm redline.' },
  { id: 'cabin', pos: [0, 1.0, -0.05], title: 'Driver-focused cabin', text: 'Hand-stitched leather, carbon paddles and CarPlay. Everything within reach.' },
  { id: 'brakes', pos: [-0.86, 0.36, -1.3], title: 'Carbon-ceramic brakes', text: '20" forged wheels with fade-free stopping, lap after lap.' },
  { id: 'front', pos: [0, 0.55, -2.15], title: 'Active aerodynamics', text: 'Morphing front flaps and LED lights that turn with the road.' },
];

const THEMES = {
  night: { bg: 0x0d0d0e, fog: 0x0d0d0e, grid: 0x3a3a3e, floor: 0x111113, env: 0.85, key: 0xffd2a8, keyI: 2.4 },
  day: { bg: 0xe6e5e1, fog: 0xe6e5e1, grid: 0xbdbcb7, floor: 0xdedcd7, env: 1.25, key: 0xffffff, keyI: 1.6 },
};

export async function createShowroom(canvas, hotspotLayer, { onProgress } = {}) {
  const renderer = createRenderer(canvas, { alpha: false });
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.background = new THREE.Color(THEMES.night.bg);
  scene.fog = new THREE.Fog(THEMES.night.fog, 10, 22);

  const camera = new THREE.PerspectiveCamera(isMobile() ? 42 : 34, 1, 0.1, 100);
  camera.position.set(-4.3, 1.45, -4.5);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 4.2;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.target.set(0, 0.5, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;

  const key = new THREE.SpotLight(THEMES.night.key, 20, 20, 0.5, 0.6);
  key.position.set(-4, 7, 3);
  scene.add(key);

  // Floor + moving grid ("drive" mode scrolls it under the car).
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: THEMES.night.floor, roughness: 0.55, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.001;
  scene.add(floor);
  const grid = new THREE.GridHelper(40, 40, THEMES.night.grid, THEMES.night.grid);
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  grid.material.depthWrite = false;
  scene.add(grid);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 48),
    new THREE.MeshBasicMaterial({ map: radialTexture('rgba(205,187,163,.32)', 'rgba(205,187,163,0)'), transparent: true, depthWrite: false })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.001;
  scene.add(halo);

  const { root, car, body, wheels } = await loadCar({ paint: PAINTS[0].hex, onProgress });
  scene.add(root);

  /* ----- Hotspots (HTML pins projected from 3D) ----- */
  const pins = HOTSPOTS.map((h) => {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.innerHTML = `<button class="hotspot__dot" type="button" aria-label="${h.title}" aria-expanded="false"><svg aria-hidden="true"><use href="#i-plus"/></svg></button><div class="hotspot__card" role="note"><b>${h.title}</b>${h.text}</div>`;
    hotspotLayer.append(el);
    const btn = el.querySelector('button');
    btn.addEventListener('click', () => {
      const open = !el.classList.contains('is-open');
      pins.forEach((p) => (p.el.classList.remove('is-open'), p.el.querySelector('button').setAttribute('aria-expanded', 'false')));
      el.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) pauseAuto();
    });
    return { el, local: new THREE.Vector3(...h.pos), world: new THREE.Vector3() };
  });
  const tmp = new THREE.Vector3();
  const center = new THREE.Vector3(0, 0.5, 0);
  function placePins(w, h) {
    const camToCenter = camera.position.distanceTo(center);
    pins.forEach((p) => {
      p.world.copy(p.local).applyMatrix4(car.matrixWorld);
      const behind = camera.position.distanceTo(p.world) > camToCenter + 0.35;
      tmp.copy(p.world).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      p.el.style.transform = `translate(${x}px, ${y}px)`;
      p.el.classList.toggle('is-behind', behind);
      p.el.classList.toggle('flip', x > w - 260);
    });
  }

  /* ----- Interaction state ----- */
  let resumeTimer;
  let autoWanted = true;
  const pauseAuto = () => {
    controls.autoRotate = false;
    clearTimeout(resumeTimer);
    if (autoWanted) resumeTimer = setTimeout(() => (controls.autoRotate = true), 5000);
  };
  controls.addEventListener('start', pauseAuto);

  let size = { w: 1, h: 1 };
  const stopResize = autoResize(renderer, camera, canvas, (w, h) => {
    size = { w, h };
    controls.minDistance = w / h < 1 ? 6 : 4.2;
  });

  let driving = false;
  let speed = 0;
  const bgColor = new THREE.Color();
  const loop = createLoop(canvas, (dt) => {
    speed = damp(speed, driving ? 1 : 0, 2.2, dt);
    grid.position.z = (grid.position.z - speed * dt * 8) % 1;
    wheels.forEach((w) => (w.rotation.x -= speed * dt * 14));
    root.position.y = speed * Math.sin(performance.now() / 90) * 0.004;
    controls.update(dt);
    renderer.render(scene, camera);
    placePins(size.w, size.h);
  });

  function setTheme(name) {
    const t = THEMES[name];
    const from = scene.background.clone();
    bgColor.set(t.bg);
    const start = performance.now();
    const step = (now) => {
      const k = Math.min((now - start) / 600, 1);
      scene.background.copy(from).lerp(bgColor, k);
      scene.fog.color.copy(scene.background);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    floor.material.color.set(t.floor);
    grid.material.color.set(t.grid);
    scene.environmentIntensity = t.env;
    key.color.set(t.key);
    key.intensity = t.keyI * 9;
  }
  setTheme('night');

  return {
    paint: (hex) => paintTo(body, hex),
    setTheme,
    setDrive(on) {
      driving = on;
      if (on) pauseAuto();
    },
    setAutoRotate(on) {
      autoWanted = on;
      controls.autoRotate = on;
      clearTimeout(resumeTimer);
    },
    dispose() {
      loop.dispose();
      stopResize();
      controls.dispose();
      renderer.dispose();
    },
  };
}
