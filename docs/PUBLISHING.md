# Publishing Guide

Dorval supports two publishing methods: **Automatic** (recommended) and **Manual** (backup).

## 🤖 Automatic Publishing (Primary Method)

### How it works

Every push to `main` branch triggers semantic-release, which:

1. **Analyzes commits** to determine if a release is needed
2. **Calculates version** based on commit types:
   - `fix:` → Patch (0.2.0 → 0.2.1)
   - `feat:` → Minor (0.2.0 → 0.3.0)
   - `feat!:` or `BREAKING CHANGE:` → Major (0.2.0 → 1.0.0)
3. **Updates all package.json files** automatically
4. **Publishes to npm** with proper tags
5. **Creates GitHub release** with changelog
6. **Tags the commit** with version

### Usage

Simply push to main with proper commit messages:

```bash
# Bug fix (patch release)
git commit -m "fix: resolve parsing error"
git push origin main
# → Automatically releases 0.2.1

# New feature (minor release)
git commit -m "feat: add GraphQL support"
git push origin main
# → Automatically releases 0.3.0

# Breaking change (major release)
git commit -m "feat!: redesign API structure

BREAKING CHANGE: generateDartCode now requires config object"
git push origin main
# → Automatically releases 1.0.0
```

### Configuration

- **File**: `.github/workflows/release.yml`
- **Config**: `.releaserc.json`
- **Required Secret**: `NPM_TOKEN`

## 🔧 Manual Publishing (Backup Method)

### When to use

Use manual publishing only when:
- Semantic-release fails
- Need to publish a specific version immediately
- Publishing pre-release versions (beta, alpha)
- Emergency hotfix with custom version

### How to trigger

1. Go to [Actions → Manual Publish](https://github.com/qwlong/dorval/actions/workflows/manual-publish.yml)
2. Click "Run workflow"
3. Fill in:
   - **Version**: e.g., `1.2.3`
   - **Tag**: `latest`, `beta`, `next`, or `alpha`
   - **Skip tests**: Only in emergencies

### What it does

1. Updates all package versions to specified version
2. Builds and tests (unless skipped)
3. Publishes all packages to npm
4. Creates git tag and GitHub release
5. Commits version changes back to main

### Example scenarios

#### Publishing a beta version
```yaml
Version: 1.0.0-beta.1
Tag: beta
Skip tests: false
```

#### Emergency patch
```yaml
Version: 0.2.1
Tag: latest
Skip tests: true  # Only if absolutely necessary
```

## 📊 Version Status

### Check current versions

```bash
# Local packages
yarn version:check

# Published versions on npm
npm view dorval version
npm view @dorval/core version
```

### View all published versions

```bash
npm view dorval versions --json
```

### Install specific versions

```bash
# Latest stable
npm install dorval@latest

# Beta version
npm install dorval@beta

# Specific version
npm install dorval@0.2.0
```

## 🔍 Troubleshooting

### Automatic release not working

1. **Check commit messages**
   ```bash
   git log --oneline -10
   ```
   Ensure they follow conventional format

2. **Check CI logs**
   - Go to [Actions](https://github.com/qwlong/dorval/actions)
   - Look for "Auto Release (Semantic)" workflow
   - Check logs for errors

3. **Verify NPM_TOKEN**
   - Settings → Secrets → Actions
   - Ensure `NPM_TOKEN` is set and valid

### Manual release issues

1. **Version already exists**
   - Check npm: `npm view dorval versions`
   - Use a different version number

2. **Authentication failed**
   - Regenerate NPM_TOKEN
   - Update in GitHub Secrets

3. **Build/test failures**
   - Fix issues locally first
   - Only skip tests in true emergencies

## 📈 Best Practices

1. **Prefer automatic releases** - Let semantic-release handle versioning
2. **Use conventional commits** - Ensures proper version bumps
3. **Test locally first** - Run `yarn test` before pushing
4. **Document breaking changes** - Use `BREAKING CHANGE:` in commit body
5. **Use pre-release tags** - Beta/alpha for experimental features

## 🔗 Related Files

- [.github/workflows/release.yml](.github/workflows/release.yml) - Auto release
- [.github/workflows/manual-publish.yml](.github/workflows/manual-publish.yml) - Manual release
- [.releaserc.json](.releaserc.json) - Semantic-release config
- [RELEASE.md](RELEASE.md) - Release process details