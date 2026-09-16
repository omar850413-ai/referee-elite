const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Add fileToBase64 helper before MainApp
const helper = 
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
;
content = content.replace('export default function Home() {', helper + '\\nexport default function Home() {');

// Replace Tesseract calls in handleScanBatch
const tessCall1 = /const \{ data: \{ text \} \} = await Tesseract\.recognize\(file, 'spa'[^)]*\);/g;
const replacement1 = const base64 = await fileToBase64(file);
       const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });
       const { text } = await res.json();;

content = content.replace(tessCall1, replacement1);

// We should also replace the import just to clean up (optional)
content = content.replace("import Tesseract from 'tesseract.js';", "");

fs.writeFileSync('src/app/page.tsx', content);
console.log('Patched to use Vision API');
