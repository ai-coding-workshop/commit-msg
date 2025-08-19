/**
 * Core functionality for commit-msg hooks
 */

export interface CommitMessageHookOptions {
  messageFile: string;
}

export interface InstallHookOptions {
  /** Path to the Git repository */
  repoPath?: string;
}
