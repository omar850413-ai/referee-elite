const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');

const garbled1 = /\[\^A-Z.*?\\\\s\]/g;
content = content.replace(garbled1, '[^A-ZÑÁÉÍÓÚ\\\\s]');

const garbled2 = /\[A-Z.*?\\\\s\]\{4,\}/g;
content = content.replace(garbled2, '[A-ZÑÁÉÍÓÚ\\\\s]{4,}');

const garbled3 = /\[A-Z.*?\\\\s\]\{5,\}/g;
content = content.replace(garbled3, '[A-ZÑÁÉÍÓÚ\\\\s]{5,}');

fs.writeFileSync('src/app/page.tsx', content);
console.log('Fixed');
