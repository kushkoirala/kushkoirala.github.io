# Local Testing & Deployment Guide

This document outlines the complete workflow for testing your resume site locally before deploying to GitHub Pages.

## Quick Start: Test Before Push

### 1. **Local Development & Testing** (before committing)

```bash
# Start development server with hot-reload
npm run dev
# Visit: http://localhost:5173/
```

### 2. **Lint & Build Test** (before pushing)

```bash
# Run linter and build (mimics what GitHub Actions will do)
npm run test

# Expected output:
# ✓ No ESLint errors
# ✓ Build succeeds with dist/ folder created
```

### 3. **Full Preview Test** (before pushing to remote)

```bash
# Build and preview the exact production site locally
npm run test:full

# This will:
# - Run linter
# - Build production bundle
# - Start preview server on http://localhost:4173/
# - You can test the exact site that will go live

# Stop preview server: Ctrl+C in terminal
```

## Workflow: Commit → Push → Deploy

### Step-by-step

1. **Make changes** and test in dev mode:
   ```bash
   npm run dev
   # Open http://localhost:5173/ and test interactively
   ```

2. **Commit locally**:
   ```bash
   git add .
   git commit -m "Your message"
   ```

3. **Test before push** (the pre-push hook runs automatically):
   ```bash
   git push origin Core
   # The hook will:
   # - Run npm run lint
   # - Run npm run build
   # - If both pass, push proceeds
   # - If either fails, push is blocked (fix errors first)
   ```

4. **GitHub Actions automatically deploys**:
   - When push succeeds, GitHub Actions workflow starts (`.github/workflows/deploy.yml`)
   - Runs lint, build, and deploys `dist/` to GitHub Pages
   - Live site updates at https://kushkoirala.github.io/

### What You'll See

**Local Terminal (when you push)**:
```
🔍 Running pre-push checks...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Branch: Core
📝 Linting...
✅ Lint passed
🔨 Building...
✓ built in 765ms
✅ Build succeeded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ All checks passed. Proceeding with push...
```

**GitHub Actions** (watch on GitHub):
- Repository → Actions tab
- See "Build and deploy" workflow running
- Check logs for build/deploy steps
- When green ✅, site is live

## Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot-reload (http://localhost:5173/) |
| `npm run build` | Build production bundle into `dist/` |
| `npm run lint` | Check code quality with ESLint |
| `npm run preview` | Serve the production build locally (http://localhost:4173/) |
| `npm run test` | Run lint + build (what CI does, without preview) |
| `npm run test:full` | Run lint + build + preview all together |

## Troubleshooting

### "npm run test" fails with lint errors
```bash
# Fix linting issues (if auto-fixable)
npm run lint -- --fix

# Or fix manually, then retry
npm run test
```

### "npm run test" fails with build errors
```bash
# Check error messages in build output
npm run build

# Common issues:
# - Missing imports or dependencies
# - TypeScript/JSX syntax errors
# - Missing assets

# After fixing, retry
npm run test
```

### Pre-push hook blocks my push
This is intentional! The hook ensures your code passes linting and builds before going remote. To fix:
```bash
# Fix the error shown by npm run test
npm run test

# Once it passes, retry push
git push origin Core
```

### Skip pre-push hook (not recommended)
```bash
# Force push without hook (use cautiously!)
git push origin Core --no-verify
```

## GitHub Pages Configuration

Your site is deployed to: **https://kushkoirala.github.io/**

GitHub Pages is configured to:
- Deploy from branch: **`Core`** (on every push)
- Source: GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Artifacts deployed from: **`dist/` folder**

No manual Pages settings needed—workflow handles it all.

## One-Person Workflow Summary

1. Edit code locally
2. Test with `npm run dev` (see changes in real-time)
3. Commit: `git commit -m "message"`
4. Push: `git push origin Core`
   - ✅ Local hook runs tests
   - ✅ If pass, code goes to remote
   - ✅ GitHub Actions builds and deploys
   - ✅ Live site updates automatically
5. Done! No manual deploy steps needed.

## Next Steps

- **Add more tests**: You can enhance `package.json` scripts for unit/integration tests if needed.
- **Monitor deploys**: Check GitHub Actions tab (Repository → Actions) to see deployment status.
- **Iterate**: Change code → push → site updates automatically.
