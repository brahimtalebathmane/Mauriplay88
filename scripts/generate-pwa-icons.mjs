import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '..', 'public');
const localLogoPath = path.join(publicDir, 'logo.png');
const remoteLogoUrl = 'https://i.postimg.cc/VJ87tfYs/Logo.png';

const sizes = [
  { name: 'icon-72.png', size: 72, padding: 8 },
  { name: 'icon-96.png', size: 96, padding: 10 },
  { name: 'icon-128.png', size: 128, padding: 14 },
  { name: 'icon-144.png', size: 144, padding: 16 },
  { name: 'icon-152.png', size: 152, padding: 18 },
  { name: 'icon-192.png', size: 192, padding: 24 },
  { name: 'icon-384.png', size: 384, padding: 48 },
  { name: 'icon-512.png', size: 512, padding: 64 },
  { name: 'apple-touch-icon.png', size: 180, padding: 20 },
  // Maskable should keep the logo inside a safe zone to avoid cropping.
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function ensureLogoExists() {
  try {
    await fs.access(localLogoPath);
    return;
  } catch {
    // fallthrough
  }

  // Best-effort download (keeps builds working if logo.png was not committed).
  // eslint-disable-next-line no-console
  console.log(`logo.png not found; downloading from ${remoteLogoUrl}`);
  const res = await fetch(remoteLogoUrl);
  if (!res.ok) throw new Error(`Failed to download logo: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(localLogoPath, buf);
}

async function loadLogoPngBuffer() {
  await ensureLogoExists();
  const fileBuf = await fs.readFile(localLogoPath);
  // Normalize into a PNG buffer sharp can reliably use (handles odd formats/metadata).
  return sharp(fileBuf).png().toBuffer();
}

async function writePng({ name, size, padding, maskable }) {
  const background = '#000000';
  const safeInset = maskable ? Math.round(size * 0.18) : 0;
  const inset = safeInset || padding || 0;
  const logoSize = Math.max(1, size - inset * 2);

  const outPath = path.join(publicDir, name);
  const logoBuffer = await loadLogoPngBuffer();

  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', withoutEnlargement: true })
    .png()
    .toBuffer();

  const outBuffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resizedLogo, left: inset, top: inset }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  await fs.writeFile(outPath, outBuffer);
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

