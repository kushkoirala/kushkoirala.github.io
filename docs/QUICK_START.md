# CATIA to Simulation Workflow - Quick Start

## 🚀 TL;DR - Getting Started in 5 Minutes

### Prerequisites
- CATIA V5 installed
- This project cloned to `/Users/kka/kush-resume`
- Node.js available in terminal

---

## 📋 Workflow Steps

### Step 1: Create Geometry in CATIA (Your CAD Work)
```
File → New → Part
[Design your component...]
Save as: ComponentName.CATPart
```

**Naming Tips:**
- Propeller = "Propeller" or "Propellor"
- Wing = "Wing", "Wing_Left", "Wing_Right"
- Aileron = "Aileron", "Aileron_Left", "Aileron_Right"
- Rudder = "Rudder", "Vertical"
- Elevator = "Elevator"
- Landing Gear = "Landing_Gear", "LG"
- Wheels = "Wheel", "Wheels"

### Step 2: Export to STEP Format
```
File → Save As
Type: STEP (*.stp)
Location: /Users/kka/kush-resume/public/
Filename: YourAircraft.stp
✓ Enable "Write Assembly Structure"
✓ Enable "Write Shapes"
```

### Step 3: Validate the Export
```bash
cd /Users/kka/kush-resume
npm run validate:step ./public/YourAircraft.stp
```

**Expected Output:**
- ✅ Components recognized
- ⚠️ Warnings about unrecognized names (can fix)
- 📊 File size and complexity stats

### Step 4: Fix Component Names (If Needed)
```bash
# List what's in the file
node step-editor.js list

# Rename unrecognized components
node step-editor.js rename "BadName" "Propeller"
node step-editor.js rename "Part1" "Wing_Left"
```

### Step 5: Update Your Simulation
Edit `src/components/StepViewer.jsx` (around line 50):
```javascript
const stepFile = '/public/YourAircraft.stp';  // ← Change this line
```

### Step 6: Test in Browser
```bash
npm run dev
# Open http://localhost:5177 in browser
```

**What to Look For:**
- ✅ Aircraft loads and renders
- ✅ Component tree shows your components
- ✅ Can click to highlight components (yellow)
- ✅ Propeller spins when you increase throttle

### Step 7: Deploy
```bash
npm run lint        # Check for errors
npm run build       # Build for production
npm run test        # Run full test suite
git add -A
git commit -m "Update aircraft model: YourAircraft.stp"
git push origin Core
```

---

## 🎯 Common Tasks

### Task: Add Landing Gear Animation
1. Create gear in CATIA, name it "Landing_Gear"
2. Export to STEP
3. Edit `StepViewer.jsx`, add to animation loop (after line 580):
```javascript
if (componentsRef.current.landing_gear?.meshes) {
  const gearDown = controlsRef.current.gearDown ?? true;
  const targetY = gearDown ? 0 : -2;
  
  componentsRef.current.landing_gear.meshes.forEach(mesh => {
    const diff = targetY - mesh.position.y;
    mesh.position.y += Math.sign(diff) * 0.02;
  });
}
```
4. Test in browser: `npm run dev`

### Task: Rename Existing Component
```bash
node step-editor.js rename "OldName" "NewName"
node step-editor.js list  # Verify
```

### Task: Check File Compatibility
```bash
npm run validate:step ./public/YourFile.stp
npm run analyze:step ./public/YourFile.stp
```

### Task: Deploy Changes
```bash
git add -A
git commit -m "Your message"
git push origin Core
```

---

## 📁 File Structure

```
/Users/kka/kush-resume/
├── public/
│   ├── Udaan.stp              ← Your STEP files go here
│   └── occt-import-js.js      ← STEP parser
│
├── src/
│   ├── components/
│   │   └── StepViewer.jsx     ← Main 3D viewer (update file path here)
│   └── utils/
│       └── componentManager.js  ← Component recognition patterns
│
├── CATIA_WORKFLOW.md           ← Full CATIA setup guide
├── COMPONENT_ANIMATIONS.md     ← Animation implementation guide
├── COMPONENT_SYSTEM.md         ← Component system overview
├── validate-step.js            ← Validation tool
├── step-editor.js              ← Component renaming tool
└── analyze_step.js             ← Analysis tool
```

---

## 🛠️ Useful Commands

