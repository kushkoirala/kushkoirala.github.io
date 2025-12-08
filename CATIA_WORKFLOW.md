# CATIA to STEP Workflow Guide

## Overview

This guide explains how to create custom geometry in CATIA and export it as STEP files for integration into your aircraft simulation. Your current setup can automatically tessellate and recognize new components.

---

## Part 1: CATIA Setup & Best Practices

### 1.1 Creating Parts in CATIA V5

#### File Naming Convention
- **Part Files**: `ComponentName.CATPart`
- **Assembly Files**: `ComponentName.CATProduct`
- Examples:
  - `Fuselage.CATPart`
  - `Wing.CATPart`
  - `AircraftAssembly.CATProduct`

#### Naming Components Within CATIA
When creating bodies and features in CATIA, use clear naming:
- Each body should have a descriptive name that matches your component type
- Examples: "Propeller_Blade_1", "Wing_Left", "Fuselage_Section_1"
- The exported STEP file will preserve these names

#### Coordinate System Alignment
Your simulation uses **Roskam Body-Fixed Coordinates**:
- **X-axis**: Forward (nose direction)
- **Y-axis**: Right wing
- **Z-axis**: Down

**When creating geometry in CATIA:**
1. Set your CATIA reference frame to match this orientation
2. For propeller: Create along the X-axis (boom points forward)
3. For wings: Create along the Y-axis (perpendicular to fuselage)
4. For fuselage: Create along the X-axis

---

## Part 2: Export STEP Files from CATIA

### 2.1 Export Process

1. **Open your assembly in CATIA V5**
   - File → Open → Select your `.CATProduct` or `.CATPart`

2. **Export as STEP**
   - File → Save As
   - Change file type to "STEP" (`.stp`)
   - Choose location: `/Users/kka/kush-resume/public/`
   - Default filename: `YourAircraft.stp`

3. **STEP Export Options Dialog**
   - ✅ **Write Assembly Structure**: Enable
   - ✅ **Write Shapes**: Enable
   - ✅ **Write Attributes**: Enable
   - ✅ **Write Parameters**: Enable (optional)
   - ✅ **Write Colors**: Enable (optional)

### 2.2 Validation After Export

After exporting, run the analysis script:

```bash
node analyze_step.js your_new_file.stp
```

This will show:
- Total components detected
- Geometric statistics
- Any structure issues
- File size and complexity

---

## Part 3: Component Integration

### 3.1 Automatic Component Recognition

Your simulation automatically recognizes components by name pattern matching. Components are classified in `src/utils/componentManager.js`:

#### Current Recognized Components:
- **propeller** - Spinning propeller (10,000 RPM max)
- **motor** - Motor assembly (rotates with propeller)
- **wing** - Main wings
- **fuselage** - Aircraft body
- **aileron** - Roll control surfaces
- **rudder** - Yaw control surface
- **elevator** - Pitch control surfaces
- **landing_gear** - Main landing gear
- **wheel** - Wheels (rotate with throttle)
- **stabilizer** - Horizontal/vertical stabilizers
- **tail_wheel** - Tail wheel assembly

#### How Naming Works:
The system uses pattern matching on component names. Examples:

```
✅ Recognized                    ❌ Not Recognized
- "Propellor"                    - "PropellerAssy_v2"
- "Propeller_Blade"             - "rotating_device"
- "Wing_Left"                    - "wing_component_xyz"
- "Fuselage_Main"               - "body"
- "Aileron_Left"                - "control_surface_1"
- "Rudder_Vertical"             - "vertical_fin"
```

### 3.2 Adding New Component Types

To recognize a new component type:

1. **Edit** `src/utils/componentManager.js`
2. **Find** the `COMPONENT_DEFINITIONS` object
3. **Add** your component with pattern matching:

```javascript
yourNewComponent: {
  name: 'Your New Component',
  type: 'custom',
  animationCapability: 'none', // or 'rotate', 'deflect', 'translate'
  animationAxis: null,
  patterns: [
    /your_new_component/i,
    /yournewcomp/i,
    /custom_part/i
  ],
  description: 'Description of what this component does'
}
```

---

## Part 4: Using the STEP Editor Tool

### 4.1 List All Components

See what components are in your STEP file:

```bash
node step-editor.js list
```

Output:
```
STEP File Structure:
├── Fuselage (ID: 163471)
├── Wing_Left (ID: 2133)
├── Wing_Right (ID: 2134)
├── Propeller (ID: 263)
├── Motor (ID: 26)
└── ...
```

### 4.2 Rename Components

If a component name doesn't match your patterns:

```bash
node step-editor.js rename "OldName" "NewName"
```

Example:
```bash
node step-editor.js rename "PropellerAssembly_v1" "Propeller"
node step-editor.js rename "LeftWing" "Wing_Left"
```

### 4.3 Validate File Structure

Check if your STEP file is valid:

```bash
node step-editor.js validate
```

### 4.4 Get Statistics

```bash
node step-editor.js stats
```

---

## Part 5: Workflow Checklist

