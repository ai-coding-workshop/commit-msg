# commit-msg

A CLI tool for managing Git commit-msg hooks, implementing the same functionality as Gerrit's commit-msg hook.

## Features

- Automatically generates and adds unique Change-Id to Git commit messages
- Ensures Change-Id is placed correctly after specific tags (Bug, Depends-On, etc.)
- Handles temporary commits (fixup!/squash!) without adding Change-Id
- Follows Gerrit configuration options
- Cleans commit messages by removing diff information, comments, and other unwanted content
- Preserves important footer tags like Signed-off-by, Reviewed-by, etc.

## Installation

```bash
npm install -g commit-msg
```

## Usage

### Install the commit-msg hook

Navigate to your Git repository and run:

```bash
commit-msg install
```

This will install the commit-msg hook in your repository's `.git/hooks` directory.

### Development

For development, you can run the tool directly with ts-node:

```bash
npm run dev -- <command>
```

To build the TypeScript code to JavaScript:

```bash
npm run build
```

## Commands

- `install` - Install the commit-msg hook in the current Git repository
- `exec` - Execute the commit-msg hook logic (used internally by the hook)

## Configuration

The tool follows these Git configuration options:

- `gerrit.createChangeId` - Boolean to control whether to generate Change-Id (default: true)
- `core.commentChar` - Defines the comment character (defaults to #)

## Testing

The project includes comprehensive tests to verify functionality:

```bash
npm test
```

Tests cover:

- Normal commit message processing with Change-Id generation
- Temporary commit handling (fixup!/squash!)
- Existing Change-Id detection
- Configuration option support
- Message cleaning functionality
- Custom comment character support

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for information on how to contribute to this project.
