# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.7] - 2025-09-26

### Added

- Add direct execution mode for commit-msg hook
  - Allow direct execution of commit-msg logic without installing as a Git hook
  - Improve flexibility for different usage scenarios

### Changed

- Use minimatch for env var glob matching
  - Replace custom glob matching implementation with minimatch library
  - Improve reliability and consistency of environment variable matching

### Fixed

- Improve cursor/qoder detection in SSH/DevContainer
  - Fix issue with cursor/qoder detection when running in SSH or DevContainer environments
  - Enhance compatibility with different development environments

- Set --verbose as default for check-update command
  - Make check-update command verbose by default for better user feedback
  - Improve visibility of update checking process

## [0.2.6] - 2025-09-24

### Added

- Implement duplicate trailer filtering for Co-developed-by
  - Filter out duplicate trailers that have the same user info as the CoDevelopedBy trailer
  - Prevent duplicate entries when AI tools add both Co-developed-by and Signed-off-by trailers

### Changed

- Enhance Change-Id generation with timestamp and timezone info
  - Include timestamp and timezone information in Change-Id generation for better uniqueness
  - Improve Change-Id generation to be more robust and unique

- Enhance merge commit detection and add comprehensive tests
  - Improve merge commit detection logic to be more accurate
  - Add comprehensive test coverage for merge commit detection scenarios

### Fixed

- Resolve -v flag conflict between --version and --verbose
  - Fix conflict where -v was being interpreted as --verbose instead of --version
  - Ensure -v flag works correctly for version display

- Prevent update-notifier from updating timestamp in checkForUpdatesOnly
  - Fix issue where checkForUpdatesOnly was incorrectly updating the last update check timestamp
  - Ensure checkForUpdatesOnly only checks for updates without modifying timestamps

## [0.2.5] - 2025-09-24

### Added

- Add support for commit-msg and commitmsg configuration prefixes
  - Add `commit-msg.changeid` and `commitmsg.changeid` as alternatives to `gerrit.createchangeid`
  - Add `commit-msg.codevelopedby` and `commitmsg.codevelopedby` as alternatives to `commit-msg.coDevelopedBy`
  - Provide more consistent naming and better alignment with the tool name
- Add comprehensive documentation for all configuration options in README.md

### Changed

- Optimize getGitConfig to use single git config call with --list --includes
- Improve merge commit detection in commit-msg hook
  - Change from checking HEAD commit parents to checking if the commit message file is '.git/MERGE_MSG'
  - Provide more reliable way to detect merge commits during the commit-msg hook execution

## [0.2.4] - 2025-09-17

### Added

- Add COMMIT_MSG_TEST_NO_GLOBAL_HOOKS environment for test stability

### Changed

- Do not check local .githooks dir

### Fixed

- Remove the hook file before writing

## [0.2.3] - 2025-09-16

### Added

- Add support AI coding tools: iFlow and Kiro

## [0.2.2] - 2025-01-10

### Added

- Add scissors line detection for commit message processing
  - Detect Git scissors lines (`>8` and `8<`) in commit messages
  - Stop processing commit message content when scissors line is found
  - Support various scissors line formats with dashes and whitespace
  - Only match exact patterns: `>8` or `8<` (not `>9`, `7<`, or with extra text)
  - Add comprehensive test coverage for scissors line scenarios

### Fixed

- Improve error handling to avoid stack trace display

- Fix empty commit message handling
  - Do not process empty commit messages, let Git handle commit rejection
  - Return empty message with `shouldSave: false` for empty content
  - Maintain Git's expected behavior for empty commit rejections

- Fix Signed-off-by only message handling
  - Detect commit messages containing only Signed-off-by lines and empty lines
  - Return empty message with `shouldSave: false` for signature-only commits
  - Prevent processing of template-only messages when using `git commit -s`

## [0.2.0] - 2025-09-10

### Added

- Add global `--verbose` parameter support
  - Add global `--verbose` option to main program for consistent verbose output
  - Support parameter priority: command `--verbose` > global `--verbose` > environment variable
  - Create `getVerboseMode()` helper function for unified verbose handling
  - Maintain backward compatibility with `COMMIT_MSG_VERBOSE` environment variable

- Add automatic version checking and upgrade functionality
  - Implement `update-notifier` integration for checking package updates
  - Add `checkAndUpgrade()` function for automatic version checking and upgrading
  - Add `checkForUpdatesOnly()` function for checking updates without upgrading
  - Add `check-update` command for manual update checking
  - Support `UPDATE_CHECK_INTERVAL` environment variable for custom check intervals (default: 24 hours)
  - Add verbose output support for version checking operations

