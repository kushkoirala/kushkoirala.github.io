# Kushal Koirala - Interactive Resume

An interactive web-based resume showcasing professional experience, education, and technical capabilities with 3D digital twin visualization.

## Features

- **Interactive Resume**: Professional resume layout with print-friendly styling optimized for single-page printing
- **ReqIF Requirements Viewer**: Browse and filter industry-standard requirements from ReqIF XML files with:
  - **Nested Hierarchy Support**: Expand/collapse specification trees to explore requirement relationships
  - **Full Requirement Details**: Display requirement IDs, sources, types, descriptions, and industry-standard attributes
  - **File Upload**: Upload custom ReqIF or XML files to view your own requirements
  - **Search & Filter**: Find requirements by ID, text content, or attribute values
  - **Static JSON Pipeline**: Pre-converted ReqIF files served as static JSON for fast loading with no backend required
- **3D Digital Twin Showcase**: Interactive STEP file rendering with on-demand loading using WebAssembly
- **STEP File Viewer**: Live WASM-based rendering of STEP/STP files with:
  - **File Upload**: Load custom STEP files (`.stp`, `.step`) for interactive 3D visualization
  - **WebAssembly Processing**: Uses `occt-import-js` and Three.js for efficient client-side geometry rendering
- **PDF Viewer**: Modal-based PDF viewing for research documents and reports
- **Responsive Design**: Modern UI built with React, Tailwind CSS, and Three.js with full-screen viewing modes

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server with ReqIF pre-processing
- **Tailwind CSS** - Styling
- **Three.js** - 3D graphics rendering
- **occt-import-js** - OpenCASCADE WASM kernel for STEP file processing
- **xml2js** - Build-time ReqIF XML parsing and JSON conversion

## Getting Started

### Deploying to GitHub Pages

1. Update the `base` path in `vite.config.js` to match your repository name:
```js
base: '/your-repo-name/'
```

2. Build the project:
```bash
npm run build
```

3. Deploy the `dist` folder to GitHub Pages (via GitHub Actions or manually)

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/kush-resume.git
cd kush-resume
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

### Build Process

The build command chains ReqIF conversion with Vite:

```bash
npm run build
```

This runs:
1. `npm run reqif:build` - Converts ReqIF files to static JSON cache
2. `vite build` - Bundles the application

### Adding Your Own Requirements

To include your ReqIF files in the build:

1. Place your `.reqif` files in the `public/reqif/` directory
2. Run `npm run build` to convert them to static JSON
3. Use the file picker in the Requirements Viewer to select your file

### Uploading Custom Files

- **ReqIF/XML Files**: Click "Upload ReqIF File" in the Requirements Viewer to parse and view custom requirement files
- **STEP Files**: Click "Upload STEP File" in the Digital Twin viewer to render custom 3D models

## Project Structure

```
kush-resume/
├── public/
│   ├── reqif/                 # ReqIF files (processed at build time)
│   ├── reqif-cache.json       # Pre-converted requirements (built from ReqIF)
│   ├── Udaan.stp              # STEP file for 3D viewer
│   ├── occt-import-js.js      # WASM loader for STEP processing
│   └── occt-import-js.wasm    # WASM binary for STEP processing
├── scripts/
│   └── convert-reqif.js       # Build script: converts ReqIF XML to JSON
├── src/
│   ├── components/
│   │   ├── ReqIFViewer.jsx    # Requirements viewer with nested hierarchy
│   │   ├── DigitalTwin.jsx    # 3D model viewer component
│   │   ├── StepViewer.jsx     # STEP file renderer
│   │   └── UniversalModal.jsx # Modal for PDF/STEP viewing
│   ├── App.jsx                # Main application component
│   ├── App.css                # Print-optimized styles
│   └── main.jsx               # Entry point
├── eslint.config.js           # Linting configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── vite.config.js             # Vite configuration with ReqIF build step
└── package.json
```

## How It Works

### ReqIF Requirements Pipeline (Static & Zero Backend)

1. **Build-Time Conversion**: The `scripts/convert-reqif.js` script runs during the build process to parse ReqIF XML files and extract:
   - Specification objects with nested hierarchies
   - Requirements with industry-standard attributes (ID, source, type, description, title)
   - Requirement relationships and dependencies

2. **Static JSON Cache**: Converted requirements are stored as `public/reqif-cache.json` and served statically with no backend needed

3. **Client-Side Rendering**: The `ReqIFViewer` component loads the static JSON and renders:
   - Interactive tree view with expand/collapse for navigating hierarchies
   - Detailed requirement information in a side panel
   - Search and filter capabilities

4. **Custom File Upload**: Users can upload their own ReqIF/XML files which are parsed client-side using xml2js and rendered immediately

### 3D STEP File Rendering

- **WASM Processing**: The `occt-import-js` WebAssembly module runs client-side to process STEP geometry
- **Interactive Visualization**: Three.js renders the geometry with orbit controls and lighting
- **Custom File Upload**: Users can upload `.stp` or `.step` files for immediate visualization

### Print Optimization

The `src/App.css` includes media queries that optimize the resume for single-page printing:
- Tighter font sizes and line heights
- Reduced margins and padding
- Condensed section spacing

To print: Use browser Print (Ctrl+P or Cmd+P) and select "Print to PDF" as the destination.

## License

This project is private/personal portfolio work.

## Contact

- **Email**: kush.koirala@gmail.com
- **LinkedIn**: [kushal-koirala-250125341](https://linkedin.com/in/kushal-koirala-250125341)
- **Location**: Wichita, KS
