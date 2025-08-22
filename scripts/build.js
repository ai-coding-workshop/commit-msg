#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run TypeScript compilation
console.log('Running TypeScript compilation...');
execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });

// Copy template files
console.log('Copying template files...');
const copyTemplatesScript = path.join(__dirname, 'copy-templates.js');
execSync(`node "${copyTemplatesScript}"`, { stdio: 'inherit' });

// Set executable permissions for bin files
const distBinDir = path.join(__dirname, '..', 'dist', 'bin');
if (fs.existsSync(distBinDir)) {
  const files = fs.readdirSync(distBinDir);
  files.forEach((file) => {
    if (file.endsWith('.js')) {
      const filePath = path.join(distBinDir, file);
      // Set executable permission (chmod +x)
      fs.chmodSync(filePath, 0o755);
      console.log(`Set executable permission for ${filePath}`);
    }
  });
}

console.log('Build completed successfully!');