- Add `UPDATE_CHECK_INTERVAL` environment variable support
  - Allow customizing update check interval in seconds via `UPDATE_CHECK_INTERVAL` env var
  - Default to 24 hours if not specified
  - Support decimal formatting for time display (max 4 decimal places, remove trailing zeros)
  - Apply to both `checkAndUpgrade` and `checkForUpdatesOnly` functions

### Changed

- Improve error handling and update check integration
  - Remove duplicate `checkAndUpgrade` calls in error handling paths
  - Ensure update checks run on both successful and failed command executions
  - Add `exitOverride` to Commander.js for handling parsing errors with update checks
  - Improve error propagation to allow update operations before exit

- Enhance verbose output for version checking
  - Add detailed logging for update check intervals and cache status
  - Improve time formatting with proper decimal precision
  - Add verbose output support for `check-update` command
  - Show comprehensive update information when verbose mode is enabled

### Fixed

- Resolve npm upgrade hang issue after successful installation
  - Add `--yes --force` flags to npm update commands for non-interactive execution
  - Set `npm_config_yes`, `npm_config_force`, and `CI` environment variables in spawn options
  - Implement proper process cleanup with resolved flag and exit event handling
  - Fix timeout handling to prevent hanging after successful npm operations

- Fix command execution error handling
  - Replace `process.exit(1)` with `throw error` in command catch blocks
  - Ensure update checks are triggered even when commands fail with missing arguments
  - Improve error handling flow to maintain update check functionality

## [0.1.14] - 2025-01-27

### Added

- Add `-v` short parameter support for version display
  - Support both `commit-msg -v` and `commit-msg --version` commands
  - Provide more convenient way to check version information
  - Add comprehensive test coverage for short parameter functionality

### Changed

- Update Commander.js version configuration to support both short and long parameters
- Enhance test suite with additional version parameter tests

## [0.1.13] - 2025-09-03

### Added

- Add comprehensive test suite for commit-msg.hook template

### Changed

- Improve commit-msg hook template with enhanced debug capabilities

## [0.1.12] - 2025-08-31

### Added

- Add Qwen Code commit detection via environment variable
  - Detect commits initiated by Qwen Code v0.0.8 or higher through QWEN_CODE=1
  - Enable tracking contributions from the Qwen Code AI assistant

### Changed

- Remove wildcard environment variable matching logic
  - Simplify environment variable matching by removing special case handling for '\*'
  - Remove obsolete wildcard tests for CLAUDECODE and QWEN_CODE
  - Maintain compatibility with CURSOR_TRACE_ID wildcard configuration

### Fixed

- Ensure package compatibility with Node.js 18+ for npm publishing
  - Update package configuration and build settings for Node.js 18+ compatibility
  - Fix issues that prevented successful npm publishing

## [0.1.11] - 2025-08-30

### Added

- Add merge commit detection to skip processing
  - Automatically detect merge commits and skip Change-Id generation
  - Improves workflow when merging branches with existing Change-Ids

### Changed

- Improve GitHub Actions workflows
  - Add workflows for testing, building, and publishing
  - Add check for bad whitespaces in CI
  - Fix Node.js 20.x compatibility issues

### Removed

- Remove duplicate template files
  - Clean up redundant template files in the repository

## [0.1.10] - 2025-08-23

### Fixed

- Ensure compiled bin files have executable permissions
  - Created custom build script that sets executable permissions on compiled bin files
  - Fixed issue where commit-msg command was not executable after npm pack or npm publish
  - Added scripts/build.js with custom build logic
  - Updated package.json build script to use new build process
  - Build script now explicitly sets executable permissions on bin files

- Run prepack instead of postinstall for release
  - Remove postinstall script that required tsc during installation
  - Call "npm run build" by introducing new prepack stage
  - Add files section to package.json to ensure proper distribution
  - Fixes the issue where users would get 'tsc not found' error when installing the package globally

## [0.1.6] - 2025-08-22

### Added

- Support installing commit-msg hook outside git repository with global core.hooksPath
  - Check for global core.hooksPath when not in a Git repository
  - Install hook in global hooks directory if set
  - Add proper error handling for relative paths

## [0.1.5] - 2025-08-22

### Fixed

- Ensure build process doesn't depend on globally installed TypeScript
  - Resolved `tsc: command not found` error during package installation
    by changing build script in package.json to use `npx tsc` instead of
    directly calling `tsc`
  - This ensures that the TypeScript compiler is properly located even when it's not globally installed

- Addressed compatibility issue with `@types/node` dependency
  - Changed dependency from `^24.3.0` to `^22.0.0` for better Node.js
    version compatibility
  - Using Node.js 22.x (LTS) instead of Node.js 24.x (future version)
