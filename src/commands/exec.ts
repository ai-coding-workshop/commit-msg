/**
 * Exec command implementation
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

// Define environment variable configurations and their corresponding CoDevelopedBy values
// Format: ["key=value", "co-developed-by-string"]
const envConfigs: [string, string][] = [
  // We can run CLI in IDE (such as Cursor and Qoder), so check CLI env variables first
  ['CLAUDECODE=1', 'Claude <noreply@anthropic.com>'],
  ['IFLOW_CLI=1', 'iFlow <noreply@iflow.cn>'],
  ['QWEN_CODE=1', 'Qwen-Coder <noreply@alibabacloud.com>'],
  ['GEMINI_CLI=1', 'Gemini <noreply@developers.google.com>'],
  // Check env variables for IDEs
  ['CURSOR_TRACE_ID=*', 'Cursor <noreply@cursor.com>'],
  ['__CFBundleIdentifier=dev.kiro.desktop', 'Kiro <noreply@kiro.dev>'],
  ['VSCODE_BRAND=Qoder', 'Qoder <noreply@qoder.com>'],
  ['__CFBundleIdentifier=com.qoder.ide', 'Qoder <noreply@qoder.com>'], // Use this unstable variable until Qoder has a better one
  // Check env variables for IDEs in remove development environments
  ['VSCODE_GIT_ASKPASS_MAIN=*.cursor-server*', 'Cursor <noreply@cursor.com>'],
  ['BROWSER=*.cursor-server*', 'Cursor <noreply@cursor.com>'],
  ['VSCODE_GIT_ASKPASS_MAIN=*.qoder-server*', 'Qoder <noreply@qoder.com>'],
  ['BROWSER=*.qoder-server*', 'Qoder <noreply@qoder.com>'],
];

/**
 * Clear all environment variables used by getCoDevelopedBy function
 * This is useful for testing to ensure clean state
 */
function clearCoDevelopedByEnvVars(): void {
  for (const [envConfig] of envConfigs) {
    const equalIndex = envConfig.indexOf('=');
    if (equalIndex === -1) {
      // No '=' found, just a key
      delete process.env[envConfig];
    } else {
      // Split into key and value
      const key = envConfig.substring(0, equalIndex);
      delete process.env[key];
    }
  }
}

async function exec(messageFile: string): Promise<void> {
  // Handle debug argument - exit gracefully without error
  if (messageFile === 'DEBUG_MODE_TEST') {
    console.log('Debug mode: exiting without processing');
    process.exit(0);
  }

  console.log(`Executing commit-msg hook on file: ${messageFile}`);

  try {
    // Check if message file exists
    if (!fs.existsSync(messageFile)) {
      throw new Error(`Commit message file not found: ${messageFile}`);
    }

    // Check if this is a merge commit ( Editting MERGE_MSG or editing current merge commit)
    if (isMergeCommit(messageFile)) {
      console.log(
        'Merge commit detected, skipping commit-msg hook processing.'
      );
      return;
    }

    // Read the commit message file
    const messageContent = fs.readFileSync(messageFile, 'utf8');

    // Get Git configuration options
    const config = getGitConfig();

    // Process the commit message
    const { message: processedMessage, shouldSave } =
      await processCommitMessage(messageContent, config);

    // Write the processed message back to the file only if shouldSave is true
    if (shouldSave) {
      fs.writeFileSync(messageFile, processedMessage, 'utf8');
      console.log('Commit message processed and saved successfully!');
    } else {
      console.log('Commit message processed, no changes needed.');
    }
  } catch (error) {
    throw new Error(`Error processing commit message: ${error}`);
  }
}

/**
 * Convert a string value to a boolean.
 * Accepts 'true', 'yes', 'on', '1' as truthy values (case-insensitive).
 * Everything else is considered falsy.
 * @param value The string value to convert
 * @returns The boolean representation of the value
 */
function stringToBoolean(value: string): boolean {
  const lowerValue = value.toLowerCase();
  return (
    lowerValue === 'true' ||
    lowerValue === 'yes' ||
    lowerValue === 'on' ||
    lowerValue === '1'
  );
}

/**
 * Get Git configuration options
 * @returns Object containing Git configuration options
 */
