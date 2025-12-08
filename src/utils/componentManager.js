/**
 * Component Management Utility
 * Identifies and manages individual aircraft components from STEP geometry
 */

import * as THREE from 'three';

/**
 * Component definitions mapping component names to their properties
 */
export const COMPONENT_DEFINITIONS = {
  propeller: {
    id: 263,
    names: ['propell', 'prop'],
    type: 'spinning',
    axis: 'x', // Rotates about X-axis (forward)
    maxRPM: 10000,
    description: 'Aircraft propeller'
  },
  motor: {
    id: 26,
    names: ['motor', 'engine'],
    type: 'spinning',
    axis: 'x',
    maxRPM: 10000,
    description: 'Motor/Engine assembly'
  },
  wing: {
    id: 2133,
    names: ['wing'],
    type: 'structural',
    description: 'Main wing assembly'
  },
  fuselage: {
    id: 163471,
    names: ['fuse', 'fuselage', 'boom'],
    type: 'structural',
    description: 'Aircraft body/fuselage'
  },
  aileron: {
    id: 220826,
    names: ['aileron'],
    type: 'control_surface',
    axis: 'z', // Rotates about Z-axis (spanwise)
    maxAngle: 25,
    description: 'Aileron control surface'
  },
  elevator: {
    id: 200544,
    names: ['elevator'],
    type: 'control_surface',
    axis: 'z',
    maxAngle: 25,
    description: 'Elevator control surface'
  },
  rudder: {
    id: 177880,
    names: ['rudder'],
    type: 'control_surface',
    axis: 'y', // Rotates about Y-axis (vertical)
    maxAngle: 30,
    description: 'Rudder control surface'
  },
  landingGear: {
    id: 1232,
    names: ['landing gear', 'lg with wheels', 'lg r2'],
    type: 'deployable',
    description: 'Landing gear assembly'
  },
  wheels: {
    id: 1831,
    names: ['wheel', 'wheels'],
    type: 'spinning',
    axis: 'y',
    maxRPM: 5000,
    description: 'Landing gear wheels'
  },
  tailWheel: {
    id: 222095,
    names: ['tail wheel', 'tail gear'],
    type: 'spinning',
    axis: 'y',
    maxRPM: 5000,
    description: 'Tail wheel'
  },
  horizontalStabilizer: {
    id: 180253,
    names: ['horizontal', 'horiz'],
    type: 'structural',
    description: 'Horizontal stabilizer'
  },
  verticalStabilizer: {
    id: 168748,
    names: ['vertical', 'vertic'],
    type: 'structural',
    description: 'Vertical stabilizer'
  }
};

/**
 * Classify a mesh based on its name
 * @param {string} meshName - Name of the mesh from STEP file
 * @returns {object|null} Component definition if matched, null otherwise
 */
export function classifyMesh(meshName) {
  if (!meshName) return null;
  
  const lowerName = meshName.toLowerCase();
  
  for (const [key, component] of Object.entries(COMPONENT_DEFINITIONS)) {
    for (const namePattern of component.names) {
      if (lowerName.includes(namePattern)) {
        return { key, ...component };
      }
    }
  }
  
  return null;
}

/**
 * Organize meshes into component groups
 * @param {array} meshes - Array of Three.js meshes
 * @returns {object} Object with component groups
 */
export function organizeComponentsFromMeshes(meshes) {
  const components = {};
  const unclassified = [];
  
  // Initialize all component groups
  for (const [key] of Object.entries(COMPONENT_DEFINITIONS)) {
    components[key] = [];
  }
  
  // Classify each mesh
  meshes.forEach(mesh => {
    const classification = classifyMesh(mesh.name);
    
    if (classification) {
      components[classification.key].push(mesh);
    } else {
      unclassified.push(mesh);
    }
  });
  
  return {
    components,
    unclassified,
    summary: {
      total: meshes.length,
      classified: meshes.length - unclassified.length,
      unclassified: unclassified.length
    }
  };
}

/**
 * Organize meshes into component groups
 * Returns Three.js Groups organized by component
 */
export function createComponentGroups(meshes) {
  const organized = organizeComponentsFromMeshes(meshes);
  const groups = {};
  
  // Create a reference list for each component (meshes stay in place, we just track them)
  for (const [componentKey, meshList] of Object.entries(organized.components)) {
    if (meshList.length > 0) {
      groups[componentKey] = {
        meshes: meshList, // Keep references to original meshes, don't move them
        definition: COMPONENT_DEFINITIONS[componentKey],
        meshCount: meshList.length
      };
    }
  }
  
  return {
    components: groups,
    unclassified: organized.unclassified,
    summary: organized.summary
  };
}

export default {
  COMPONENT_DEFINITIONS,
  classifyMesh,
  organizeComponentsFromMeshes,
  createComponentGroups
};