```bash
# Validation & Analysis
npm run validate:step ./public/file.stp    # Validate STEP file
npm run analyze:step ./public/file.stp     # Analyze structure

# Development
npm run dev                                 # Start dev server
npm run build                              # Build for production
npm run lint                               # Check code quality

# Component Management
node step-editor.js list                   # List all components
node step-editor.js rename "Old" "New"     # Rename component
node step-editor.js stats                  # File statistics
node step-editor.js validate               # Validate structure

# Git Workflow
git status                                 # Check changes
git add -A                                 # Stage all
git commit -m "message"                    # Commit
git push origin Core                       # Deploy
```

---

## ✅ Quality Checklist

Before deploying, verify:

- [ ] Component names match simulation patterns
- [ ] STEP file validates: `npm run validate:step ./public/file.stp`
- [ ] Development server runs: `npm run dev`
- [ ] Aircraft renders correctly
- [ ] Component tree shows components
- [ ] Can select/highlight components
- [ ] Propeller rotates with throttle
- [ ] No console errors (F12 → Console)
- [ ] Code passes linting: `npm run lint`
- [ ] Build succeeds: `npm run build`

---

## 🐛 Troubleshooting

### Components don't appear in tree
```bash
# Check if names are recognized
npm run validate:step ./public/YourFile.stp

# Rename if needed
node step-editor.js rename "BadName" "Propeller"
```

### Aircraft doesn't load
- Check browser console: `F12` → Console
- Verify file path in `StepViewer.jsx` is correct
- Make sure STEP file is in `/public/` folder

### Animations don't work
1. Verify component appears in tree
2. Check animation code in `StepViewer.jsx` animation loop
3. Use `console.log()` to debug values
4. Ensure component.meshes exists and is an array

### Build fails
```bash
npm run lint  # See what's wrong
npm run test  # Run full test suite
```

---

## 🔗 Integration Points

Your simulation recognizes these component types **automatically**:

| Type | Naming Pattern | Animation |
|------|---|---|
| Propeller | propel... | ✅ Spins 0-10,000 RPM |
| Motor | motor... | ✅ Rotates with propeller |
| Wing | wing... | ✅ Structural (no movement) |
| Fuselage | fuse... | ✅ Structural (no movement) |
| Aileron | aileron... | ⏳ Ready for deflection |
| Rudder | rudder... | ⏳ Ready for deflection |
| Elevator | elevator... | ⏳ Ready for deflection |
| Landing Gear | gear... | ⏳ Ready for deploy/retract |
| Wheels | wheel... | ⏳ Ready for rotation |
| Tail Wheel | tail.wheel... | ⏳ Ready for rotation |

---

## 📊 File Size Guidelines

- **< 5 MB**: Optimal (fast loading)
- **5-15 MB**: Good (slight delay but acceptable)
- **15-50 MB**: Moderate (visible lag, consider optimization)
- **> 50 MB**: Too large (optimize in CATIA)

**To optimize in CATIA:**
1. Reduce surface mesh density
2. Remove internal/temporary geometry
3. Remove high-detail features
4. Use approximate/simplified geometry

---

## 🎬 Example: Adding a New Aileron

1. **In CATIA:**
   - Create `Aileron_Right.CATPart`
   - Model the control surface
   - Add to main assembly

2. **Export:**
   ```bash
   File → Save As → Type: STEP
   Save to: /Users/kka/kush-resume/public/Udaan_v2.stp
   ```

3. **Validate:**
   ```bash
   npm run validate:step ./public/Udaan_v2.stp
   # Should show: ✅ Aileron_Right
   ```

4. **Update simulation:**
   - Edit `StepViewer.jsx`
   - Change file path: `'/public/Udaan_v2.stp'`

5. **Test:**
   ```bash
   npm run dev
   # Visit http://localhost:5177
   # Move roll slider → Aileron_Right highlights
   ```

6. **Deploy:**
   ```bash
   npm run test && git add -A && git commit -m "Add aileron component" && git push origin Core
   ```

---

## 📚 More Information

- **Full CATIA Guide**: See `CATIA_WORKFLOW.md`
- **Animation Implementation**: See `COMPONENT_ANIMATIONS.md`
- **Component System**: See `COMPONENT_SYSTEM.md`
- **Browser Console**: Press `F12` to see detailed logs

---

## ⚡ Quick Terminal Copy-Paste

### New aircraft setup:
```bash
cd /Users/kka/kush-resume
npm run validate:step ./public/YourAircraft.stp
npm run dev
```

### Rename component:
```bash
cd /Users/kka/kush-resume
node step-editor.js rename "OldName" "NewName"
```

### Deploy:
```bash
cd /Users/kka/kush-resume
npm run test && git add -A && git commit -m "Update aircraft" && git push origin Core
```

---

**You're ready to start creating!** 🚀
