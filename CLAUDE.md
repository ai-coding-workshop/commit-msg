# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a TypeScript project that implements a Git commit-msg hook tool, similar to Gerrit's commit-msg hook. The tool automatically generates and adds unique Change-Ids to Git commit messages.

The project follows a simplified single-package structure:

- Contains all the functionality including the command-line interface, user-facing commands, and core logic for commit message processing and hook functionality

## Common Commands

### Development

- `npm run dev -- <command>` - Run the CLI tool directly with ts-node for development (uses NODE_OPTIONS=--no-warnings to suppress experimental warnings)
- `npm run build` - Build the CLI package
- `npm test` - Run tests with Vitest

### Code Quality

- `npx eslint src/ test/` - Lint TypeScript files
- `npx prettier --check src/ test/` - Check code formatting
- `npx prettier --write src/ test/` - Format code

### Package Management

- `npm install` - Install dependencies and automatically build the project
- `npm run build` - Build the CLI package

## Code Architecture

### Project Structure

```
commit-msg/
├── src/              # Source code
│   ├── bin/           # Entry point scripts
│   ├── commands/      # Command implementations
│   ├── services/      # Business logic services
│   └── utils/         # Utility functions
├── dist/             # Compiled output
├── scripts/          # Build and utility scripts
├── templates/        # Template files
└── test/             # Test files
```

### Key Components

1. **CLI Entry Point** (`src/bin/commit-msg.ts`):
   - Uses Commander.js for command-line argument parsing
   - Implements two main commands: `install` and `exec`

2. **Commands** (`src/commands/`):
   - `install.ts`: Installs the commit-msg hook in a Git repository
   - `exec.ts`: Executes the commit-msg hook logic on a commit message file

3. **Core Interfaces**:
   - Contains interfaces for commit message processing and hook functionality
   - Defined in `src/index.ts`

### Build Process

The project uses a custom build script that handles TypeScript compilation, template copying, and setting executable permissions:

1. Compiles TypeScript code from `src/` to `dist/` using `npx tsc`
2. Copies template files from `templates/` to `dist/templates/`
3. Sets executable permissions on compiled bin files to ensure the CLI works correctly after installation

This is configured in the `build` script in package.json, which calls `scripts/build.js`.

### Code Quality Tools

- **ESLint**: Code quality checks with TypeScript support
- **Prettier**: Code formatting
- **Husky + lint-staged**: Pre-commit hooks that automatically format and lint staged files

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `npm run build` to compile TypeScript to JavaScript
3. Test changes using `npm run dev -- <command>`
4. Commit changes (pre-commit hooks will automatically format and lint)

The pre-commit hooks ensure code quality by running ESLint and Prettier on staged files before each commit.

## Version Management

This project uses npm version management. To update the version:

1. Update the package version: `npm version [major|minor|patch] --no-git-tag-version`
2. Build the project: `npm run build`
3. Optionally create a git tag: `git tag v<version>`
4. Push changes and tags: `git push && git push --tags`

The project uses a prepack script that automatically runs the build process before publishing, ensuring all compiled files are up-to-date.

The CLI tool dynamically reads its version from package.json, so the `--version` parameter will always show the current version.
