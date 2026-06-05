---
description: Steps to install dependencies, check types, and compile/build the Referee Elite Next.js project.
---

# Build Project

Follow these steps to build the project.

## 1. Install Dependencies
Run the installation command at the project root. On Windows (due to PowerShell Execution Policy restrictions), make sure to run the `.cmd` version:
```bash
npm.cmd install
```
*(On macOS/Linux, you can run standard `npm install`)*

## 2. Typecheck (Optional but recommended)
Verify that TypeScript compiles successfully:
```bash
npx.cmd -y tsc --noEmit
```
*(On macOS/Linux: `npx -y tsc --noEmit`)*

## 3. Compile/Build the Project
Build the production-ready Next.js application:
```bash
npm.cmd run build
```
*(On macOS/Linux: `npm run build`)*