function getGitConfig(): {
  createChangeId: boolean;
  commentChar: string;
  createCoDevelopedBy: boolean;
} {
  // Default values
  let createChangeId = true;
  let commentChar = '#';
  let createCoDevelopedBy = true;

  try {
    // Get all Git config in one call
    const configResult = spawnSync('git', ['config', '--list', '--includes'], {
      encoding: 'utf8',
    });

    if (configResult.status === 0 && configResult.stdout) {
      // Parse all config lines
      const configLines = configResult.stdout.trim().split('\n');

      // Process each line to find the configs we need
      for (const line of configLines) {
        const equalIndex = line.indexOf('=');
        if (equalIndex === -1) continue;

        const key = line.substring(0, equalIndex).toLowerCase();
        const value = line.substring(equalIndex + 1);

        // Check for gerrit.createChangeId (boolean)
        if (
          key === 'gerrit.createchangeid' ||
          key === 'commit-msg.changeid' ||
          key === 'commitmsg.changeid'
        ) {
          createChangeId = stringToBoolean(value);
        }
        // Check for core.commentChar (string)
        else if (key === 'core.commentchar' && value) {
          commentChar = value;
        }
        // Check for commit-msg.coDevelopedBy (boolean)
        else if (
          key === 'commit-msg.codevelopedby' ||
          key === 'commitmsg.codevelopedby'
        ) {
          createCoDevelopedBy = stringToBoolean(value);
        }
      }
    }
  } catch (error) {
    // Use default values if git config commands fail
    console.warn('Warning: Could not read Git configuration, using defaults');
    console.debug('Git config error:', error);
  }

  return {
    createChangeId,
    commentChar,
    createCoDevelopedBy,
  };
}

/**
 * Check if the current commit is a merge commit (has two or more parents or starts with "Merge ")
 * @returns True if this is a merge commit
 */
function isMergeCommit(messageFile: string): boolean {
  // Check if this is a merge commit: editing .git/MERGE_MSG
  if (path.basename(messageFile) == 'MERGE_MSG') {
    return true;
  }

  try {
    // Read the commit message to check if it starts with "Merge "
    if (fs.existsSync(messageFile)) {
      const messageContent = fs.readFileSync(messageFile, 'utf8');
      const firstLine = messageContent.split('\n')[0].trim();
      if (firstLine.startsWith('Merge ')) {
        return true;
      }
    }

    // Get current tree id
    const treeResult = spawnSync('git', ['write-tree'], {
      encoding: 'utf8',
    });

    // If write-tree fails, we're likely in a situation where we can't determine
    // if this is a merge commit, so we assume it's not
    if (treeResult.status !== 0) {
      // This could happen in various situations like an empty repository or other git issues
      // In such cases, we conservatively assume it's not a merge commit
      return false;
    }

    const tree = treeResult.stdout.trim();
    // Get HEAD commit tree id
    const headTreeResult = spawnSync('git', ['rev-parse', 'HEAD^{tree}'], {
      encoding: 'utf8',
    });

    // If we can't get the HEAD tree, it might be because HEAD doesn't exist yet (empty repo)
    // In such cases, we assume it's not a merge commit
    if (headTreeResult.status !== 0) {
      return false;
    }

    if (headTreeResult.stdout && headTreeResult.stdout.trim() !== tree) {
      // If tree id is not the same as head tree id, we assume a new no-merge
      // commit is being created, without inspecting prepare-commit-msg.
      // TODO: call prepare-commit-msg to distinguish an amend merge commit with tree changes.
      return false;
    }

    // We are modifying the log message of the current commit, though it's also
    // possible that we are creating an empty commit.
    // Check if it's a merge commit by checking the number of parent commits of
    // HEAD: HEAD^@ expands to all parent commits, one per line
    const result = spawnSync('git', ['rev-parse', 'HEAD^@'], {
      encoding: 'utf8',
    });

    if (result.status === 0 && result.stdout) {
      // Count the number of parent commits (lines in output)
      const parents = result.stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
      // If there are 2 or more parents, it's a merge commit
      return parents.length >= 2;
    }

    // If the command fails or returns no parents, assume it's not a merge commit
    return false;
  } catch (error) {
    // If there's an error, assume it's not a merge commit
    console.warn(
      'Warning: Could not determine if this is a merge commit, assuming not'
    );
    console.debug('Git rev-parse error:', error);
    return false;
  }
}

