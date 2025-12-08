# Component-Specific Simulation Features

## Overview

This guide explains how to implement custom animations and behaviors for components created in CATIA and exported to STEP format. Your simulation automatically recognizes and can animate components based on their names.

---

## Part 1: Component Recognition System

### How It Works

1. **Component names are extracted** from STEP file during loading
2. **Pattern matching** identifies component type (propeller, wing, etc.)
3. **Animation capabilities** are enabled based on component type
4. **Real-time controls** apply animations during flight simulation

### Pattern Matching Rules

Components are identified using case-insensitive regex patterns:

```javascript
// Location: src/utils/componentManager.js
COMPONENT_DEFINITIONS = {
  propeller: {
    patterns: [/propell/i, /rotor/i, /screw/i],
    // Matches: "Propeller", "propellor", "rotor_main"
  },
  wing: {
    patterns: [/wing(?!_tip)/i, /wing_main/i],
    // Matches: "Wing", "Wing_Left", "Wing_Assembly"
    // Does NOT match: "Wing_Tip" (negative lookahead)
  },
  aileron: {
    patterns: [/aileron/i, /aileron_left/i, /aileron_right/i],
    // Matches: "Aileron", "Aileron_L", "Control_Aileron_Left"
  }
}
```

---

## Part 2: Built-In Animations

### 2.1 Propeller Rotation (Currently Implemented ✅)

**Recognition**: Components named with "propel..." pattern

**Animation**:
```javascript
// Rotates about Z-axis (boom's long axis)
RPM = 10,000 × throttle (0-1)
Rotation = (RPM / 60) × (2π / 60fps)
Axis = (0, 0, 1)  // Z-axis
```

**In Simulation**:
- Stationary when throttle = 0%
- Spins at 5,000 RPM when throttle = 50%
- Spins at 10,000 RPM when throttle = 100%

**Code Location**: `src/components/StepViewer.jsx`, lines 568-576

---

### 2.2 Wheel Rotation (Ready to Implement ⏳)

**Recognition**: Components named with "wheel..." pattern

**Animation** (Code stub exists):
```javascript
// Rotates about Y-axis (wheel axle)
// Speed proportional to throttle/aircraft speed
RPM = throttle × 1000  // Lower than propeller
Rotation = (RPM / 60) × (2π / 60fps)
Axis = (0, 1, 0)  // Y-axis
```

**Use Cases**:
- Wheels spinning during taxi
- Visual feedback during landing
- Ground effect simulation

---

### 2.3 Control Surface Deflection (Ready to Implement ⏳)

**Recognition**: Components named with "aileron...", "rudder...", "elevator..." patterns

**Deflection Formula**:
```javascript
// Aileron (Roll Control)
DeflectionAngle = ±15° × rollInput (-1 to +1)
Axis = (1, 0, 0)  // X-axis (along fuselage)

// Rudder (Yaw Control)
DeflectionAngle = ±25° × yawInput (-1 to +1)
Axis = (0, 0, 1)  // Z-axis (vertical)

// Elevator (Pitch Control)
DeflectionAngle = ±20° × pitchInput (-1 to +1)
Axis = (0, 1, 0)  // Y-axis (across fuselage)
```

**Implementation Location**: To be added to `StepViewer.jsx` animation loop

---

### 2.4 Landing Gear Animation (Ready to Implement ⏳)

**Recognition**: Components named with "landing.gear..." or "undercarriage..." pattern

**States**:
```javascript
// DOWN (Default)
Position = origin
Visibility = true

// UP (Retracted)
Position = origin + (0, -2, 0)  // Move up
Visibility = true (or false if stored inside fuselage)

// Animation Time: 2-3 seconds for smooth deploy/retract
```

**Trigger**: Button in Flight Controls UI

---

## Part 3: Implementing Custom Animations

### 3.1 Add New Component Type

**Step 1**: Define in `componentManager.js`

```javascript
// Add to COMPONENT_DEFINITIONS
myCustomComponent: {
  name: 'My Custom Component',
  type: 'custom',
  animationCapability: 'rotate',  // or 'deflect', 'translate', 'none'
  animationAxis: new THREE.Vector3(1, 0, 0),  // X-axis
  patterns: [
    /my_custom/i,
    /custom_part/i
  ],
  description: 'Custom component for simulation'
}
```

**Step 2**: Export recognition in component manager

```javascript
export const COMPONENT_DEFINITIONS = { ... };  // Already done
```

**Step 3**: Component is now auto-recognized when STEP loads

---

### 3.2 Add Animation Logic

**In `StepViewer.jsx`** (main animation loop, around line 550-600):

