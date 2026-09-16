const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');
content = content.replace(/description: error\?\.message/g, 'description: (error as Error)?.message');
fs.writeFileSync('src/app/page.tsx', content);
