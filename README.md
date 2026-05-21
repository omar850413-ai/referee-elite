# Referee Elite - Guía de Copia Manual

Si no puedes descargar el ZIP, sigue estos pasos para crear tu app en GitHub manualmente:

### 1. Crea el repositorio en GitHub
Llamalo `referee-elite`.

### 2. Crea los archivos esenciales
Crea estos archivos en tu repositorio de GitHub usando el botón "Add file" -> "Create new file":

#### A. Archivo: `package.json`
```json
{
  "name": "referee-elite",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "15.0.7",
    "lucide-react": "0.477.0",
    "firebase": "10.12.4",
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.0",
    "tailwind-merge": "3.0.1",
    "tailwindcss-animate": "1.0.7",
    "@radix-ui/react-slot": "1.2.3",
    "@radix-ui/react-toast": "1.2.6",
    "date-fns": "3.6.0"
  }
}
```

#### B. Archivo: `src/firebase/config.ts`
(Copia el contenido que te pasé anteriormente con tus llaves API).

#### C. Archivo: `src/app/page.tsx`
(Copia el código de la página principal que ves en tu editor).

### 3. Conecta a App Hosting
Una vez creados, vuelve a la consola de Firebase y selecciona este repositorio.
