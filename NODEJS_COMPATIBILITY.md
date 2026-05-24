# Node.js Version Compatibility

## Supported Versions

- **Node.js 22.x** (LTS)
- **Node.js 24.x** (LTS)
- **Node.js 26.x** (Current)

Minimum required: **Node.js >= 22.0.0**

## Development

```bash
# Recommended version (see .nvmrc)
nvm use 22

# Development mode
npm run dev -- --version

# Run tests
npm test

# Compatibility check
npm run test:compat
```

## Configuration

- **TypeScript target**: ES2022
- **Module system**: ESM
- **Dev tooling**: tsx (fast TypeScript execution)

## CI/CD

GitHub Actions tests against Node.js 22.x and 24.x on every push and PR.
