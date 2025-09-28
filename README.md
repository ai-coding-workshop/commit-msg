# @ai-coding-workshop/commit-msg

A CLI tool for managing Git commit-msg hooks, implementing the same functionality as Gerrit's commit-msg hook.

## Features

- Detects AI coding tools and adds results as Co-developed-by trailers in commit messages
- Automatically generates and adds unique Change-Id to Git commit messages
- Ensures Change-Id is placed correctly after specific tags (Bug, Depends-On, etc.)
- Handles temporary commits (fixup!/squash!) without adding Change-Id
- Follows Gerrit configuration options
- Cleans commit messages by removing diff information, comments, and other unwanted content
- Preserves important footer tags like Signed-off-by, Reviewed-by, etc.

## Installation

```bash
npm install -g @ai-coding-workshop/commit-msg
```

## Usage

### Install the commit-msg hook

Navigate to your Git repository and run:

```bash
npx commit-msg install
```

This will install the commit-msg hook in your repository's `.git/hooks` directory,
or in the hook path defined by `core.hooksPath` config variables.

If you run `commit-msg` without any arguments, it will automatically run the `install` command:

```bash
npx commit-msg
```

This is equivalent to running `npx commit-msg install`.

### Development

For development, you can run the tool directly with ts-node:

```bash
npm run dev -- <command>
```

This command now uses `commit-msg.dev.ts` for development mode with the following enhancements:

- Suppresses experimental warnings with `NODE_OPTIONS=--no-warnings`
- Uses a separate development entry point for better TypeScript import handling

To build the TypeScript code to JavaScript:

```bash
npm run build
```

After building, you can run the built version with:

```bash
node dist/bin/commit-msg.js <command>
```

## Development vs Production Modes

This project has two distinct modes of operation:

### Development Mode (`commit-msg.dev.ts`)

- Uses `ts-node` to run TypeScript files directly without compilation
- Imports modules with `.ts` extensions
- Ideal for rapid development and testing without build step
- Run with: `npm run dev -- <command>`

### Production Mode (`commit-msg.ts`)

- Compiles TypeScript to JavaScript using `tsc`
- Imports modules with `.js` extensions
- Optimized for distribution and installation
- Run with: `commit-msg <command>` after installation

The reason for having separate entry points is to enable faster development iterations without the need to compile TypeScript files during development, while maintaining proper compiled JavaScript output for production use.

When building the project, only the production files are compiled to the `dist` directory, excluding the development-specific files.

## Commands

- `install` - Install the commit-msg hook in the current Git repository
- `exec` - Execute the commit-msg hook logic (used internally by the hook)

If no command is specified, the `install` command will be run by default.

## Configuration

The tool follows these Git configuration options:

- `gerrit.createChangeId` - Boolean to control whether to generate Change-Id (default: true)
- `commit-msg.changeId` - Boolean to control whether to generate Change-Id (alternative to gerrit.createChangeId, default: true)
- `commit-msg.coDevelopedBy` - Boolean to control whether to add Co-developed-by (default: true)
- `core.commentChar` - Defines the comment character (defaults to #)
- `core.hooksPath` - Defines alternative path for hooks

## Testing

The project includes comprehensive tests to verify functionality:

```bash
npm test
```

Tests are run using Vitest and cover:

- Normal commit message processing with Change-Id generation
- Temporary commit handling (fixup!/squash!)
- Existing Change-Id detection
- Configuration option support
- Message cleaning functionality
- Custom comment character support

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for information on how to contribute to this project.

## Publishing New Versions

To publish a new version of the package to npm, follow these steps:

1. Update the version number:

   ```bash
   npm version patch --no-git-tag-version
   ```

   (You can also use `minor` or `major` instead of `patch` depending on the type of changes)

2. Build the project:

   ```bash
   npm run build
   ```

3. Publish to npm:

   ```bash
   npm publish --access public
   ```

4. Optionally create a git tag and push:
   ```bash
   git tag v<version>
   git push && git push --tags
   ```
