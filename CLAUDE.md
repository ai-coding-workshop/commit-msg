# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a TypeScript monorepo project that implements a Git commit-msg hook tool, similar to Gerrit's commit-msg hook. The tool automatically generates and adds unique Change-Ids to Git commit messages.

The project follows a monorepo structure with two main packages:

- `@commit-msg/cli`: Contains the command-line interface and user-facing commands
- `@commit-msg/core`: Contains the core logic for commit message processing and hook functionality

## Common Commands

### Development

- `npm run dev -- <command>` - Run the CLI tool directly with ts-node for development
- `npm run build` - Build all packages in the correct order (core first, then cli)
- `npm test` - Run tests (currently not implemented)

### Code Quality

- `npx eslint packages/` - Lint TypeScript files
- `npx prettier --check packages/` - Check code formatting
- `npx prettier --write packages/` - Format code

### Package Management

- `npm install` - Install dependencies and automatically build packages
- `npm run build --workspace=@commit-msg/core` - Build only the core package
- `npm run build --workspace=@commit-msg/cli` - Build only the CLI package

## Code Architecture

### Project Structure

```
commit-msg/
├── packages/
│   ├── cli/          # Command-line interface
│   │   ├── src/
│   │   │   ├── bin/           # Entry point scripts
│   │   │   ├── commands/      # Command implementations
│   │   │   ├── services/      # Business logic services
│   │   │   └── utils/         # Utility functions
│   │   └── dist/              # Compiled output
│   └── core/         # Core functionality
│       ├── src/               # Core functionality
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

3. **Core Package** (`packages/core/`):
   - Contains interfaces and core functionality for commit message processing
   - Currently minimal but designed to hold the main logic

### Build Process

The project uses a custom build script (`scripts/build.js`) that builds packages in the correct order:

1. First builds `@commit-msg/core`
2. Then builds `@commit-msg/cli`

Each package uses TypeScript compiler (tsc) for compilation.

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
