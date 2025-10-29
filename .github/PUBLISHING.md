# Publishing Guide

This document explains how to publish new versions of Auxios to npm.

## Prerequisites

1. **NPM Account**: You need an npm account with publish access to `@trungpham.liam/auxios`
2. **NPM Token**: Generate an automation token from https://www.npmjs.com/settings/[your-username]/tokens
3. **GitHub Secrets**: Add the NPM token to GitHub repository secrets

## Setup NPM Token

### Step 1: Generate NPM Token

1. Go to https://www.npmjs.com/settings/[your-username]/tokens
2. Click "Generate New Token"
3. Select "Automation" token type (recommended for CI/CD)
4. Copy the token (you won't be able to see it again)

### Step 2: Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click "Add secret"

## Publishing Process

### Automated Publishing (Recommended)

The package will be automatically published to npm when you push a tag:

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Update CHANGELOG.md with the new version changes

# 3. Commit changes
git add package.json CHANGELOG.md
git commit -m "chore: bump version to X.X.X"

# 4. Push commits
git push origin main

# 5. Create and push tag
git tag vX.X.X
git push origin vX.X.X
```

The GitHub Actions workflow will:
- Run typecheck
- Run lint
- Build the package
- Publish to npm automatically

### Manual Publishing

If you need to publish manually:

```bash
# 1. Make sure you're logged in to npm
npm login

# 2. Build the package
pnpm build

# 3. Publish
pnpm publish --access public
```

## Version Naming

Follow semantic versioning (semver):

- **Patch** (1.0.x): Bug fixes, small changes
  ```bash
  npm version patch
  ```

- **Minor** (1.x.0): New features, backward compatible
  ```bash
  npm version minor
  ```

- **Major** (x.0.0): Breaking changes
  ```bash
  npm version major
  ```

## Pre-release Versions

For beta/alpha releases:

```bash
# Beta release
npm version prerelease --preid=beta
# Results in: 1.0.0-beta.0

# Push beta tag
git push origin main
git push origin v1.0.0-beta.0
```

## Troubleshooting

### Publishing fails with 403 error

- Check that your NPM_TOKEN is valid
- Verify you have publish access to the package
- Make sure the token is set in GitHub Secrets

### Version already exists

- You cannot republish an existing version
- Bump the version number and try again

### Build fails

- Make sure all tests pass locally first
- Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` before pushing

## Checklist Before Publishing

- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] All tests passing locally
- [ ] Code committed and pushed to main
- [ ] Tag created and pushed
- [ ] GitHub Actions workflow completed successfully
- [ ] Package available on npm

## Example Release Flow

```bash
# 1. Create feature branch
git checkout -b feat/expires-in-support

# 2. Make changes and commit
git add .
git commit -m "feat: add expires_in support"

# 3. Merge to main
git checkout main
git merge feat/expires-in-support

# 4. Bump version
npm version minor  # 1.1.1 -> 1.2.0

# 5. Update CHANGELOG.md
# Add entry for v1.2.0 with changes

# 6. Commit version bump
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.2.0"

# 7. Push to GitHub
git push origin main

# 8. Create and push tag
git tag v1.2.0
git push origin v1.2.0

# 9. Wait for GitHub Actions to complete
# Check: https://github.com/trungpham-liam/auxios/actions

# 10. Verify on npm
# Check: https://www.npmjs.com/package/@trungpham.liam/auxios
```

## Rollback a Release

If you need to rollback a release:

```bash
# Deprecate the bad version
npm deprecate @trungpham.liam/auxios@1.2.0 "This version has a critical bug"

# Publish a new fixed version
npm version patch
git push origin main
git push origin v1.2.1
```

## Additional Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
