const https = require('https');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const LOGO_URL = 'https://i.postimg.cc/VJ87tfYs/Logo.png';

const sizes = [
    { name: 'icon-72.png', size: 72, padding: 10 },
    { name: 'icon-96.png', size: 96, padding: 12 },
    { name: 'icon-128.png', size: 128, padding: 16 },
    { name: 'icon-144.png', size: 144, padding: 18 },
    { name: 'icon-152.png', size: 152, padding: 20 },
    { name: 'icon-192.png', size: 192, padding: 24 },
    { name: 'icon-384.png', size: 384, padding: 48 },
    { name: 'icon-512.png', size: 512, padding: 64 },
    { name: 'apple-touch-icon.png', size: 180, padding: 20 },
    { name: 'icon-512-maskable.png', size: 512, padding: 0 }
];

async function generateIcon(config, logoImg) {
    const { name, size, padding } = config;

    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const logoSize = size - (padding * 2);
    const x = padding;
    const y = padding;

    ctx.drawImage(logoImg, x, y, logoSize, logoSize);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`./public/${name}`, buffer);

    console.log(`✓ Generated ${name} (${size}x${size})`);
}

async function main() {
    try {
        console.log('🎮 MauriPlay Icon Generator');
        console.log('📥 Loading logo from:', LOGO_URL);

        const logo = await loadImage(LOGO_URL);
        console.log('✓ Logo loaded successfully');

        console.log('\n📦 Generating icons...\n');

        for (const config of sizes) {
            await generateIcon(config, logo);
        }

        console.log(`\n✅ Successfully generated ${sizes.length} icons!`);
        console.log('📁 Icons saved to ./public/ directory');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
