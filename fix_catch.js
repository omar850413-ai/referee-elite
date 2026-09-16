const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');
content = content.replace(/description: "NO SE PUDO RECONOCER EL TEXTO.*? NUEVO\.",/g, 'description: error?.message || "NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.",');
fs.writeFileSync('src/app/page.tsx', content);
