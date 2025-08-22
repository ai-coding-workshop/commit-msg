# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a TypeScript project that implements a Git commit-msg hook tool, similar to Gerrit's commit-msg hook. The tool automatically generates and adds unique Change-Ids to Git commit messages.

The project now follows a single-package structure:

- `@commit-msg/cli`: Contains all the functionality including the command-line interface, user-facing commands, and core logic for commit message processing and hook functionality

## Common Commands

### Development

- `npm run dev -- <command>` - Run the CLI tool directly with ts-node for development
- `npm run build` - Build the CLI package
- `npm test` - Run tests (currently not implemented)

### Code Quality

- `npx eslint packages/` - Lint TypeScript files
- `npx prettier --check packages/` - Check code formatting
- `npx prettier --write packages/` - Format code

### Package Management

- `npm install` - Install dependencies and automatically build packages
- `npm run build --workspace=@commit-msg/cli` - Build the CLI package

## Code Architecture

### Project Structure

```
commit-msg/
├── packages/
│   └── cli/          # Command-line interface and core functionality
│       ├── src/
│       │   ├── bin/           # Entry point scripts
│       │   ├── commands/      # Command implementations
│       │   ├── services/      # Business logic services
│       │   └── utils/         # Utility functions
│       └── dist/              # Compiled output
├── scripts/          # Build and utility scripts
└── docs/             # Documentation
```

### Key Components

1. **CLI Entry Point** (`packages/cli/src/bin/commit-msg.ts`):
   - Uses Commander.js for command-line argument parsing
   - Implements two main commands: `install` and `exec`

2. **Commands** (`packages/cli/src/commands/`):
   - `install.ts`: Installs the commit-msg hook in a Git repository
   - `exec.ts`: Executes the commit-msg hook logic on a commit message file

3. **Core Interfaces**:
   - Contains interfaces for commit message processing and hook functionality
   - Defined in `packages/cli/src/index.ts`

### Build Process

The project uses a custom build script (`scripts/build.js`) that builds the CLI package:

1. Builds `@commit-msg/cli`

The package uses TypeScript compiler (tsc) for compilation.

### Code Quality Tools

- **ESLint**: Code quality checks with TypeScript support
- **Prettier**: Code formatting
- **Husky + lint-staged**: Pre-commit hooks that automatically format and lint staged files

### Development Workflow

1. Make changes to TypeScript files in `packages/*/src/`
2. Run `npm run build` to compile TypeScript to JavaScript
3. Test changes using `npm run dev -- <command>`
4. Commit changes (pre-commit hooks will automatically format and lint)

The pre-commit hooks ensure code quality by running ESLint and Prettier on staged files before each commit.

## Version Management

This project uses npm version management. To update the version:

1. Update the root package version: `npm version [major|minor|patch] --no-git-tag-version`
2. Update workspace package version: `npm version [major|minor|patch] --no-git-tag-version --workspace=@commit-msg/cli`
3. Build the project: `npm run build`
4. Optionally create a git tag: `git tag v<version>`
5. Push changes and tags: `git push && git push --tags`

The CLI tool dynamically reads its version from package.json, so the `--version` parameter will always show the current version.
