// Converts assets-src/*.jpg into responsive AVIF + WebP files in public/images
// and writes src/data/images.json ({ name: { w, h, widths } }) for <picture> markup.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'assets-src';
const OUT = 'public/images';
const widths = (name) => (name.startsWith('avatar') ? [160] : name.startsWith('hero') ? [800, 1400, 2200] : [640, 1280]);

fs.mkdirSync(OUT, { recursive: true });
const manifest = {};

for (const file of fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()) {
  const name = path.parse(file).name;
  const input = sharp(path.join(SRC, file)).rotate();
  const meta = await input.metadata();
  const ws = widths(name);
  for (const w of ws) {
    const base = input.clone().resize({ width: w, height: name.startsWith('avatar') ? w : undefined, fit: 'cover', position: 'attention' });
    await base.clone().avif({ quality: 48, effort: 5 }).toFile(`${OUT}/${name}-${w}.avif`);
    await base.clone().webp({ quality: 72 }).toFile(`${OUT}/${name}-${w}.webp`);
  }
  const max = ws.at(-1);
  manifest[name] = name.startsWith('avatar')
    ? { w: max, h: max, widths: ws }
    : { w: max, h: Math.round((meta.height / meta.width) * max), widths: ws };
  console.log('✓', name);
}

fs.writeFileSync('src/data/images.json', JSON.stringify(manifest, null, 2));
console.log(`Wrote ${Object.keys(manifest).length} images`);