/**
 * Get the CoDevelopedBy value
 * @returns The CoDevelopedBy value or empty string if not configured
 */
function getCoDevelopedBy(): string {
  // Check each environment configuration in order
  for (const [envConfig, coDevelopedBy] of envConfigs) {
    // Parse the environment configuration
    const equalIndex = envConfig.indexOf('=');
    let key: string;
    let expectedValue: string | null = null;

    if (equalIndex === -1) {
      // No '=' found, just a key
      key = envConfig;
    } else {
      // Split into key and value
      key = envConfig.substring(0, equalIndex);
      expectedValue = envConfig.substring(equalIndex + 1);
    }

    // Check if the environment variable exists
    const actualValue = process.env[key];

    if (actualValue === undefined) {
      // Key doesn't exist, continue to next configuration
      continue;
    }

    // First check for exact match
    if (
      expectedValue !== null &&
      expectedValue !== '*' &&
      actualValue === expectedValue
    ) {
      return coDevelopedBy;
    }

    // For wildcard cases (*) or null for expectedValue, only return CoDevelopedBy
    // if the value is actually meaningful
    if (expectedValue === '*' || expectedValue === null) {
      // Only return CoDevelopedBy if the actual value is truthy (not empty, not '0', not 'false', etc.)
      if (
        actualValue &&
        actualValue !== '0' &&
        actualValue !== 'false' &&
        actualValue !== 'no'
      ) {
        return coDevelopedBy;
      }
      // Continue to next configuration if value is falsy
      continue;
    }

    // For pattern matching cases (starts and ends with *, e.g., "*.cursor-server*")
    if (
      expectedValue &&
      expectedValue.startsWith('*') &&
      expectedValue.endsWith('*') &&
      expectedValue.length > 2
    ) {
      // Extract the pattern between the asterisks
      const pattern = expectedValue.substring(1, expectedValue.length - 1);
      if (actualValue.includes(pattern)) {
        return coDevelopedBy;
      }
      continue;
    }
  }

  // Return empty string if none of the environment configurations match
  return '';
}

/**
 * Process the commit message content
 * @param messageContent The content of the commit message
 * @param config Git configuration options
 * @returns Object containing the processed commit message and a flag indicating if it should be saved
 */
async function processCommitMessage(
  messageContent: string,
  config: {
    createChangeId: boolean;
    commentChar: string;
    createCoDevelopedBy: boolean;
  } = {
    createChangeId: true,
    commentChar: '#',
    createCoDevelopedBy: true,
  }
): Promise<{ message: string; shouldSave: boolean }> {
  // User does not save the commit message, let Git to abort the commit
  const trimmedContent = messageContent.trim();
  if (trimmedContent === '') {
    return { message: '', shouldSave: false };
  }

  // Clean the message (remove diff, Signed-off-by lines, comments, etc.)
  const { message: cleanedMessage, shouldSave: cleanShouldSave } =
    cleanCommitMessage(messageContent, config.commentChar);

  // User does not save the commit message, let Git to abort the commit
  if (cleanedMessage.trim() === '') {
    return { message: '', shouldSave: false };
  }

  // Generate and insert Change-Id and CoDevelopedBy if configured
  const trailers: { ChangeId?: string; CoDevelopedBy?: string } = {};
  if (config.createChangeId) {
    trailers.ChangeId = generateChangeId(cleanedMessage);
  }
  if (config.createCoDevelopedBy) {
    trailers.CoDevelopedBy = getCoDevelopedBy();
  }

  // Check if we need to insert a Change-Id
  if (!needsChangeId(cleanedMessage, config.createChangeId)) {
    // Log specific reason for not inserting Change-Id
    if (!config.createChangeId) {
      console.log('Change-Id generation disabled by configuration');
    } else if (isTemporaryCommit(cleanedMessage)) {
      console.log('Temporary commit detected, skipping Change-Id generation');
    } else if (hasChangeId(cleanedMessage)) {
      console.log('Change-Id already exists, skipping generation');
    }
    trailers.ChangeId = undefined;
  }

  // Check if we need to insert a CoDevelopedBy
  if (!needsCoDevelopedBy(cleanedMessage, config.createCoDevelopedBy)) {
    // Log specific reason for not inserting Co-developed-by
    if (!config.createCoDevelopedBy) {
      console.log('Co-developed-by generation disabled by configuration');
    } else if (isTemporaryCommit(cleanedMessage)) {
      console.log(
        'Temporary commit detected, skipping Co-developed-by generation'
      );
    } else if (hasCoDevelopedBy(cleanedMessage)) {
      console.log('Co-developed-by already exists, skipping generation');
    }
    trailers.CoDevelopedBy = undefined;
  }

  // Do not need to insert anything
  if (!trailers.CoDevelopedBy && !trailers.ChangeId) {
    return { message: cleanedMessage, shouldSave: cleanShouldSave };
  }

  const messageWithChangeId = insertTrailers(cleanedMessage, trailers);

  return { message: messageWithChangeId, shouldSave: true };
}

