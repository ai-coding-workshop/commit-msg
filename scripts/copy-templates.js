#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create templates directory in dist
const distTemplatesDir = path.join(distDir, 'templates');
if (!fs.existsSync(distTemplatesDir)) {
  fs.mkdirSync(distTemplatesDir, { recursive: true });
}

// Copy template files
const srcTemplatesDir = path.join(__dirname, '..', 'src', 'templates');
if (fs.existsSync(srcTemplatesDir)) {
  const files = fs.readdirSync(srcTemplatesDir);
  files.forEach((file) => {
    const srcFile = path.join(srcTemplatesDir, file);
    const destFile = path.join(distTemplatesDir, file);
    fs.copyFileSync(srcFile, destFile);
    console.log(`Copied ${srcFile} to ${destFile}`);
  });
}

console.log('Template files copied successfully!');
