// Builds responsive <picture> markup from the image manifest.
// Shared by the Vite HTML transform (static pages) and runtime renderers (fleet, chatbot…).
export function picture(manifest, { name, alt = '', sizes = '100vw', cls = '', eager = false, imgCls = '' }) {
  const m = manifest[name];
  if (!m) throw new Error(`Unknown image "${name}"`);
  const set = (ext) => m.widths.map((w) => `/images/${name}-${w}.${ext} ${w}w`).join(', ');
  const load = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return `<picture${cls ? ` class="${cls}"` : ''}><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="/images/${name}-${m.widths[0]}.webp" alt="${alt}" width="${m.w}" height="${m.h}" ${load} decoding="async"${imgCls ? ` class="${imgCls}"` : ''}></picture>`;
}
