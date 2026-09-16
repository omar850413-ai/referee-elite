const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');

const swapper = 
function formatName(rawName) {
   let words = rawName.trim().replace(/\\s+/g, ' ').split(' ');
   if (words.length === 2) {
      return words[1] + ' ' + words[0];
   } else if (words.length === 3) {
      return words[1] + ' ' + words[2] + ' ' + words[0];
   } else if (words.length === 4) {
      return words[2] + ' ' + words[3] + ' ' + words[0] + ' ' + words[1];
   }
   return rawName;
};

if (!content.includes('function formatName')) {
   content = content.replace('export default function MainApp() {', swapper + '\\n\\nexport default function MainApp() {');
}

// Update Tesseract calls to include whitelist and better parsing
content = content.replace(
   "await Tesseract.recognize(file, 'spa');",
   "await Tesseract.recognize(file, 'spa', { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑÁÉÍÓÚabcdefghijklmnopqrstuvwxyzñáéíóú0123456789 .-' });"
);
content = content.replace(
   "await Tesseract.recognize(file, 'spa');",
   "await Tesseract.recognize(file, 'spa', { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑÁÉÍÓÚabcdefghijklmnopqrstuvwxyzñáéíóú0123456789 .-' });"
);

// We need to apply the formatName to newStaff and newPlayers
content = content.replace(
   "const name = line.replace(/[^A-ZÑÁÉÍÓÚ\\\\s]/g, '').trim();",
   "let raw = line.replace(/[^A-ZÑÁÉÍÓÚ\\\\s]/g, '').trim();\\n              const name = formatName(raw);"
);
content = content.replace(
   "let name = match[2].trim().replace(/[^A-ZÑÁÉÍÓÚ\\\\s]/g, '').trim();",
   "let raw = match[2].trim().replace(/[^A-ZÑÁÉÍÓÚ\\\\s]/g, '').trim();\\n                 let name = formatName(raw);"
);
content = content.replace(
   "let name = line.replace(/[^A-Z0-9ÑÁÉÍÓÚ\\\\s]/g, '').trim();",
   "let raw = line.replace(/[^A-Z0-9ÑÁÉÍÓÚ\\\\s]/g, '').replace(/[0-9]/g, '').trim();\\n                 let name = formatName(raw);"
);

// Also for single scan
content = content.replace(
   "if (target === 'player') setNewPlayerName(bestLine);",
   "if (target === 'player') setNewPlayerName(formatName(bestLine));"
);
content = content.replace(
   "else setNewStaffName(bestLine);",
   "else setNewStaffName(formatName(bestLine));"
);

fs.writeFileSync('src/app/page.tsx', content);
console.log('Patched');
