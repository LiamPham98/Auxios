# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### 📦 Publish to NPM (`publish.yml`)

Automatically publishes the package to npm when a new tag is pushed.

**Trigger**: Push tags matching `v*` pattern (e.g., `v1.2.0`)

**Steps**:
1. ✅ Checkout code
2. ✅ Setup pnpm and Node.js
3. ✅ Install dependencies
4. ✅ Run typecheck
5. ✅ Run lint
6. ✅ Build package
7. ✅ Publish to npm

**Requirements**:
- `NPM_TOKEN` secret must be configured in GitHub repository settings
- See [PUBLISHING.md](./PUBLISHING.md) for detailed setup instructions

## Setup Instructions

### 1. Configure NPM Token

Generate an automation token from npm:
```
https://www.npmjs.com/settings/[your-username]/tokens
```

### 2. Add to GitHub Secrets

1. Go to: Repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Your npm automation token

### 3. Usage

```bash
# Bump version
npm version patch  # or minor, major

# Commit and push
git add package.json
git commit -m "chore: bump version to X.X.X"
git push origin main

# Create and push tag
git tag vX.X.X
git push origin vX.X.X
```

The package will be automatically published to npm! 🚀

## Monitoring

Check workflow runs at:
```
https://github.com/trungpham-liam/auxios/actions
```

## Troubleshooting

If publishing fails, check:
- [ ] NPM_TOKEN is valid and set in GitHub Secrets
- [ ] You have publish permissions for `@trungpham.liam/auxios`
- [ ] Version in package.json hasn't been published yet
- [ ] All tests (typecheck, lint) are passing

For detailed troubleshooting, see [PUBLISHING.md](./PUBLISHING.md).
