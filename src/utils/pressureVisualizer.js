/**
 * Pressure Field Visualization for Aircraft
 * Visualizes pressure zones on aircraft surfaces based on aerodynamic coefficients
 * 
 * Color scheme:
 * - Deep Blue: High suction (low pressure)
 * - Light Blue: Low suction
 * - White: Neutral pressure
 * - Yellow: Moderate pressure
 * - Red: High pressure
 */

import * as THREE from 'three';

export class PressureVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.pressureIndicators = [];
    this.pressureMeshes = [];
    this.originalMaterials = new Map();
  }

  /**
   * Clear all pressure visualizations
   */
  clearPressure() {
    // Remove pressure overlay meshes
    this.pressureMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    this.pressureMeshes = [];
    this.pressureIndicators = [];
  }

  /**
   * Visualize pressure distribution on aircraft surfaces
   * 
   * @param {Array} meshes - Array of Three.js meshes to visualize
   * @param {number} CL - Lift coefficient
   * @param {number} CD - Drag coefficient
   * @param {number} airspeed - m/s
   * @param {Object} options - Visualization options
   */
  visualizePressure(meshes, CL, CD, airspeed, options = {}) {
    this.clearPressure();

    const density = options.density || 1.225;
    
    // Dynamic pressure: q = 0.5 × ρ × V²
    const q = 0.5 * density * (airspeed ** 2);

    let coloredMeshCount = 0;
    meshes.forEach(mesh => {
      if (!mesh || !mesh.geometry) return;

      // Identify surface type
      const surfaceType = this.identifySurface(mesh.name);

      // Calculate pressure coefficient (Cp) for this surface
      const Cp = this.calculateCp(surfaceType, CL, CD);

      // Convert to color
      const color = this.cpToColor(Cp);
      const opacity = this.cpToOpacity(Cp);

      // Apply pressure visualization to mesh
      this.applyPressureToMesh(mesh, color, opacity, Cp);
      coloredMeshCount++;

      this.pressureIndicators.push({
        meshName: mesh.name,
        surfaceType,
        Cp,
        q,
        color,
        opacity
      });
    });
    
    console.log('🎨 Colored', coloredMeshCount, 'meshes with pressure visualization');
  }

  /**
   * Calculate pressure coefficient (Cp) for different aircraft surfaces
   * Cp = (p - p∞) / (0.5 × ρ × V²)
   * 
   * Empirical values based on standard aircraft configurations
   */
  calculateCp(surfaceType, CL, CD) {
    // Base pressure coefficients for different surface types
    const baseValues = {
      'fuselage': -0.3,      // Moderate suction on fuselage
      'wing': -0.8,          // High suction on upper wing surface
      'wing_lower': 0.3,     // Positive pressure on lower surface
      'aileron': -0.4,       // Control surface suction
      'aileron_lower': 0.2,
      'rudder': -0.2,        // Vertical stabilizer
      'elevator': -0.3,      // Horizontal stabilizer
      'elevator_lower': 0.1,
      'landing_gear': 0.8,   // High pressure (high drag)
      'wheel': 1.0,          // Very high pressure on wheels
      'fuselage_nose': -1.5, // Very high suction at stagnation
      'fuselage_tail': 0.2,  // Base pressure at rear
    };

    let Cp = baseValues[surfaceType] || baseValues['fuselage'];

    // Modify based on lift coefficient (induced effects)
    // High lift → higher suction on wing upper surface
    if (surfaceType.includes('wing') && !surfaceType.includes('lower')) {
      Cp += CL * 0.5;  // More negative with more lift
    }
    
    // High drag (usually at high AOA) → higher pressure on drag-producing surfaces
    if (surfaceType.includes('landing_gear') || surfaceType.includes('wheel')) {
      Cp += CD * 2.0;
    }

    // Clamp to realistic range
    Cp = Math.max(-2.5, Math.min(1.5, Cp));

    return Cp;
  }

  /**
   * Convert pressure coefficient to RGB color
   * Blue (low pressure) → Red (high pressure)
   */
  cpToColor(Cp) {
    // Normalize Cp to range [0, 1]
    // Cp range: -2.5 (deep blue) to +1.5 (red)
    const normalized = (Cp + 2.5) / 4.0;
    const t = Math.max(0, Math.min(1, normalized));

    let r, g, b;

    if (t < 0.2) {
      // Deep blue to light blue
      const s = t / 0.2;
      r = s * 0.5;
      g = s * 0.5;
      b = 1;
    } else if (t < 0.4) {
      // Light blue to cyan
      const s = (t - 0.2) / 0.2;
      r = 0.5 * (1 - s);
      g = 0.5 + s * 0.5;
      b = 1;
    } else if (t < 0.6) {
      // Cyan to green
      const s = (t - 0.4) / 0.2;
      r = 0;
      g = 1;
      b = 1 - s;
    } else if (t < 0.8) {
      // Green to yellow
      const s = (t - 0.6) / 0.2;
      r = s;
      g = 1;
      b = 0;
    } else {
      // Yellow to red
      const s = (t - 0.8) / 0.2;
      r = 1;
      g = 1 - s;
      b = 0;
    }

    return new THREE.Color(r, g, b);
  }

  /**
   * Convert pressure coefficient to opacity (visual intensity)
   * High |Cp| values have higher opacity
   */
  cpToOpacity(Cp) {
    // Magnitude of pressure coefficient indicates intensity
    const magnitude = Math.abs(Cp);
    // Scale to 0-1 range (max around 2.5)
    return Math.min(1, magnitude / 1.5);
  }

  /**
   * Identify surface type from mesh name
   * Uses pattern matching
   */
  identifySurface(meshName) {
    const name = meshName.toLowerCase();

    // Check specific patterns
    if (name.includes('nose') || name.includes('stagnation')) return 'fuselage_nose';
    if (name.includes('tail') && name.includes('fuse')) return 'fuselage_tail';
    
    if (name.includes('wing')) {
      if (name.includes('upper') || name.includes('top') || !name.includes('lower')) {
        return 'wing';
      } else {
        return 'wing_lower';
      }
    }

    if (name.includes('aileron')) {
      if (name.includes('lower')) return 'aileron_lower';
      return 'aileron';
    }

    if (name.includes('rudder') || name.includes('vertical')) return 'rudder';

    if (name.includes('elevator') || name.includes('horiz')) {
      if (name.includes('lower')) return 'elevator_lower';
      return 'elevator';
    }

    if (name.includes('gear') || name.includes('strut')) return 'landing_gear';
    if (name.includes('wheel') || name.includes('tire')) return 'wheel';

    if (name.includes('fusel')) return 'fuselage';

    return 'fuselage';  // Default
  }

  /**
   * Apply pressure visualization to a mesh
   * Modifies the mesh material directly to show pressure
   */
  applyPressureToMesh(mesh, color, opacity, Cp) {
    // Store original material if we haven't already
    const meshUuid = mesh.uuid;
    if (!this.originalMaterials.has(meshUuid)) {
      if (mesh.material) {
        this.originalMaterials.set(meshUuid, mesh.material.clone ? mesh.material.clone() : mesh.material);
      }
    }

    // Create pressure visualization material - make it bright and visible
    const pressureMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: Math.max(0.5, opacity * 1.0),  // Increased for visibility
      metalness: 0.2,
      roughness: 0.5,
      transparent: true,
      opacity: 1.0,  // Full opacity so colors are visible
      side: THREE.DoubleSide,
      wireframe: false
    });

    // Apply to mesh
    mesh.material = pressureMaterial;
    
    // Store reference for cleanup
    this.pressureMeshes.push({
      mesh: mesh,
      uuid: meshUuid,
      originalMaterial: this.originalMaterials.get(meshUuid),
      Cp: Cp
    });
  }

  /**
   * Restore original materials
   */
  restoreOriginalMaterials() {
    this.pressureMeshes.forEach(({ mesh, originalMaterial }) => {
      if (mesh && originalMaterial) {
        mesh.material = originalMaterial;
      }
    });
    this.pressureMeshes = [];
    this.pressureIndicators = [];
  }

  /**
   * Create force vectors showing aerodynamic forces
   * 
   * @param {THREE.Object3D} aircraftMesh - The aircraft mesh
   * @param {number} lift - Lift force in Newtons
   * @param {number} drag - Drag force in Newtons
   * @param {number} sideForce - Side force in Newtons
   * @param {Object} position - Force application point {x, y, z}
   */
  visualizeForceVectors(aircraftMesh, lift, drag, sideForce, position = null) {
    if (!position) {
      position = {
        x: aircraftMesh.position.x,
        y: aircraftMesh.position.y,
        z: aircraftMesh.position.z + 0.5  // Slightly aft of CG
      };
    }

    const scale = 0.001;  // Scale factor to make forces visible

    // Lift vector (pointing up from wing)
    if (Math.abs(lift) > 1) {
      this.createForceArrow(position, { x: 0, y: 0, z: -lift * scale }, 0xff0000);  // Red
    }

    // Drag vector (pointing backward)
    if (Math.abs(drag) > 1) {
      this.createForceArrow(position, { x: -drag * scale, y: 0, z: 0 }, 0x00ff00);  // Green
    }

    // Side force vector (pointing sideways)
    if (Math.abs(sideForce) > 0.1) {
      this.createForceArrow(position, { x: 0, y: sideForce * scale, z: 0 }, 0x0000ff);  // Blue
    }
  }

  /**
   * Create an arrow showing force vector
   */
  createForceArrow(origin, direction, color) {
    const length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    
    if (length < 0.01) return;  // Too small to display

    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(origin.x, origin.y, origin.z), length, color);

    this.scene.add(arrow);
    this.pressureIndicators.push({ arrow, createdAt: Date.now() });
  }

  /**
   * Toggle pressure field on/off
   */
  togglePressureField(visible) {
    this.pressureMeshes.forEach(mesh => {
      mesh.visible = visible;
    });
  }

  /**
   * Get pressure data for telemetry display
   */
  getPressureData() {
    return this.pressureIndicators.map(indicator => ({
      surfaceType: indicator.surfaceType,
      Cp: parseFloat(indicator.Cp.toFixed(3)),
      color: `#${indicator.color.getHexString()}`
    }));
  }
}

export default PressureVisualizer;