```javascript
// Animation loop section - add this pattern:

// === MY CUSTOM COMPONENT ===
if (componentsRef.current.myCustomComponent?.meshes) {
  const component = componentsRef.current.myCustomComponent;
  const animationValue = // Get from controlsRef
  
  component.meshes.forEach(mesh => {
    // Option 1: Rotation
    mesh.rotateOnWorldAxis(
      new THREE.Vector3(1, 0, 0),  // Axis
      animationValue * deltaTime   // Amount
    );
    
    // Option 2: Translation (position change)
    mesh.position.y += animationValue * deltaTime;
    
    // Option 3: Deflection (limited rotation)
    const maxDeflection = Math.PI / 12;  // 15 degrees
    mesh.rotation.z = Math.sin(time) * maxDeflection;
  });
}
```

---

## Part 4: Example Implementations

### Example 1: Control Surface Deflection (Aileron)

**In CATIA**: Create "Aileron_Left" component

**In `componentManager.js`**:
```javascript
aileron: {
  name: 'Aileron',
  type: 'control_surface',
  animationCapability: 'deflect',
  animationAxis: new THREE.Vector3(1, 0, 0),
  patterns: [/aileron/i],
  maxDeflection: Math.PI / 12,  // 15 degrees
  description: 'Roll control surface'
}
```

**In `StepViewer.jsx`** animation loop:
```javascript
// Aileron Deflection
if (componentsRef.current.aileron?.meshes) {
  const maxDeflection = Math.PI / 12;  // 15°
  const rollInput = controlsRef.current.roll || 0;  // -1 to +1
  const deflection = rollInput * maxDeflection;
  
  componentsRef.current.aileron.meshes.forEach(mesh => {
    // Reset and apply new deflection
    mesh.rotation.x = deflection;
  });
}
```

---

### Example 2: Landing Gear Deploy/Retract

**In CATIA**: Create "Landing_Gear" component with wheels

**Add UI Button** (in StepViewer.jsx JSX):
```javascript
<button onClick={() => {
  controlsRef.current.gearDown = !controlsRef.current.gearDown;
  setGearStatus(controlsRef.current.gearDown);
}}>
  {gearStatus ? '⬇️ Gear Down' : '⬆️ Gear Up'}
</button>
```

**In `StepViewer.jsx`** animation loop:
```javascript
if (componentsRef.current.landing_gear?.meshes) {
  const gearDown = controlsRef.current.gearDown ?? true;
  const targetY = gearDown ? 0 : -2;  // -2 = retracted
  
  componentsRef.current.landing_gear.meshes.forEach(mesh => {
    const currentY = mesh.position.y;
    const diff = targetY - currentY;
    const speed = 0.02;  // Smooth animation
    
    if (Math.abs(diff) > 0.01) {
      mesh.position.y += Math.sign(diff) * speed;
    }
  });
  
  // Also rotate wheels if moving
  if (controlsRef.current.wheel?.meshes) {
    const wheelRPM = 500 * (controlsRef.current.throttle || 0);
    const wheelRad = (wheelRPM / 60) * (2 * Math.PI / 60);
    controlsRef.current.wheel.meshes.forEach(mesh => {
      mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), wheelRad);
    });
  }
}
```

---

### Example 3: Tail Wheel Rotation

**In CATIA**: Create "Tail_Wheel" component

**In `componentManager.js`**:
```javascript
tail_wheel: {
  name: 'Tail Wheel',
  type: 'landing_gear',
  animationCapability: 'rotate',
  animationAxis: new THREE.Vector3(0, 1, 0),
  patterns: [/tail.wheel/i, /tailwheel/i],
  description: 'Tail landing gear wheel'
}
```

**In `StepViewer.jsx`** animation loop:
```javascript
if (componentsRef.current.tail_wheel?.meshes) {
  // Rotate when aircraft moving (use heading change as proxy)
  const wheelRPM = 300 * (controlsRef.current.throttle || 0);
  const wheelRad = (wheelRPM / 60) * (2 * Math.PI / 60);
  
  componentsRef.current.tail_wheel.meshes.forEach(mesh => {
    mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), wheelRad);
  });
}
```

---

## Part 5: Testing Your Animations

### 5.1 Development Workflow

1. **Create component in CATIA**
   ```
   File → New → Part
   Create geometry
   Save as: ComponentName.CATPart
   ```

2. **Export as STEP**
   ```
   File → Save As → Type: STEP
   Save to: /public/YourAircraft.stp
   ```

3. **Validate**
   ```bash
   npm run validate:step ./public/YourAircraft.stp
   ```

4. **Update component recognition** (if needed)
   - Edit `src/utils/componentManager.js`
   - Add recognition pattern for your component

5. **Add animation logic**
   - Edit `src/components/StepViewer.jsx`
   - Add to animation loop

