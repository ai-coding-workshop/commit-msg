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
  // Check if core.hooksPath is set
  const gitConfigResult = spawnSync('git', ['config', 'core.hooksPath'], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  // If the command failed or returned nothing, use default
  if (gitConfigResult.status !== 0 || !gitConfigResult.stdout) {
    console.log('core.hooksPath not set, using default hooks directory');
    return path.join(gitDir, 'hooks');
  }

  let hooksPath = gitConfigResult.stdout.trim();
  // If core.hooksPath is not set, use gitDir/hooks
  if (!hooksPath) {
    // Use default hooks directory
    return path.join(gitDir, 'hooks');
  }

  // For husky, hooks templates are stored in .husky/_/ directory,
  // which will access real hooks in .husky/ directory
  if (hooksPath.endsWith('.husky/_') || hooksPath.endsWith('.husky/_/')) {
    hooksPath = hooksPath.replace(/\/_\/?$/, '');
  }

  // If it's an absolute path, use it as is
  if (path.isAbsolute(hooksPath)) {
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

export { install, getHooksDir };
