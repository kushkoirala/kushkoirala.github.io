# Kushal Koirala - Interactive Engineering Portfolio

Interactive portfolio showcasing aerospace systems engineering work across Dassault, Safran, and Boeing engagements. Built with React + Vite, featuring real-time simulations and industry-standard requirements management.

## Live Demo

**[kushkoirala.github.io](https://kushkoirala.github.io)**

## Features

### Requirements Management (ReqIF Viewer)
- **14 CFR Part 25 Certification Requirements**: Full FAA airworthiness standards with derived requirements
  - Subparts A-H covering General, Flight, Structure, Design, Powerplant, Equipment, Operating Limitations, and EWIS
  - V&V parameters: Verification Method, Compliance Status, Evidence tracking
  - Hierarchical tree view with search and filtering
- **ReqIF Standard Compliance**: Industry-standard requirements interchange format
- **Static Build Pipeline**: ReqIF XML converted to JSON at build time (zero backend)

### Digital Twin Flight Simulator
- **Real-time 6-DOF Flight Dynamics**: Full attitude tracking with quaternion-based physics
- **CFD Visualization**: Live pressure coefficient rendering on aircraft surfaces
- **STEP File Import**: WebAssembly-based CAD geometry processing via OpenCASCADE
- **Flight Modes**: Cruise, climb, descent, turns with automatic trimming
- **HUD Overlays**: Stall warning, trim state, aerodynamic performance cues

### Turbofan Analysis Tools
- **Engine Performance Calculator**: Cycle analysis with real-time parameter updates
- **Acoustic Simulation**: Takeoff noise prediction based on thesis research (WSU M.S.)
- **Engine Builder**: Interactive component-level turbofan configuration

### Mars Lander Guidance (Python)
- **Fuel-Optimal Powered Descent**: Successive convexification SOCP solver
- **Constraint Enforcement**: Glide-slope, thrust limits, velocity caps
- **3D Trajectory Visualization**: Animated descent with velocity quivers

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS |
| 3D Graphics | Three.js r181, WebAssembly |
| CAD Processing | OpenCASCADE (occt-import-js) |
| Requirements | ReqIF XML, xml2js |
| Physics | Custom aerodynamics engine |

## Project Structure

```
kushkoirala.github.io/
├── src/
│   ├── components/
│   │   ├── ReqIFViewer.jsx      # Requirements viewer with V&V tracking
│   │   ├── StepViewer.jsx       # Flight simulator + CFD visualization
│   │   ├── TurbofanAnalysis.jsx # Engine performance analysis
│   │   ├── AcousticSimulator.jsx # Noise prediction
│   │   └── EngineBuilder.jsx    # Turbofan configuration
│   ├── utils/
│   │   ├── aerodynamics.js      # CFD calculations
│   │   └── pressureVisualizer.js
│   └── App.jsx
├── public/
│   ├── reqif/                   # ReqIF source files
│   │   ├── part25-certification.reqif  # FAA Part 25 requirements
│   │   └── udaan.reqif          # Aircraft project requirements
│   ├── reqif-cache.json         # Pre-built requirements cache
│   ├── Udaan.stp                # Aircraft 3D model
│   └── occt-import-js.*         # WASM CAD kernel
├── scripts/
│   ├── convert-reqif.js         # Build-time ReqIF conversion
│   └── rebuild-powerplant.js    # Requirements maintenance
└── docs/
    └── images/                  # Documentation assets
```

## Installation

```bash
# Clone
git clone https://github.com/kushkoirala/kushkoirala.github.io.git
cd kushkoirala.github.io

# Install dependencies
npm install

# Development server
npm run dev
```

Open `http://localhost:5173`

## Build & Deploy

```bash
# Production build (includes ReqIF conversion)
npm run build

# Output in dist/ folder
```

The build process:
1. Converts ReqIF XML to static JSON cache
2. Bundles application with Vite/Rolldown

## ReqIF Requirements System

### Adding Requirements
1. Place `.reqif` files in `public/reqif/`
2. Run `npm run build` to convert
3. Files appear in the viewer's file picker

### V&V Parameters
Each requirement tracks:
- **Verification Method**: Analysis, Test, Inspection, Demonstration
- **Compliance Status**: Not Started, In Progress, Compliant, Non-Compliant
- **Evidence/Artifact**: Supporting documentation reference
- **Responsible Party**: Assigned engineer/team
- **Target Date**: Compliance deadline

### Part 25 Structure
The FAA certification requirements follow 14 CFR Part 25:
- Subpart A: General (25.1-25.5)
- Subpart B: Flight (25.21-25.255)
- Subpart C: Structure (25.301-25.581)
- Subpart D: Design and Construction (25.601-25.899)
- Subpart E: Powerplant (25.901-25.1207)
- Subpart F: Equipment (25.1301-25.1461)
- Subpart G: Operating Limitations (25.1501-25.1587)
- Subpart H: EWIS (25.1701-25.1733)

## Background

### Experience
- **Dassault Systemes**: CATIA/3DEXPERIENCE automation, EKL scripting
- **Safran**: Propulsion systems engineering, MBSE tooling
- **Boeing**: Requirements management, V&V processes

### Education
- **M.S. Aerospace Engineering** - Wichita State University
  - Thesis: Turbofan takeoff noise prediction
  - Focus: Propulsion, acoustics, flight controls
- **M.Eng. Aerospace Engineering** - UT Arlington
  - Focus: Composites, GNC systems

## License

Proprietary - Kushal Koirala

## Contact

- **Email**: kush.koirala@gmail.com
- **LinkedIn**: [kushal-koirala-250125341](https://linkedin.com/in/kushal-koirala-250125341)
- **GitHub**: [kushkoirala](https://github.com/kushkoirala)