/**
 * Clean the commit message by removing unwanted content
 * @param message The commit message content
 * @param commentChar The comment character from Git config
 * @returns Object containing the cleaned commit message and a flag indicating if it should be saved
 */
function cleanCommitMessage(
  message: string,
  commentChar: string = '#'
): { message: string; shouldSave: boolean } {
  // Split message into lines
  const lines = message.split('\n');

  // Process lines according to requirements
  const processedLines = [];
  let lastLineWasEmpty = true;
  let shouldSave = false; // Track if any changes were made

  for (const line of lines) {
    // If we found a diff line, skip all remaining lines
    if (line.startsWith('diff --git ')) {
      // Return what we have so far
      break;
    }

    // Skip comment lines
    if (line.startsWith(commentChar)) {
      // Check if this is a scissors line by removing comment char and dashes
      //   # ------------------------ >8 ------------------------
      //   # ------------------------ 8< ------------------------
      const contentAfterComment = line.substring(commentChar.length);
      const scissorsPattern = contentAfterComment
        .replace(/^[\s-]+/, '') // Remove leading whitespace and dashes
        .replace(/[\s-]+$/, '') // Remove trailing whitespace and dashes
        .trim();

      // Only match exact scissors patterns: >8 or 8<
      if (scissorsPattern === '>8' || scissorsPattern === '8<') {
        // Found scissors line, return what we have so far
        break;
      }

      // Ignore other comment lines
      continue;
    }

    // Trim trailing whitespace from line
    const trimmedLine = line.trimEnd();

    // Skip empty lines if the last line was also empty (to avoid multiple consecutive empty lines)
    if (trimmedLine === '') {
      if (!lastLineWasEmpty) {
        processedLines.push(trimmedLine);
        lastLineWasEmpty = true;
      }
      continue;
    }

    // Add non-empty line
    processedLines.push(trimmedLine);
    lastLineWasEmpty = false;
  }

  // Remove trailing empty lines
  while (
    processedLines.length > 0 &&
    processedLines[processedLines.length - 1] === ''
  ) {
    processedLines.pop();
  }

  // Check if all lines are s-o-b lines, or empty lines, return empty message
  const hasNonEmptyNonSignedOffBy = processedLines.some((line) => {
    const trimmed = line.trim();
    return (
      trimmed !== '' && !trimmed.toLowerCase().startsWith('signed-off-by:')
    );
  });

  if (!hasNonEmptyNonSignedOffBy) {
    return { message: '', shouldSave: false };
  }

  // Check if we need to insert a blank line between first and second lines
  if (processedLines.length >= 2 && processedLines[1] !== '') {
    // Insert a blank line between first and second lines
    processedLines.splice(1, 0, '');
    shouldSave = true;
  }

  // Join lines back together
  const cleanedMessage = processedLines.join('\n');

  // Only need to save when there are real changes, such as:
  // insert empty line after subject.
  return { message: cleanedMessage, shouldSave: shouldSave };
}

/**
 * Check if this is a temporary commit (fixup!/squash!)
 * @param message The commit message content
 * @returns True if this is a temporary commit
 */
