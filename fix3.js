const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');
content = content.replace(/\{ tessedit_char_whitelist: '.*?' \}/g, (match) => match + ' as any');
fs.writeFileSync('src/app/page.tsx', content);
