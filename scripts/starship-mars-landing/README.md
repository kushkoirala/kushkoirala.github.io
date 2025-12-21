# Starship Mars Landing (Classroom Continuation)

Revisited Mars lander guidance, navigation, and control work collected in one place for the classroom project. This package contains the SOCP-based guidance core, an optimal bang-bang controller, a 3D landing animation, and supporting docs.

## Contents
- `MarsLander.py` — SOCP guidance with glide-slope, thrust cone, and descent envelope options.
- `bang_bang_optimal.py` — switching-time optimized bang-bang controller.
- `animate_landing_3d.py` — 3D animation/GIF generator driven by the controller.
- `calibrate_aero.py` — aerodynamic calibration helper.
- `docs/` — write-ups and the original thrust constraint PDF.
- `requirements.txt` — Python dependencies for the Starship/Mars lander stack.

## Quick start
```bash
cd scripts/starship-mars-landing
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python animate_landing_3d.py
```

## Notes
- Test artifacts, archives, and large generated outputs are intentionally left untracked.
- This is the continuation of the classroom project—keep additions for Starship/Mars landing work inside this folder so the rest of the repo stays clean.
