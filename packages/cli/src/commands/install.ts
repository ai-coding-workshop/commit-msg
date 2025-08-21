/**
 * Install command implementation
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

async function install(): Promise<void> {
  return installImpl();
}

async function installImpl(): Promise<void> {
  console.log('Installing commit-msg hook...');

  try {
    // Check if we're in a Git repository and get the git directory
    const gitResult = spawnSync('git', ['rev-parse', '--git-dir'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    if (gitResult.status !== 0) {
      console.error('Error: Not in a Git repository');
      throw new Error('Not in a Git repository');
    }

    const gitDir = gitResult.stdout.trim();

    // Get the hooks directory
    // Check if core.hooksPath is set
    const gitConfigResult = spawnSync('git', ['config', 'core.hooksPath'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    // If git config fails, use default hooks directory
    const hooksDir =
      gitConfigResult.error || gitConfigResult.status !== 0
        ? path.join(gitDir, 'hooks')
        : (() => {
            let hooksPath = gitConfigResult.stdout.trim();
            // If core.hooksPath is set, use it
            if (hooksPath) {
              // For husky, hooks templates are stored in .husky/_/ directory,
              // which will access real hooks in .husky/ directory
              if (
                hooksPath.endsWith('.husky/_') ||
                hooksPath.endsWith('.husky/_/')
              ) {
                hooksPath = hooksPath.replace(/\/_\/?$/, '');
              }
              // If it's a relative path, join it with the git directory
              // If it's an absolute path, use it as is
              if (path.isAbsolute(hooksPath)) {
                return hooksPath;
              } else {
                // For relative paths, join with the git directory
                return path.join(gitDir, hooksPath);
              }
            } else {
              // Use default hooks directory
              return path.join(gitDir, 'hooks');
            }
          })();

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
    throw error;
  }
}

export { install, installImpl };
