/**
 * Exec command implementation
 */

import * as fs from 'fs';
import { spawnSync } from 'child_process';

async function exec(messageFile: string): Promise<void> {
  console.log(`Executing commit-msg hook on file: ${messageFile}`);

  try {
    // Check if message file exists
    if (!fs.existsSync(messageFile)) {
      console.error(`Error: Commit message file not found: ${messageFile}`);
      process.exit(1);
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
    console.error('Error processing commit message:', error);
    process.exit(1);
  }
}

/**
 * Get Git configuration options
 * @returns Object containing Git configuration options
 */
function getGitConfig(): { createChangeId: boolean; commentChar: string } {
  // Default values
  let createChangeId = true;
  let commentChar = '#';

  try {
    // Get gerrit.createChangeId config
    const createChangeIdResult = spawnSync(
      'git',
      ['config', 'gerrit.createChangeId'],
      {
        encoding: 'utf8',
      }
    );

    if (createChangeIdResult.stdout.trim() === 'false') {
      createChangeId = false;
    }

    // Get core.commentChar config
    const commentCharResult = spawnSync('git', ['config', 'core.commentChar'], {
      encoding: 'utf8',
    });

    if (commentCharResult.stdout.trim()) {
      commentChar = commentCharResult.stdout.trim();
    }
  } catch (_error) {
    // Use default values if git config commands fail
    console.warn('Warning: Could not read Git configuration, using defaults');
  }

  return { createChangeId, commentChar };
}

/**
 * Process the commit message content
 * @param messageContent The content of the commit message
 * @param config Git configuration options
 * @returns Object containing the processed commit message and a flag indicating if it should be saved
 */
async function processCommitMessage(
  messageContent: string,
  config: { createChangeId: boolean; commentChar: string } = {
    createChangeId: true,
    commentChar: '#',
  }
): Promise<{ message: string; shouldSave: boolean }> {
  // Clean the message (remove diff, Signed-off-by lines, comments, etc.)
  const cleanedMessage = cleanCommitMessage(messageContent, config.commentChar);

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
    return { message: cleanedMessage, shouldSave: false };
  }

  // Generate and insert Change-Id
  const changeId = generateChangeId(cleanedMessage);
  const messageWithChangeId = insertChangeId(cleanedMessage, changeId);

  return { message: messageWithChangeId, shouldSave: true };
}

/**
 * Clean the commit message by removing unwanted content
 * @param message The commit message content
 * @param commentChar The comment character from Git config
 * @returns The cleaned commit message
 */
function cleanCommitMessage(
  message: string,
  commentChar: string = '#'
): string {
  // Split message into lines
  const lines = message.split('\n');

  // Process lines according to requirements
  const processedLines = [];
  let foundDiff = false;
  let lastLineWasEmpty = false;

  for (const line of lines) {
    // If we found a diff line, skip all remaining lines
    if (line.startsWith('diff --git ')) {
      foundDiff = true;
    }

    // If we're past a diff line, skip all remaining lines
    if (foundDiff) {
      break;
    }

    // Skip comment lines
    if (line.startsWith(commentChar)) {
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

  // Join lines back together
  return processedLines.join('\n');
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
 * Generate the input for Change-Id generation based on Git commit data
 * @param message The cleaned commit message
 * @returns The input string for Change-Id generation
 */
function _gen_ChangeIdInput(message: string): string {
  try {
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
        : 'Unknown <unknown@example.com>';

    // Get committer identity
    const committerResult = spawnSync('git', ['var', 'GIT_COMMITTER_IDENT'], {
      encoding: 'utf8',
    });
    const committer =
      committerResult.status === 0
        ? committerResult.stdout.trim()
        : 'Unknown <unknown@example.com>';

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
    console.error('Error generating Change-Id input:', error);
    throw error;
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
 * Insert the Change-Id into the commit message at the correct position
 * @param message The commit message content
 * @param changeId The Change-Id to insert
 * @returns The commit message with the inserted Change-Id
 */
function insertChangeId(message: string, changeId: string): string {
  const lines = message.split('\n');
  const changeIdLine = `Change-Id: ${changeId}`;

  // Output array for the processed lines
  const outputLines = [];

  // Trailer related variables
  const trailers = [];
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
      if (trailers.length > 0) {
        // Add all content lines to output
        outputLines.push(...trailers);
        trailers.length = 0; // Clear trailers array
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
      // This is a trailer, add to trailers array
      trailers.push(line);
    } else {
      // This is not a trailer
      // If we were in trailer section and found non-trailer,
      // add all trailers to output and mark that we're no longer in trailer section
      if (trailers.length > 0) {
        outputLines.push(...trailers);
        trailers.length = 0;
      }
      inTrailerSection = false;
      // Add this non-trailer line to output
      outputLines.push(line);
    }
  }

  // If we still have trailers in the array, they are real trailers
  // Need to check each trailer to see if it's a comment or not
  if (trailers.length > 0) {
    // Find the first non-comment trailer
    let firstNonCommentIndex = -1;
    for (let i = 0; i < trailers.length; i++) {
      const trailer = trailers[i];
      // If it's not a comment, this is where we insert the Change-Id
      if (
        !trailerCommentRegex1.test(trailer) &&
        !trailerCommentRegex2.test(trailer)
      ) {
        firstNonCommentIndex = i;
        break;
      }
    }

    if (firstNonCommentIndex === -1) {
      // All trailers are comments, add Change-Id at the end
      outputLines.push(...trailers);
      outputLines.push(changeIdLine);
    } else {
      // Insert Change-Id before the first non-comment trailer
      outputLines.push(...trailers.slice(0, firstNonCommentIndex));
      outputLines.push(changeIdLine);
      outputLines.push(...trailers.slice(firstNonCommentIndex));
    }
  } else {
    // No trailers found, just add Change-Id at the end
    outputLines.push('');
    outputLines.push(changeIdLine);
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
  insertChangeId,
};
