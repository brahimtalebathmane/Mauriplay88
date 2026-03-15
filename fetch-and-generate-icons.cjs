const fs = require('fs');
const https = require('https');

const LOGO_URL = 'https://i.postimg.cc/VJ87tfYs/Logo.png';

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function main() {
    console.log('📥 Downloading M7 logo...');

    try {
        const imageBuffer = await downloadImage(LOGO_URL);
        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;

        console.log('✓ Logo downloaded and converted to base64');

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
            { name: 'icon-512-maskable.png', size: 512, padding: 0 }
        ];

        console.log('\n📦 Generating SVG icons with embedded logo...\n');

        for (const config of sizes) {
            const { name, size, padding } = config;
            const logoSize = size - (padding * 2);
            const x = padding;
            const y = padding;

            const svgName = name.replace('.png', '.svg');

            const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <image x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" xlink:href="${dataUrl}"/>
</svg>`;

            fs.writeFileSync(`./public/${svgName}`, svg);
            console.log(`✓ Generated ${svgName} (${size}x${size})`);
        }

        console.log(`\n✅ Successfully generated ${sizes.length} SVG icons with embedded logo!`);
        console.log('📁 Icons saved to ./public/ directory');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
