import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { picture } from './src/utils/pic.js';

const pages = ['index', 'fleet', 'car', 'pricing', 'locations', 'about', 'contact', 'booking', '404'];
const root = import.meta.dirname;

const attrs = (str) => Object.fromEntries([...str.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, v ?? true]));

// <!-- @include header --> pulls in src/partials/header.html;
// <x-pic name="bmw-m5" alt="…" sizes="…" cls="…" eager /> expands into a responsive <picture>.
function drivia() {
  return {
    name: 'drivia-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const manifest = JSON.parse(fs.readFileSync(resolve(root, 'src/data/images.json'), 'utf8'));
        html = html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, n) =>
          fs.readFileSync(resolve(root, `src/partials/${n}.html`), 'utf8'));
        return html.replace(/<x-pic\s+([^>]*?)\s*\/?>/g, (_, a) => {
          const { name, alt, sizes, cls, eager } = attrs(a);
          return picture(manifest, { name, alt, sizes, cls, eager: !!eager });
        });
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('partials')) server.ws.send({ type: 'full-reload' });
    },
  };
}

// ScrollTrigger keeps an empty requestAnimationFrame loop alive forever (a Firefox repaint workaround).
// That loop forces a full main-thread frame 60x/second even when the page is still, which turns
// GPU-only animations (orbit drift, badge text, light sweep) into main-thread work. Lenis already
// feeds ScrollTrigger on every scroll, so the keep-alive isn't needed: drop just that one loop.
function trimScrollTriggerKeepAlive() {
  const LOOP = 'return _enabled && requestAnimationFrame(_rafBugFix);';
  return {
    name: 'drivia-trim-scrolltrigger-keepalive',
    transform(code, id) {
      if (!/gsap[\\/](dist[\\/])?ScrollTrigger\.js/.test(id) || !code.includes(LOOP)) return null;
      return { code: code.replace(LOOP, 'return 0;'), map: null };
    },
  };
}

export default defineConfig({
  plugins: [drivia(), trimScrollTriggerKeepAlive()],
  // Let the transform above apply in dev too (pre-bundled deps skip plugin transforms).
  optimizeDeps: { exclude: ['gsap'] },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(root, `${p}.html`)])),
    },
  },
});
