// Simple icon generator using SVG -> PNG conversion
const fs = require('fs');
const path = require('path');
const https = require('https');

const REMOTE_LOGO_URL = 'https://i.postimg.cc/VJ87tfYs/Logo.png';
const publicDir = path.join(__dirname, 'public');
const localLogoPath = path.join(publicDir, 'logo.png');

function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Failed to download logo: ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function getLogoDataUrl() {
  let buf;
  if (fs.existsSync(localLogoPath)) {
    buf = fs.readFileSync(localLogoPath);
  } else {
    buf = await downloadToBuffer(REMOTE_LOGO_URL);
  }
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// SVG template for MauriPlay icon (logo image on black background)
function generateSVG(size, dataUrl, { maskable = false } = {}) {
  const padding = maskable ? Math.round(size * 0.18) : Math.round(size * 0.125);
  const logoSize = Math.max(1, size - padding * 2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <image x="${padding}" y="${padding}" width="${logoSize}" height="${logoSize}" xlink:href="${dataUrl}"/>
</svg>`;
}

// Generate icons
const icons = [
  { size: 64, name: 'icon-64.svg' },
  { size: 192, name: 'icon-192.svg' },
  { size: 512, name: 'icon-512.svg' },
  { size: 512, name: 'icon-512-maskable.svg', maskable: true }
];

(async () => {
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const dataUrl = await getLogoDataUrl();
  icons.forEach((icon) => {
    const svg = generateSVG(icon.size, dataUrl, { maskable: Boolean(icon.maskable) });
    const filePath = path.join(publicDir, icon.name);
    fs.writeFileSync(filePath, svg);
    console.log(`Generated: ${icon.name}`);
  });

  console.log('\nAll icons generated successfully!');
  console.log('Note: For production, prefer `node scripts/generate-pwa-icons.mjs` which outputs PNGs directly.');
})().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exitCode = 1;
});
