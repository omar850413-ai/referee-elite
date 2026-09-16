const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');
const lines = content.split('\n');
const garbledLine = lines.find(l => l.includes('const name = line.replace'));
console.log(garbledLine);
console.log(garbledLine.split('').map(c => c.charCodeAt(0).toString(16)).join(' '));
