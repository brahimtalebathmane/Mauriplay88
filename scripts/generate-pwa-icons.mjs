import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '..', 'public');

const sizes = [
  { name: 'icon-72.png', size: 72 },
  { name: 'icon-96.png', size: 96 },
  { name: 'icon-128.png', size: 128 },
  { name: 'icon-144.png', size: 144 },
  { name: 'icon-152.png', size: 152 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-384.png', size: 384 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  // Maskable should keep safe padding; we render the logo smaller inside.
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
];

function svgForSize(size, { maskable = false } = {}) {
  const background = '#000000';
  const textColor = '#ffffff';
  const safeInset = maskable ? Math.round(size * 0.18) : 0;
  const fontSize = Math.round(size * 0.58);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <g transform="translate(${safeInset} ${safeInset})">
    <rect width="${size - safeInset * 2}" height="${size - safeInset * 2}" fill="none"/>
    <text
      x="${(size - safeInset * 2) / 2}"
      y="${(size - safeInset * 2) / 2}"
      font-family="Arial, sans-serif"
      font-size="${fontSize}"
      font-weight="800"
      fill="${textColor}"
      text-anchor="middle"
      dominant-baseline="central"
    >M</text>
  </g>
</svg>`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writePng({ name, size, maskable }) {
  const svg = svgForSize(size, { maskable });
  const outPath = path.join(publicDir, name);
  const buffer = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  await fs.writeFile(outPath, buffer);
  // eslint-disable-next-line no-console
  console.log(`generated ${name} (${size}x${size})`);
}

async function main() {
  await ensureDir(publicDir);
  await Promise.all(sizes.map((cfg) => writePng(cfg)));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Icon generation failed:', err);
  process.exitCode = 1;
});

