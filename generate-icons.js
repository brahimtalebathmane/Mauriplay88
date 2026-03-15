// Simple icon generator using SVG -> PNG conversion
const fs = require('fs');
const path = require('path');

// SVG template for MauriPlay icon
function generateSVG(size, maskable = false) {
  const padding = maskable ? size * 0.2 : 0;
  const fontSize = size * 0.6;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <text
    x="${size / 2}"
    y="${size / 2}"
    font-family="Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="#FFFFFF"
    text-anchor="middle"
    dominant-baseline="central"
  >M</text>
</svg>`;
}

// Generate icons
const icons = [
  { size: 64, name: 'icon-64.svg' },
  { size: 192, name: 'icon-192.svg' },
  { size: 512, name: 'icon-512.svg' },
  { size: 512, name: 'icon-512-maskable.svg', maskable: true }
];

const publicDir = path.join(__dirname, 'public');

icons.forEach(icon => {
  const svg = generateSVG(icon.size, icon.maskable);
  const filePath = path.join(publicDir, icon.name);
  fs.writeFileSync(filePath, svg);
  console.log(`Generated: ${icon.name}`);
});

console.log('\nAll icons generated successfully!');
console.log('Note: For production, convert SVG to PNG using an image converter.');
