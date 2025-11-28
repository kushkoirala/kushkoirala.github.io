# Kushal Koirala - Interactive Resume

An interactive web-based resume showcasing professional experience, education, and technical capabilities with 3D digital twin visualization.

## Features

- **Interactive Resume**: Professional resume layout with print-friendly styling
- **3D Digital Twin Showcase**: Interactive STEP file rendering with on-demand loading using WebAssembly
- **STEP File Viewer**: Live WASM-based rendering of STEP/STP files using `occt-import-js` and Three.js
- **PDF Viewer**: Modal-based PDF viewing for research documents and reports
- **Responsive Design**: Modern UI built with React, Tailwind CSS, and Three.js

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Three.js** - 3D graphics rendering
- **occt-import-js** - OpenCASCADE WASM kernel for STEP file processing

## Getting Started

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

## Project Structure

```
kush-resume/
├── public/
│   ├── Udaan.stp              # STEP file for 3D viewer
│   ├── occt-import-js.wasm    # WASM binary for STEP processing
│   └── Final Report-PropShox.pdf
├── src/
│   ├── components/
│   │   ├── DigitalTwin.jsx    # 3D model viewer component
│   │   ├── StepViewer.jsx     # STEP file renderer
│   │   └── UniversalModal.jsx # Modal for PDF/STEP viewing
│   ├── App.jsx                # Main application component
│   └── main.jsx               # Entry point
└── package.json
```

## Notes

- The `DigitalTwin` component uses the `Udaan.stp` file from the `public` folder. Click the "Load & Render STEP File" button to initialize the WASM kernel and render the 3D model.
- STEP file viewing requires the `occt-import-js.wasm` file in the `public` folder (already included).
- Initial STEP file rendering may take a moment as the WASM kernel processes the geometry. The viewer includes loading indicators and error handling.

## License

This project is private/personal portfolio work.

## Contact

- **Email**: kush.koirala@gmail.com
- **LinkedIn**: [kushal-koirala-250125341](https://linkedin.com/in/kushal-koirala-250125341)
- **Location**: Wichita, KS
