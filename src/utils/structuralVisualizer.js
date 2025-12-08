/**
 * Structural Visualization Module
 * Real-time mesh coloring based on stress and structural analysis
 */

import * as THREE from 'three';

export class StructuralVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.stressMeshes = new Map(); // Map of component name -> meshes
    this.originalMaterials = new Map(); // Store original materials
  }

  /**
   * Register aircraft meshes by component
   * Maps mesh names to structural components
   */
  registerMeshes(aircraftGroup) {
    const meshMap = {
      wing: [],
      boom: [],
      horizontalStabilizer: [],
      verticalStabilizer: [],
      ailerons: [],
      elevator: [],
      rudder: [],
      landingGear: []
    };

    const allMeshes = [];

    aircraftGroup.traverse((child) => {
      if (!child.isMesh) return;

      allMeshes.push(child);
      const nameLower = child.name.toLowerCase();

      // Map mesh names to components
      if (nameLower.includes('wing') && !nameLower.includes('tail')) {
        meshMap.wing.push(child);
      } else if (nameLower.includes('boom') || nameLower.includes('fuselage') || nameLower.includes('tube')) {
        meshMap.boom.push(child);
      } else if (nameLower.includes('htail') || nameLower.includes('horizontal')) {
        meshMap.horizontalStabilizer.push(child);
      } else if (nameLower.includes('vtail') || nameLower.includes('vertical')) {
        meshMap.verticalStabilizer.push(child);
      } else if (nameLower.includes('aileron')) {
        meshMap.ailerons.push(child);
      } else if (nameLower.includes('elevator')) {
        meshMap.elevator.push(child);
      } else if (nameLower.includes('rudder')) {
        meshMap.rudder.push(child);
      } else if (nameLower.includes('gear') || nameLower.includes('strut')) {
        meshMap.landingGear.push(child);
      }

      // Store original material
      if (!this.originalMaterials.has(child.uuid)) {
        this.originalMaterials.set(child.uuid, child.material.clone());
      }
    });

    this.stressMeshes = meshMap;
    this.allMeshes = allMeshes; // Store ALL meshes for fallback
    console.log('🎨 Registered', allMeshes.length, 'total meshes. Mapped:', Object.entries(meshMap).map(([k, v]) => `${k}(${v.length})`).join(', '));
    console.log('📋 All mesh names:', allMeshes.map(m => m.name).slice(0, 10).join(', '));
  }

  /**
   * Visualize structural stress on meshes
   * @param {Object} structuralState - Stress state from StructuralAnalyzer
   */
  visualizeStress(structuralState) {
    if (!structuralState || Object.keys(structuralState).length === 0) {
      console.warn('⚠️ No structural state to visualize');
      return;
    }

    // Create a composite color based on overall stress
    let maxStress = 0;
    let minHealthFactor = 1;
    let criticalColor = 0x00aa00; // Green default

    Object.values(structuralState).forEach((state) => {
      if (state && state.stress) {
        maxStress = Math.max(maxStress, state.stress);
        minHealthFactor = Math.min(minHealthFactor, state.healthFactor || 1);
      }
    });

    // Color based on worst health factor
    if (minHealthFactor < 0.5) {
      criticalColor = 0xff0000; // Red - critical
    } else if (minHealthFactor < 0.8) {
      criticalColor = 0xffaa00; // Orange - warning
    } else {
      criticalColor = 0x00ff00; // Green - healthy
    }

    console.log('🎨 Stress viz - Max stress:', (maxStress / 1e6).toFixed(1), 'MPa, Min health:', (minHealthFactor * 100).toFixed(0) + '%, Color:', '0x' + criticalColor.toString(16).toUpperCase());

    // Apply coloring to mapped meshes
    let coloredCount = 0;
    Object.entries(this.stressMeshes).forEach(([component, meshes]) => {
      if (structuralState[component] && meshes.length > 0) {
        const state = structuralState[component];
        const colorValue = state.color || criticalColor;
        const color = new THREE.Color(colorValue);

        console.log(`  ${component}: ${meshes.length} meshes, color ${colorValue}, health ${(state.healthFactor * 100).toFixed(0)}%`);

        meshes.forEach((mesh) => {
          try {
            const stressMaterial = new THREE.MeshStandardMaterial({
              color: color,
              emissive: color,
              emissiveIntensity: Math.max(0.2, state.healthFactor * 0.6),
              metalness: 0.1,
              roughness: 0.7,
              transparent: true,
              opacity: 0.95,
              side: THREE.DoubleSide
            });
            mesh.material = stressMaterial;
            coloredCount++;
          } catch (e) {
            console.error('Error applying material to', component, e);
          }
        });
      }
    });

    // Fallback: color ALL meshes if mapped meshes are empty
    if (coloredCount === 0 && this.allMeshes && this.allMeshes.length > 0) {
      console.warn('⚠️ No mapped meshes found, coloring all', this.allMeshes.length, 'meshes...');
      const color = new THREE.Color(criticalColor);
      
      this.allMeshes.forEach((mesh) => {
        try {
          const stressMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.4,
            metalness: 0.1,
            roughness: 0.7,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
          });
          mesh.material = stressMaterial;
          coloredCount++;
        } catch (e) {
          console.error('Error applying material to mesh:', e);
        }
      });
    }

    console.log('✅ Colored', coloredCount, 'meshes');
  }

  /**
   * Add vertex-level stress visualization (gradient effect)
   */
  addVertexStressVisualization(mesh, state) {
    const geometry = mesh.geometry;
    
    if (!geometry.attributes.position) return;

    const positionAttribute = geometry.attributes.position;
    const vertexCount = positionAttribute.count;

    // Create color attribute if it doesn't exist
    if (!geometry.attributes.color) {
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
    }

    const colors = geometry.attributes.color;
    const baseColor = new THREE.Color(state.color);
    const stressColor = new THREE.Color(0xFF0000); // Red for stress

    // Apply stress-based coloring to vertices
    for (let i = 0; i < vertexCount; i++) {
      // Create gradient based on position and health factor
      const t = (i % 10) / 10; // Simple gradient
      const stressAmount = (1 - state.healthFactor) * t;

      const mixedColor = baseColor.clone().lerp(stressColor, stressAmount);
      colors.setXYZ(i, mixedColor.r, mixedColor.g, mixedColor.b);
    }

    colors.needsUpdate = true;
    mesh.material.vertexColors = true;
  }

  /**
   * Restore original materials
   */
  restoreOriginalMaterials() {
    this.stressMeshes.forEach((meshes) => {
      meshes.forEach((mesh) => {
        const original = this.originalMaterials.get(mesh.uuid);
        if (original) {
          mesh.material = original.clone();
        }
      });
    });
  }

  /**
   * Create pulsing animation for critical components
   */
  animateCriticalStress(structuralState, time) {
    Object.entries(this.stressMeshes).forEach(([component, meshes]) => {
      if (!structuralState[component]) return;

      const state = structuralState[component];

      if (state.healthFactor < 0.5) {
        // Critical - pulse effect
        const pulse = 0.5 + 0.5 * Math.sin(time * 4);
        meshes.forEach((mesh) => {
          if (mesh.material.emissiveIntensity !== undefined) {
            mesh.material.emissiveIntensity = 0.3 + pulse * 0.5;
          }
        });
      } else if (state.healthFactor < 0.8) {
        // Warning - slower pulse
        const pulse = 0.5 + 0.5 * Math.sin(time * 2);
        meshes.forEach((mesh) => {
          if (mesh.material.emissiveIntensity !== undefined) {
            mesh.material.emissiveIntensity = 0.2 + pulse * 0.3;
          }
        });
      }
    });
  }

  /**
   * Get heat map color from stress (0 = blue, 1 = red)
   */
  static getHeatmapColor(normalizedStress) {
    // Normalize between 0 and 1
    const t = Math.max(0, Math.min(1, normalizedStress));

    if (t < 0.25) {
      // Blue to Cyan
      return new THREE.Color(0, 0.5 + t * 2, 1);
    } else if (t < 0.5) {
      // Cyan to Green
      return new THREE.Color(0, 1, 1 - (t - 0.25) * 4);
    } else if (t < 0.75) {
      // Green to Yellow
      return new THREE.Color((t - 0.5) * 4, 1, 0);
    } else {
      // Yellow to Red
      return new THREE.Color(1, 1 - (t - 0.75) * 4, 0);
    }
  }
}

export default StructuralVisualizer;
