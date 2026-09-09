const fs = require('fs');
const sharp = require('sharp');

const input = 'public/logo.png';

sharp(input)
  .resize(192, 192)
  .png()
  .toFile('public/icon-192.png')
  .then(() => console.log('Generated icon-192.png'))
  .catch(err => console.error(err));

sharp(input)
  .resize(512, 512)
  .png()
  .toFile('public/icon-512.png')
  .then(() => console.log('Generated icon-512.png'))
  .catch(err => console.error(err));
