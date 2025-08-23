# Contributing to @ai-coding-workshop/commit-msg

Thank you for your interest in contributing to @ai-coding-workshop/commit-msg! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Code Layout](#code-layout)
- [Development Workflow](#development-workflow)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)

## Getting Started

1. Fork the repository on GitHub
2. Clone your forked repository:
   ```bash
   git clone https://github.com/your-username/commit-msg.git
   cd commit-msg
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```

The installation process automatically sets up the pre-commit hooks through the `prepare` script in package.json.

## Project Architecture

This project follows a simplified single-package structure:

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

### Structure Overview

Contains all functionality including the command-line interface, user-facing commands, and core logic for commit message processing and hook functionality

## Code Layout

```
src/
├── bin/           # Entry point scripts
├── commands/      # Command implementations
├── services/      # Business logic services
└── utils/         # Utility functions
```

## Development Workflow

1. Create a new branch for your feature or bugfix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run the build to ensure everything compiles correctly:

   ```bash
   npm run build
   ```

4. Stage your changes:

   ```bash
   git add .
   ```

5. Commit your changes (pre-commit hooks will automatically run):

   ```bash
   git commit -m "feat: your commit message"
   ```

6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

## Pre-commit Hooks

This project uses husky and lint-staged to automatically format and lint code before each commit.

### What the pre-commit hooks do

1. **ESLint**: Checks for code quality issues and automatically fixes what it can
2. **Prettier**: Formats code according to the project's style guide

### Enabling pre-commit hooks

The pre-commit hooks are automatically enabled when you run `npm install`. This is handled by the `prepare` script in the root package.json:

```json
"scripts": {
  "prepare": "husky"
}
```

If for some reason the hooks are not working, you can manually enable them:

```bash
npx husky install
```

### Manual linting and formatting

You can also manually run the linting and formatting tools:

```bash
# Lint all files
npm run lint

# Format all files
npm run format

# Or use the tools directly
npx eslint src/ test/
npx prettier --write src/ test/
```

## Code Style

This project uses ESLint and Prettier to enforce code style:

- **ESLint**: Enforces code quality rules
- **Prettier**: Enforces code formatting rules

Key style guidelines:

- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons at the end of statements
- Prefer const over let when possible

## Testing

This project uses Vitest for testing. Tests should be colocated with the code they test.

To run tests:

```bash
npm test
```

To run tests in watch mode:

```bash
npm test -- --watch
```

## Commit Messages

This project follows the Conventional Commits specification:

```
type(scope): description

[body]

[footer]
```

### Commit Types

- `feat`: A new feature
- `fix`: A bug fix
- `chore`: Maintenance tasks
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or modifying tests

### Examples

```
feat: add support for custom Change-Id prefixes

Add a new configuration option to allow users to specify custom prefixes for Change-Ids.

Fixes #123
```

```
fix(cli): correct install command path resolution

Resolve issue where the install command would fail on Windows due to path separator differences.

Closes #456
```

## Pull Requests

1. Ensure your code follows the project's style guidelines
2. Add tests for new functionality
3. Update documentation as needed
4. Write a clear, descriptive pull request title
5. Include a detailed description of the changes
6. Link to any relevant issues

Before submitting a pull request, make sure:

- All tests pass
- The code builds successfully
- The pre-commit hooks pass
- You have written clear commit messages

### Pull Request Template

When creating a pull request, please include:

- Description of the changes
- Related issues (if any)
- Testing performed
- Screenshots (if applicable)
