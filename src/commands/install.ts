/**
 * Install command implementation
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

/**
 * Get the Git hooks directory path
 * @param gitDir The Git directory path
 * @returns The hooks directory path
 */
function getHooksDir(gitDir: string): string {
  let hooksPath = '';

  // Check if core.hooksPath is set
  const gitConfigResult = spawnSync('git', ['config', 'core.hooksPath'], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  // If the command failed or returned nothing, check for existing directories
  if (gitConfigResult.status !== 0 || !gitConfigResult.stdout) {
    console.log(
      'core.hooksPath not set, checking for existing hooks directories'
    );
  } else {
    hooksPath = gitConfigResult.stdout.trim();
  }

  // If core.hooksPath is empty, check for existing directories
  if (!hooksPath) {
    hooksPath = checkForExistingHooksDir(gitDir);
  }

  // For husky, hooks templates are stored in .husky/_/ directory,
  // which will access real hooks in .husky/ directory
  if (hooksPath.endsWith('.husky/_') || hooksPath.endsWith('.husky/_/')) {
    hooksPath = hooksPath.replace(/\/_\/?$/, '');
  }

  // If it's a relative path, join it with the git directory
  // If it's an absolute path, use it as is
  if (path.isAbsolute(hooksPath)) {
    return hooksPath;
  }

  // Special case: if hooksPath is already in the format of gitDir/hooks, return it as is
  if (hooksPath === path.join(gitDir, 'hooks')) {
    return hooksPath;
  }

  // For relative paths, join with the working directory root
  const workDirRootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  // If the command failed or returned nothing, use default hooks directory
  if (workDirRootResult.status !== 0 || !workDirRootResult.stdout) {
    console.log(
      'Failed to get working directory root, using default hooks directory'
    );
    return path.join(gitDir, 'hooks');
  }

  const workDirRoot = workDirRootResult.stdout.trim();
  return path.join(workDirRoot, hooksPath);
}

/**
 * Check for existing hooks directories (.husky or .githooks) and return appropriate path
 * @param gitDir The Git directory path
 * @returns The hooks directory path
 */
function checkForExistingHooksDir(gitDir: string): string {
  try {
    const workDirRootResult = spawnSync(
      'git',
      ['rev-parse', '--show-toplevel'],
      {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }
    );

    // Check if the command executed successfully
    if (workDirRootResult.status !== 0 || !workDirRootResult.stdout) {
      throw new Error('Failed to get working directory root');
    }

    const workDirRoot = workDirRootResult.stdout.trim();

    // Define hooks directories to check in order of preference
    const hooksDirectories = ['.husky/_', '.husky', '.githooks'];

    // Loop through each hooks directory and check if it exists
    for (const hooksDir of hooksDirectories) {
      const hooksPath = path.join(workDirRoot, hooksDir);

      if (fs.existsSync(hooksPath) && fs.statSync(hooksPath).isDirectory()) {
        // Set core.hooksPath to the found directory and return the path
        spawnSync('git', ['config', 'core.hooksPath', hooksDir], {
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        return hooksPath;
      }
    }

    // If no existing hooks directories found, use default hooks directory
    return path.join(gitDir, 'hooks');
  } catch {
    // If we can't determine the working directory root, use default
    console.log(
      'No existing hooks directories found, using default hooks directory'
    );
    return path.join(gitDir, 'hooks');
  }
}

async function install(): Promise<void> {
  console.log('Installing commit-msg hook...');

  // Check if we're in a Git repository and get the git directory
  const gitDirResult = spawnSync('git', ['rev-parse', '--git-dir'], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  // If the command failed or returned nothing, exit with error
  if (gitDirResult.status !== 0 || !gitDirResult.stdout) {
    console.error('Error: Not in a Git repository');
    process.exit(1);
  }

  const gitDir = gitDirResult.stdout.trim();

  // Get the hooks directory
  const hooksDir = getHooksDir(gitDir);

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

  try {
    // Write the hook file
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    console.log('Commit-msg hook installed successfully!');
    console.log(`Hook installed at: ${hookPath}`);
  } catch (error) {
    console.error('Error installing commit-msg hook:', error);
    throw error;
  }
}

export { install, getHooksDir, checkForExistingHooksDir };