function isTemporaryCommit(message: string): boolean {
  const firstLine = message.split('\n')[0].trim();
  return firstLine.startsWith('fixup!') || firstLine.startsWith('squash!');
}

/**
 * Check if the commit message already has a Change-Id
 * @param message The commit message content
 * @returns True if Change-Id exists
 */
function hasChangeId(message: string): boolean {
  const lines = message.split('\n');
  const changeIdRegex = /^Change-Id: I[a-f0-9]+\s*$/;

  for (const line of lines) {
    if (changeIdRegex.test(line)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the commit message already has a Co-developed-by
 * @param message The commit message content
 * @returns True if Co-developed-by exists
 */
function hasCoDevelopedBy(message: string): boolean {
  const lines = message.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().startsWith('co-developed-by:')) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the commit message needs a Change-Id to be inserted
 * @param message The commit message content
 * @param createChangeId Configuration flag indicating if Change-Id generation is enabled
 * @returns True if Change-Id should be inserted
 */
function needsChangeId(message: string, createChangeId: boolean): boolean {
  // If Change-Id generation is disabled, don't insert Change-Id
  if (!createChangeId) {
    return false;
  }

  // If Change-Id already exists, don't insert another one
  if (hasChangeId(message)) {
    return false;
  }

  // If this is a temporary commit (fixup!/squash!), don't insert Change-Id
  if (isTemporaryCommit(message)) {
    return false;
  }

  // Otherwise, we need to insert a Change-Id
  return true;
}

/**
 * Check if the commit message needs a Co-developed-by to be inserted
 * @param message The commit message content
 * @param createCoDevelopedBy Configuration flag indicating if Co-developed-by generation is enabled
 * @returns True if Co-developed-by should be inserted
 */
function needsCoDevelopedBy(
  message: string,
  createCoDevelopedBy: boolean
): boolean {
  // If Co-developed-by generation is disabled, don't insert Co-developed-by
  if (!createCoDevelopedBy) {
    return false;
  }

  // If Co-developed-by already exists, don't insert another one
  if (hasCoDevelopedBy(message)) {
    return false;
  }

  // If this is a temporary commit (fixup!/squash!), don't insert Co-developed-by
  if (isTemporaryCommit(message)) {
    return false;
  }

  // Otherwise, we need to insert a Co-developed-by
  return true;
}

// Get timezone offset, in +HHMM format
function getTimezoneOffsetString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (absOffset % 60).toString().padStart(2, '0');
  return (offset <= 0 ? '+' : '-') + hours + minutes;
}

/**
 * Generate the input for Change-Id generation based on Git commit data
 * @param message The cleaned commit message
 * @returns The input string for Change-Id generation
 */
function _gen_ChangeIdInput(message: string): string {
  try {
    const now = new Date();
    // Unix epoch time
    const timestamp = Math.floor(now.getTime() / 1000);
    const tzOffset = getTimezoneOffsetString(now);

    // Get tree hash
    const treeResult = spawnSync('git', ['write-tree'], {
      encoding: 'utf8',
    });
    if (treeResult.status !== 0) {
      throw new Error('Failed to execute git write-tree');
    }
    const tree = treeResult.stdout.trim();

    // Try to get parent commit hash
    const parentResult = spawnSync('git', ['rev-parse', 'HEAD^0'], {
      encoding: 'utf8',
    });
    const parent =
      parentResult.status === 0 ? parentResult.stdout.trim() : null;

    // Get author identity
    const authorResult = spawnSync('git', ['var', 'GIT_AUTHOR_IDENT'], {
      encoding: 'utf8',
    });
    const author =
      authorResult.status === 0
        ? authorResult.stdout.trim()
        : `Unknown <unknown@example.com> ${timestamp} ${tzOffset}`;

    // Get committer identity
    const committerResult = spawnSync('git', ['var', 'GIT_COMMITTER_IDENT'], {
      encoding: 'utf8',
    });
    const committer =
      committerResult.status === 0
        ? committerResult.stdout.trim()
        : `Unknown <unknown@example.com> ${timestamp} ${tzOffset}`;

    // Construct the input
    let input = `tree ${tree}\n`;
    if (parent) {
      input += `parent ${parent}\n`;
    }
    input += `author ${author}\n`;
    input += `committer ${committer}\n\n`;
    input += message;

    return input;
  } catch (error) {
    throw new Error(`Error generating Change-Id input: ${error}`);
  }
}

/**
 * Generate a Change-Id based on the commit message content
 * @param message The commit message content
 * @returns The generated Change-Id
 */
function generateChangeId(message: string): string {
  try {
    // Generate the input for Change-Id generation
    const input = _gen_ChangeIdInput(message);

    // Use Git's hash-object command to generate a SHA-1 hash
    const result = spawnSync(
      'git',
      ['hash-object', '-t', 'commit', '--stdin'],
      {
        input: input,
        encoding: 'utf8',
      }
    );

    if (result.status === 0 && result.stdout) {
      const hash = result.stdout.trim();
      return `I${hash}`;
    } else {
      throw new Error('Failed to generate Change-Id with git hash-object');
    }
  } catch (error) {
    // Fallback to a simpler hash generation if git command fails
    console.warn(
      'Warning: Could not use git hash-object, using fallback hash generation',
      error
    );
  }

  // Fallback hash generation (simplified version)
  let hash = 2166136261; // FNV offset basis
  const timestamp = new Date().getTime().toString();
  const contentToHash = `${message}\n${timestamp}\n`;

  for (let i = 0; i < contentToHash.length; i++) {
    hash ^= contentToHash.charCodeAt(i);
    hash *= 16777619; // FNV prime
    hash >>>= 0; // Convert to unsigned 32-bit integer
  }

  // Convert to a hexadecimal string
  let hex = hash.toString(16);
  while (hex.length < 32) {
    hex = '0' + hex;
  }

  // Ensure it's exactly 32 characters
  if (hex.length > 32) {
    hex = hex.substring(0, 32);
  }

  return `I${hex}`;
}

/**
 * Extract user info from a trailer line (e.g., "Co-authored-by: John Doe <john@example.com>")
 * @param line The trailer line
 * @returns The user info part (name and email) or null if not a valid trailer
 */
function extractUserInfoFromTrailer(line: string): string | null {
  const trailerRegex = /^[a-zA-Z0-9-]+:\s*(.+)$/;
  const match = line.match(trailerRegex);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Filter out duplicate trailers that have the same user info as the CoDevelopedBy trailer
 * @param lines The existing trailer lines
 * @param coDevelopedBy The CoDevelopedBy trailer value
 * @returns Filtered trailer lines without duplicates
 */
function filterDuplicateTrailers(
  lines: string[],
  coDevelopedBy: string
): string[] {
  // Extract user info from CoDevelopedBy
  const coDevelopedByUserInfo = extractUserInfoFromTrailer(
    `Co-developed-by: ${coDevelopedBy}`
  );
  if (!coDevelopedByUserInfo) {
    return lines;
  }

  // Define trailer types to check for duplicates (using lowercase for comparison)
  const duplicateTrailerPrefixes = ['co-authored-by:', 'signed-off-by:'];

  return lines.filter((line) => {
    const lowerLine = line.toLowerCase();

    // Check if this is one of the trailer types we want to check for duplicates
    const isDuplicateTrailer = duplicateTrailerPrefixes.some((prefix) =>
      lowerLine.startsWith(prefix)
    );

    if (!isDuplicateTrailer) {
      return true; // Keep non-duplicate trailer types
    }

    // Extract user info from this line
    const userInfo = extractUserInfoFromTrailer(line);
    if (!userInfo) {
      return true; // Keep lines we can't parse
    }

    // Keep the line if the user info is different from CoDevelopedBy
    return userInfo !== coDevelopedByUserInfo;
  });
}

/**
 * Insert trailers into the commit message at the correct position
 * @param message The commit message content
 * @param trailers An object containing trailers to insert (supports ChangeId and CoDevelopedBy)
 * @returns The commit message with the inserted trailers
 */
function insertTrailers(
  message: string,
  trailers: { ChangeId?: string; CoDevelopedBy?: string }
): string {
  const lines = message.split('\n');
  const trailerLines: string[] = [];

  // Convert trailer object to lines
  // When both ChangeId and CoDevelopedBy exist, ChangeId should come first
  if (trailers.ChangeId) {
    trailerLines.push(`Change-Id: ${trailers.ChangeId}`);
  }
  if (trailers.CoDevelopedBy) {
    trailerLines.push(`Co-developed-by: ${trailers.CoDevelopedBy}`);
  }

  // Output array for the processed lines
  const outputLines = [];

  // Trailer related variables
  const existingTrailers = [];
  let inTrailerSection = false;

  // Regex patterns for trailer identification
  const trailerRegex = /^[a-zA-Z0-9-]{1,64}: /;
  const trailerCommentRegex1 = /^\[.+\]$/;
  const trailerCommentRegex2 = /^\(.+\)$/;

  // Process lines
  for (const line of lines) {
    // Check for empty line
    if (line === '') {
      inTrailerSection = true;
      if (existingTrailers.length > 0) {
        // Add all content lines to output
        outputLines.push(...existingTrailers);
        existingTrailers.length = 0; // Clear trailers array
      }
      // Add empty line to output
      outputLines.push(line);
      continue;
    }

    // If we haven't found an empty line yet, this is content
    if (!inTrailerSection) {
      outputLines.push(line);
      continue;
    }

    // We may in the trailer section (after empty line)
    // Check if this line is a trailer
    if (
      trailerRegex.test(line) ||
      trailerCommentRegex1.test(line) ||
      trailerCommentRegex2.test(line)
    ) {
      // This is a trailer, add to existingTrailers array
      existingTrailers.push(line);
    } else {
      // This is not a trailer
      // If we were in trailer section and found non-trailer,
      // add all trailers to output and mark that we're no longer in trailer section
      if (existingTrailers.length > 0) {
        outputLines.push(...existingTrailers);
        existingTrailers.length = 0;
      }
      inTrailerSection = false;
      // Add this non-trailer line to output
      outputLines.push(line);
    }
  }

  // If we still have existingTrailers in the array, they are real trailers
  // Need to check each trailer to see if it's a comment or not
  if (existingTrailers.length > 0) {
    // Filter out duplicate trailers if we're adding a CoDevelopedBy trailer
    let filteredTrailers = existingTrailers;
    if (trailers.CoDevelopedBy) {
      filteredTrailers = filterDuplicateTrailers(
        existingTrailers,
        trailers.CoDevelopedBy
      );
    }

    // Find the first non-comment trailer
    let firstNonCommentIndex = -1;
    for (let i = 0; i < filteredTrailers.length; i++) {
      const trailer = filteredTrailers[i];
      // If it's not a comment, this is where we insert the new trailers
      if (
        !trailerCommentRegex1.test(trailer) &&
        !trailerCommentRegex2.test(trailer)
      ) {
        firstNonCommentIndex = i;
        break;
      }
    }

    if (firstNonCommentIndex === -1) {
      // All trailers are comments, add new trailers at the end
      outputLines.push(...filteredTrailers);
      if (trailerLines.length > 0) {
        outputLines.push(...trailerLines);
      }
    } else {
      // Special handling for CoDevelopedBy trailer placement
      // If ChangeId is empty, don't insert ChangeId trailer
      // Check if the first existing trailer is a ChangeId
      const firstTrailer = filteredTrailers[firstNonCommentIndex];
      if (firstTrailer.startsWith('Change-Id:')) {
        firstNonCommentIndex++;
      }
      outputLines.push(...filteredTrailers.slice(0, firstNonCommentIndex));
      if (trailerLines.length > 0) {
        outputLines.push(...trailerLines);
      }
      outputLines.push(...filteredTrailers.slice(firstNonCommentIndex));
    }
  } else {
    // No existing trailers found, just add new trailers at the end
    if (trailerLines.length > 0) {
      outputLines.push('');
      outputLines.push(...trailerLines);
    }
  }

  return outputLines.join('\n');
}

export {
  exec,
  processCommitMessage,
  cleanCommitMessage,
  isTemporaryCommit,
  hasChangeId,
  needsChangeId,
  generateChangeId,
  insertTrailers,
  getCoDevelopedBy,
  isMergeCommit,
  hasCoDevelopedBy,
  needsCoDevelopedBy,
  clearCoDevelopedByEnvVars,
  extractUserInfoFromTrailer,
  filterDuplicateTrailers,
};
