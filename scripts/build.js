#!/usr/bin/env node

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Build all packages in the correct order
const packages = ['core', 'cli'];

console.log('Building packages...');

try {
  for (const pkg of packages) {
    console.log(`Building ${pkg}...`);
    const pkgPath = join(__dirname, '..', 'packages', pkg);
    execSync('npm run build', { cwd: pkgPath, stdio: 'inherit' });
  }

  console.log('All packages built successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
