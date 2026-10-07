import { THREE } from './core.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PAINTS } from '../data/paints.js';

export { PAINTS };

export function studioEnvironment(renderer, intensity = 0.04) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), intensity).texture;
  pmrem.dispose();
  return env;
}

// Inverts the baked AO shadow (dark on white) into an alpha mask so it composites over any background.
async function shadowMaterial() {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = '/models/car_ao.png';
  });
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let p = 0; p < d.data.length; p += 4) {
    const a = 255 - d.data[p];
    d.data[p] = d.data[p + 1] = d.data[p + 2] = a;
    d.data[p + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.95 });
}

export async function loadCar({ paint = PAINTS[0].hex, onProgress } = {}) {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const [gltf, shadowMat] = await Promise.all([
    loader.loadAsync('/models/car.glb', (e) => e.total && onProgress?.(e.loaded / e.total)),
    shadowMaterial(),
  ]);
  draco.dispose();

  const car = gltf.scene.children[0];
  const body = new THREE.MeshPhysicalMaterial({ color: paint, metalness: 1, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.03 });
  const details = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, metalness: 1, roughness: 0.35 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, metalness: 0.4, roughness: 0.02, transparent: true, opacity: 0.62 });

  car.getObjectByName('body').material = body;
  ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach((n) => (car.getObjectByName(n).material = details));
  car.getObjectByName('glass').material = glass;
  const wheels = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].map((n) => car.getObjectByName(n)).filter(Boolean);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  shadow.renderOrder = 2;
  car.add(shadow);

  const root = new THREE.Group();
  root.add(car);
  return { root, car, body, details, glass, wheels };
}

// Smoothly blends the body paint to a new colour.
export function paintTo(material, hex, duration = 700) {
  const from = material.color.clone();
  const to = new THREE.Color(hex);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    material.color.copy(from).lerp(to, 1 - Math.pow(1 - t, 3));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
