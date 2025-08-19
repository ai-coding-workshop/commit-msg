/**
 * Install command implementation
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

async function install(): Promise<void> {
  console.log('Installing commit-msg hook...');

  try {
    // Check if we're in a Git repository and get the git directory
    const gitResult = spawnSync('git', ['rev-parse', '--git-dir'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    if (gitResult.status !== 0) {
      console.error('Error: Not in a Git repository');
      process.exit(1);
    }

    const gitDir = gitResult.stdout.trim();

    // Get the hooks directory
    const hooksDir = path.join(gitDir, 'hooks');
    const hookPath = path.join(hooksDir, 'commit-msg');

    // Create hooks directory if it doesn't exist
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Read the hook template
    const templatePath = path.join(
      __dirname,
      '..',
      'templates',
      'commit-msg.hook'
    );
    let hookContent: string;

    try {
      hookContent = fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error('Error: Could not read hook template:', error);
      process.exit(1);
    }

    // Write the hook file
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });

    console.log('Commit-msg hook installed successfully!');
    console.log(`Hook installed at: ${hookPath}`);
  } catch (error) {
    console.error('Error installing commit-msg hook:', error);
    process.exit(1);
  }
}

export { install };
