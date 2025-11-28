# Deployment Guide

## GitHub Pages Deployment

This resume is configured to deploy automatically to GitHub Pages using GitHub Actions.

### Option 1: Deploy to `kushkoirala.github.io` (Recommended)

If you want your resume at `https://kushkoirala.github.io`:

1. **Clone your existing repository:**
   ```bash
   git clone https://github.com/kushkoirala/kushkoirala.github.io.git
   cd kushkoirala.github.io
   ```

2. **Copy all files from this project** (except node_modules and .git):
   ```bash
   # From the kush-resume directory
   cp -r * ../kushkoirala.github.io/
   cp .gitignore ../kushkoirala.github.io/
   ```

3. **Commit and push:**
   ```bash
   cd ../kushkoirala.github.io
   git add .
   git commit -m "Add interactive resume with STEP file viewer"
   git push origin main
   ```

4. **Enable GitHub Pages:**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Source: Select "GitHub Actions"
   - The workflow will automatically deploy on every push

### Option 2: Create New Repository `kush-resume`

If you want your resume at `https://kushkoirala.github.io/kush-resume`:

1. **Update vite.config.js:**
   Change the base path to `/kush-resume/`:
   ```js
   base: mode === 'production' ? '/kush-resume/' : '/',
   ```

2. **Initialize git and push:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Interactive resume"
   git branch -M main
   git remote add origin https://github.com/kushkoirala/kush-resume.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repository settings → Pages
   - Source: Select "GitHub Actions"

## Important Notes

- **WASM Files**: The `occt-import-js.wasm` and `occt-import-js.js` files are in the `public/` folder and will be served correctly
- **STEP Files**: The `Udaan.stp` file is in `public/` and will be accessible
- **Automatic Deployment**: The GitHub Actions workflow will build and deploy automatically on every push to `main`
- **Build Output**: The `dist/` folder contains the production build (don't commit it, it's in .gitignore)

## Testing Locally Before Deploying

```bash
npm run build
npm run preview
```

This will build and preview the production version locally to ensure everything works.