### Pre-Export Checklist (in CATIA):
- [ ] All components named according to simulation standards
- [ ] Geometry oriented to Roskam coordinates (X forward, Y right, Z down)
- [ ] No orphaned or temporary geometry
- [ ] All assemblies properly constrained
- [ ] Colors assigned (optional, for visual distinction)

### Post-Export Checklist:
- [ ] Export saved to `/Users/kka/kush-resume/public/`
- [ ] Run `node analyze_step.js your_file.stp`
- [ ] Run `node step-editor.js validate`
- [ ] Component names match patterns in `componentManager.js`
- [ ] If names don't match, use `node step-editor.js rename`
- [ ] Update `public/Udaan.stp` reference in `StepViewer.jsx` if needed

### In Simulation:
- [ ] New STEP file loads without errors
- [ ] Components appear in the 3D view
- [ ] Component tree shows recognized components
- [ ] Selected components highlight in yellow
- [ ] Propeller rotates with throttle (if included)

---

## Part 6: Example Workflow

### Scenario: Create a New Aileron Control Surface

1. **In CATIA:**
   - Create new part: `Aileron_Right.CATPart`
   - Model the aileron geometry
   - Save and close

2. **Create Assembly:**
   - New file: `AircraftUpdated.CATProduct`
   - Add all existing components
   - Add `Aileron_Right.CATPart`
   - Save assembly

3. **Export to STEP:**
   - File → Save As → Type: STEP
   - Filename: `Udaan_with_aileron.stp`
   - Enable: Assembly Structure, Shapes, Attributes

4. **Validate:**
   ```bash
   node analyze_step.js Udaan_with_aileron.stp
   node step-editor.js list  # See if "Aileron_Right" appears
   node step-editor.js validate
   ```

5. **In Simulation:**
   - Update `StepViewer.jsx` to load new file
   - Rebuild: `npm run dev`
   - Component tree should show "Aileron_Right"
   - Can now add deflection animation!

---

## Part 7: Advanced: Custom Component Features

### 7.1 Propeller Animation
Once recognized as "Propeller", it automatically:
- Rotates about Z-axis (boom's long axis)
- Speed: 0-10,000 RPM based on throttle
- Continuous spinning in flight mode

### 7.2 Control Surface Deflection (Ready to Implement)
Once component is recognized, add deflection:
1. Edit `StepViewer.jsx`
2. In animation loop, add deflection logic
3. Example: Aileron deflects ±15° based on roll input

### 7.3 Landing Gear Animation (Ready to Implement)
- Deploy/Retract with button click
- Wheel rotation synchronized with motion
- Smooth animation easing

---

## Part 8: Troubleshooting

### Components Not Recognized
**Problem**: Created components don't appear in component tree
**Solution**:
1. Check component names in STEP file: `node step-editor.js list`
2. Rename if needed: `node step-editor.js rename "BadName" "Propeller"`
3. Add pattern to `componentManager.js` if using custom naming

### Components Misaligned
**Problem**: Components pointing wrong direction
**Solution**:
1. In CATIA, reorient to Roskam coordinates
2. Re-export STEP file
3. Or use `step-editor.js` to reorder components

### File Too Large
**Problem**: STEP file over 20MB
**Solution**:
1. Reduce mesh density in CATIA (fewer surfaces)
2. Remove temporary geometry
3. Split into multiple smaller STEP files

### Colors Not Showing
**Problem**: Colors exported from CATIA not visible
**Solution**:
1. Enable "Write Colors" in STEP export
2. Materials in simulation override CATIA colors (can be changed in code)
3. Use component highlighting instead

---

## Part 9: Integration with Your Simulation

### Current File Structure:
```
public/
  ├── Udaan.stp                    ← Main aircraft model
  ├── your_new_component.stp       ← (Optional) Modular component
  
src/
  ├── components/
  │   └── StepViewer.jsx           ← Update file reference here
  └── utils/
      └── componentManager.js      ← Add recognition patterns
```

### To Use New STEP File:
1. Save to `/public/your_file.stp`
2. In `src/components/StepViewer.jsx`, change:
   ```javascript
   // Line ~50 (approximate)
   const stepFile = '/public/your_file.stp';  // ← Change this
   ```
3. Run: `npm run dev`
4. Rebuild if needed: `npm run build`

---

## Part 10: Next Steps

1. ✅ Create geometry in CATIA (or use existing CAD files)
2. ✅ Export as STEP to `/public/`
3. ✅ Validate with analysis tools
4. ✅ Rename components if needed
5. ✅ Update simulation to use new file
6. ✅ Add component-specific animations (propeller, gears, control surfaces)
7. ✅ Test in browser at `http://localhost:5177`

---

## Quick Command Reference

```bash
# Analyze STEP file structure
node analyze_step.js filename.stp

# List all components
node step-editor.js list

# Rename a component
node step-editor.js rename "OldName" "NewName"

# Validate file integrity
node step-editor.js validate

# Get file statistics
node step-editor.js stats

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Support Resources

- **CATIA V5 Documentation**: Official Dassault Systèmes docs
- **STEP Format Guide**: ISO 10303-21
- **Three.js Geometry**: https://threejs.org/docs/#api/en/core/Geometry
- **Your Simulation**: See `COMPONENT_SYSTEM.md` and `StepViewer.jsx`
