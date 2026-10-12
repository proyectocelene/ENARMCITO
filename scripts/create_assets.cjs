const fs = require('fs');
fs.mkdirSync('public', { recursive: true });
const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('public/pwa-192x192.png', png1x1);
fs.writeFileSync('public/pwa-512x512.png', png1x1);
fs.writeFileSync('public/favicon.ico', png1x1);
fs.writeFileSync('public/apple-touch-icon.png', png1x1);
fs.writeFileSync('public/masked-icon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#06b6d4"/><text x="50" y="65" font-size="40" text-anchor="middle" fill="white">🩺</text></svg>');
console.log('PWA public assets generated successfully');
