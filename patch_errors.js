const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf-8');

// handleScanBatch
content = content.replace(
  "const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });\n       const { text } = await res.json();\n       \n       if (!text) throw new Error(\"No text detected\");",
  const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });
       const data = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(data.error || 'Error de conexion con Vision API');
       const text = data.text;
       if (!text) throw new Error("No se detectó ningún texto en la imagen");
);

// handleScanImage
content = content.replace(
  "const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });\n       const { text } = await res.json();\n       \n       if (!text) throw new Error(\"No text detected\");",
  const res = await fetch('/api/vision', { method: 'POST', body: JSON.stringify({ imageBase64: base64 }) });
       const data = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(data.error || 'Error de conexion con Vision API');
       const text = data.text;
       if (!text) throw new Error("No se detectó ningún texto en la imagen");
);

// Catch block replacement for handleScanBatch
content = content.replace(
  "variant: \"destructive\",\n         title: \"ERROR AL ESCANEAR\",\n         description: \"NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.\",",
  ariant: "destructive",
         title: "ERROR AL ESCANEAR",
         description: error.message || "NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.",
);
// Catch block replacement for handleScanImage
content = content.replace(
  "variant: \"destructive\",\n         title: \"ERROR AL ESCANEAR\",\n         description: \"NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.\",",
  ariant: "destructive",
         title: "ERROR AL ESCANEAR",
         description: error.message || "NO SE PUDO RECONOCER EL TEXTO. INTÉNTALO DE NUEVO.",
);

fs.writeFileSync('src/app/page.tsx', content);
console.log('Error handling improved');