6. **Test in browser**
   ```bash
   npm run dev
   # Visit http://localhost:5177
   ```

### 5.2 Debugging Tips

**Component not recognized?**
```bash
# List all components in STEP file
node step-editor.js list

# If name doesn't match pattern, rename it
node step-editor.js rename "BadName" "Propeller"
```

**Animation not working?**
1. Check browser console: `F12` → Console tab
2. Component should appear in component tree
3. Verify animation code is in main animation loop
4. Use `console.log()` to debug values

**Visual glitches?**
1. Component position/rotation incorrect
2. Verify Roskam coordinate alignment
3. Use component highlighting to verify it's being animated

---

## Part 6: Component Communication

### Sending Data Between Components

**Example**: Aileron deflection should match roll input

```javascript
// Store shared state in controlsRef
controlsRef.current = {
  pitch: 0,
  roll: 0,
  yaw: 0,
  throttle: 0.6,
  gearDown: true,
  // Add custom properties:
  aileronDeflection: 0,
  rudderDeflection: 0,
  elevatorDeflection: 0,
};

// Read and write in animation loop
if (componentsRef.current.aileron?.meshes) {
  const deflection = controlsRef.current.roll * Math.PI / 12;
  controlsRef.current.aileronDeflection = deflection;  // For other systems
  
  componentsRef.current.aileron.meshes.forEach(mesh => {
    mesh.rotation.x = deflection;
  });
}
```

---

## Part 7: Performance Optimization

### For High-Polygon Components

1. **In CATIA**: Reduce surface density before export
   - Simplify surfaces
   - Remove internal detail
   - Use approximate geometry

2. **In Code**: Reduce animation update frequency
   ```javascript
   // Only update every 2 frames
   if (frameCount % 2 === 0) {
     // Update component animation
   }
   ```

3. **Use LOD** (Level of Detail):
   ```javascript
   // Simplified animation for distant components
   if (distance > 100) {
     // Use simpler calculation
   }
   ```

---

## Part 8: Advanced: Physics-Based Animations

### Propeller Wash Effect (Future)

```javascript
// Calculate propeller influence on nearby components
const propellerPos = componentsRef.current.propeller.meshes[0].position;
const propellerRPM = 10000 * controlsRef.current.throttle;

// Check which components are in wash cone
componentsRef.current.fuselage.meshes.forEach(mesh => {
  const distance = mesh.position.distanceTo(propellerPos);
  if (distance < 5) {  // Within 5 units
    // Apply slight vibration or material effect
    mesh.material.emissive.setHSL(0, 0, propellerRPM / 10000 * 0.1);
  }
});
```

### G-Load Visualization (Future)

```javascript
// Color-code components based on stress
const gLoad = calculateGLoad(acceleration);
const color = new THREE.Color();

if (gLoad > 5) {
  color.setHSL(0, 1, 0.3);  // Red (high stress)
} else if (gLoad > 3) {
  color.setHSL(0.1, 1, 0.4);  // Orange
} else {
  color.setHSL(0.2, 1, 0.5);  // Green
}

componentsRef.current.wings.meshes.forEach(mesh => {
  mesh.material.color = color;
});
```

---

## Part 9: Quick Reference

### Component Recognition Patterns

| Component | Recognition | Max Animation |
|-----------|-------------|---------------|
| propeller | /propell/i | 10,000 RPM |
| motor | /motor/i | 10,000 RPM |
| wing | /wing/i | None (structural) |
| aileron | /aileron/i | ±15° deflection |
| rudder | /rudder/i | ±25° deflection |
| elevator | /elevator/i | ±20° deflection |
| landing_gear | /gear/i | Deploy/retract |
| wheel | /wheel/i | 1,000 RPM |
| tail_wheel | /tail.wheel/i | 300 RPM |

### Code Locations

- **Component Recognition**: `src/utils/componentManager.js`
- **Animation Loop**: `src/components/StepViewer.jsx` (~line 550)
- **Controls State**: `controlsRef.current` (StepViewer.jsx)
- **Component Access**: `componentsRef.current.{componentName}.meshes`

### Useful Commands

```bash
# Validate STEP file
npm run validate:step ./public/YourFile.stp

# Analyze structure
npm run analyze:step ./public/YourFile.stp

# Rename component
node step-editor.js rename "OldName" "NewName"

# List all components
node step-editor.js list

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## Part 10: Next Steps

1. ✅ Create geometry in CATIA
2. ✅ Export as STEP to `/public/`
3. ✅ Validate with `npm run validate:step`
4. ✅ Add component recognition pattern if needed
5. ✅ Implement animation in `StepViewer.jsx`
6. ✅ Test with `npm run dev`
7. ✅ Deploy with `git push`

---

**Questions?** Check the console output and validation reports for detailed information about your components!
