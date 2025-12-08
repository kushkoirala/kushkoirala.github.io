# Component-Aware STEP Geometry Loading

## Implementation Summary

### What Was Added:

#### 1. **Component Manager Utility** (`src/utils/componentManager.js`)
- Defines 11 major aircraft components with metadata:
  - **Propeller** - Can spin continuously (10,000 RPM max)
  - **Motor Assembly** - Rotates with propeller
  - **Wing, Fuselage, Tail Components** - Structural elements
  - **Control Surfaces** - Aileron, Rudder, Elevator
  - **Landing Gear & Wheels** - Can rotate
  - **Horizontal & Vertical Stabilizers**

- Key functions:
  - `classifyMesh()` - Identifies which component a mesh belongs to based on name patterns
  - `organizeComponentsFromMeshes()` - Groups meshes by component type
  - `createComponentGroups()` - Creates Three.js groups for each identified component

#### 2. **Enhanced StepViewer Component**
- **Component Reference Storage** (`componentsRef`)
  - Stores organized component groups for animation access
  - Enables selective control of individual components

- **Component Organization During Load**
  - All meshes are classified as they're loaded
  - Similar meshes are grouped into logical components
  - Console logs summary of component organization

- **Component Animation Loop**
  - **Propeller Rotation**: Spins about X-axis (forward), speed based on throttle (0-10,000 RPM)
  - **Wheel Rotation**: Spins about Y-axis, speed scaled by throttle
  - **Tail Wheel Rotation**: Separate wheel rotation for tail gear

### How It Works:

1. **Loading Phase**:
   - STEP file is tessellated into meshes
   - Each mesh name is parsed (e.g., "Propellor", "Rudder", "Wing")
   - Meshes are classified using pattern matching
   - Similar meshes are grouped into component groups

2. **Animation Phase** (In Flight Mode):
   - Propeller group rotates continuously based on throttle input
   - Rotation happens about the propeller's local X-axis (forward direction)
   - RPM calculation: `RPM * throttle * time_delta`
   - Wheels spin proportionally to throttle for visual feedback

3. **Access Pattern**:
   ```javascript
   // Get propeller component
   const propellerComponent = componentsRef.current.propeller;
   
   // Component has:
   // - group: Three.js Group object
   // - meshes: Array of individual meshes
   // - definition: Component metadata
   // - meshCount: Number of meshes in component
   ```

### Current Status:
✅ Component classification system working
✅ Propeller rotation enabled
✅ Wheel rotation enabled
✅ Tail wheel rotation enabled
✅ Mesh organization logged to console

### Next Steps (Available):
- Add aileron/rudder/elevator deflection based on flight controls
- Add landing gear deploy/retract animation
- Add custom colors per component
- Add component visibility toggle in UI
- Add component inspection/selection panel

### Component List Available:
- ✓ Propeller (#263)
- ✓ Motor Assembly (#26)
- ✓ Wing (#2133)
- ✓ Fuselage (#163471)
- ✓ Landing Gear (#1232)
- ✓ Wheels (#1831)
- ✓ Aileron (#220826)
- ✓ Elevator (#200544)
- ✓ Rudder (#177880)
- ✓ Horizontal Stabilizer (#180253)
- ✓ Vertical Stabilizer (#168748)
- ✓ Tail Wheel (#222095)
