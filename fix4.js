const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');

const search = "const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });\\n       const { text } = await res.json();\\n       \\n       if (!text) throw new Error(\\\"No text detected\\\");";
const replacement = const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });
       const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
       if (!res.ok) throw new Error(data.error || 'Error de conexión con Vision API');
       const text = data.text;
       if (!text) throw new Error("No se detectó ningún texto en la imagen");;

content = content.replace(search, replacement);
content = content.replace(search, replacement);

const searchCatch = "description: \\\"NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.\\\",";
const replaceCatch = "description: error.message || \\\"NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.\\\",";
content = content.replace(searchCatch, replaceCatch);
content = content.replace(searchCatch, replaceCatch);

fs.writeFileSync('src/app/page.tsx', content);
console.log('Fixed');
