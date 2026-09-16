const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Remove whitelist
content = content.replace(/\{ tessedit_char_whitelist: '.*?' \} as any/g, '{}');

// Fix player regex to require a number and at least 2 words
const oldPlayerRegex = "const match = line.match(/^[^A-Z0-9]*?(\\\\d{1,3})[^A-Z]*?([A-ZÑÁÉÍÓÚ\\\\s]{4,})/);";
const newPlayerRegex = "const match = line.match(/(?:^|\\\\s)(\\\\d{1,3})\\\\s*[-.]?\\\\s*([A-ZÑÁÉÍÓÚ]{2,}(?:\\\\s+[A-ZÑÁÉÍÓÚ]{2,})+)/);";
content = content.replace(oldPlayerRegex, newPlayerRegex);

// Remove the fallback that adds #0 for ANY 5 letters
const oldFallback = "} else if (/^[A-ZÑÁÉÍÓÚ\\\\s]{5,}$/.test(line.replace(/[^A-ZÑÁÉÍÓÚ\\\\s]/g, ''))) {";
const newFallback = "} else if (false) { // Disabled fallback to prevent garbage";
content = content.replace(oldFallback, newFallback);

// Fix staff regex to require at least 2 words
const oldStaffRegex = "if (name.length > 5) {";
const newStaffRegex = "if (name.length > 5 && name.split(' ').filter(w => w.length > 1).length >= 2) {";
content = content.replace(oldStaffRegex, newStaffRegex);

fs.writeFileSync('src/app/page.tsx', content);
console.log('Fixed OCR heuristics');
