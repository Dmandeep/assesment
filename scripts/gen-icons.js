const fs = require('fs');
const sharp = require('sharp');

const svg = fs.readFileSync('public/icon.svg');

sharp(svg)
  .resize(192, 192)
  .png()
  .toFile('public/icon-192.png')
  .then(() => console.log('Generated icon-192.png'));

sharp(svg)
  .resize(512, 512)
  .png()
  .toFile('public/icon-512.png')
  .then(() => console.log('Generated icon-512.png'));
