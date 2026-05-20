# Guía de Migración: RefereElite

Este documento contiene los pasos detallados para mudar tu proyecto de **Firebase Studio** a las nuevas plataformas antes del 22 de marzo de 2027.

## Paso 1: Descargar tu Código Actual
Antes de cualquier cambio, es vital tener una copia física de todo lo que hemos construido.
1. En la parte superior de la pantalla de Firebase Studio, busca el botón **"Zip and Download"**.
2. Esto descargará un archivo llamado `refere-elite.zip` (o similar).
3. Guarda este archivo en un lugar seguro de tu computadora. **Este archivo contiene toda la lógica, componentes y diseño de tu App.**

## Paso 2: Subir tu Código a GitHub
Para que tu app sea pública, necesitas tenerla en GitHub:
1. Crea un repositorio nuevo en GitHub llamado `referee-elite`.
2. Usa la opción "uploading an existing file" en GitHub.
3. Arrastra todos los archivos que descargaste (descomprimidos) y dale a "Commit changes".

## Paso 3: Publicar con Firebase App Hosting
1. En la consola de Firebase, ve a **App Hosting**.
2. Conecta tu cuenta de GitHub y selecciona el repositorio `referee-elite`.
3. Firebase detectará que es una app de Next.js y la publicará automáticamente en un enlace oficial.

## Paso 4: Opción Alternativa - Mudarse a Google Antigravity (Para PC)
Antigravity es la nueva herramienta de escritorio de Google para seguir desarrollando apps con IA de forma local.
1. **Descarga Antigravity:** Ve al sitio oficial indicado en el aviso de Firebase Studio y descarga el instalador para tu sistema (Windows/Mac).
2. **Importar Proyecto:** Selecciona la carpeta donde extrajiste los archivos del Paso 1.

## Paso 5: Mantener tu Base de Datos y Usuarios (IMPORTANTE)
**Tu base de datos (Firestore) y tus usuarios (Auth) NO se pierden.** Están alojados en la nube de Firebase, no en el editor.
1. Tu archivo `src/firebase/config.ts` ya contiene las llaves necesarias.
2. La App publicada en App Hosting se conectará automáticamente a tus datos actuales.

---
*Guía actualizada para incluir el proceso de GitHub y Hosting.*