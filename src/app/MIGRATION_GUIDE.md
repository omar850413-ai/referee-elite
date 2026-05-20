# Guía de Migración: RefereElite

Este documento contiene los pasos detallados para mudar tu proyecto de **Firebase Studio** a las nuevas plataformas antes del 22 de marzo de 2027.

## Paso 1: Descargar tu Código Actual
Antes de cualquier cambio, es vital tener una copia física de todo lo que hemos construido.
1. En la parte superior de la pantalla de Firebase Studio, busca el botón **"Zip and Download"**.
2. Esto descargará un archivo llamado `refere-elite.zip` (o similar).
3. Guarda este archivo en un lugar seguro de tu computadora. **Este archivo contiene toda la lógica, componentes y diseño de tu App.**

## Paso 2: Opción A - Mudarse a Google Antigravity (Recomendado para PC)
Antigravity es la nueva herramienta de escritorio de Google para seguir desarrollando apps con IA de forma local.
1. **Descarga Antigravity:** Ve al sitio oficial indicado en el aviso de Firebase Studio y descarga el instalador para tu sistema (Windows/Mac).
2. **Instala y Abre:** Ejecuta la aplicación.
3. **Importar Proyecto:** Dentro de Antigravity, busca la opción "Import Project" o "Open Folder".
4. **Descomprime tu Zip:** Extrae el contenido del archivo `.zip` que descargaste en el Paso 1 en una carpeta de tu PC.
5. **Abre esa Carpeta:** En Antigravity, selecciona la carpeta donde extrajiste los archivos. Ahora podrás seguir editando el código y hablando con la IA localmente.

## Paso 3: Opción B - Google AI Studio (Basado en Web)
Si prefieres seguir trabajando en el navegador:
1. Haz clic en el botón **"Prepare for AI Studio"** en la interfaz actual de Firebase Studio.
2. Esto configurará tus "prompts" (instrucciones de IA) para ser compatibles.
3. Dirígete a [Google AI Studio](https://aistudio.google.com/).
4. Allí podrás importar las instrucciones y seguir refinando la lógica de tu aplicación.

## Paso 4: Mantener tu Base de Datos y Usuarios (IMPORTANTE)
**Tu base de datos (Firestore) y tus usuarios (Auth) NO se pierden.** Están alojados en la nube de Firebase, no en el editor.
1. Tu archivo `src/firebase/config.ts` ya contiene las llaves necesarias.
2. Cuando abras tu proyecto en Antigravity o lo subas a una plataforma como Vercel o Netlify, la App seguirá conectándose a tus datos actuales de Firebase automáticamente.

## Paso 5: Desarrollo Local Profesional (Opcional)
Si quieres llevar "RefereElite" al siguiente nivel fuera de las herramientas de Google:
1. Instala **Node.js** en tu computadora.
2. Descarga **Visual Studio Code** (el editor más usado del mundo).
3. Abre la carpeta de tu proyecto.
4. En la terminal escribe `npm install` y luego `npm run dev`.
5. Podrás ver tu app en `localhost:3000` y editarla como un desarrollador profesional.

---
*Guía generada para ayudar a la transición de RefereElite.*
