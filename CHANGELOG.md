# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
