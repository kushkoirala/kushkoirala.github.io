#!/usr/bin/env node

/**
 * Extract detailed component structure from STEP file
 * Identifies individual components and their relationships
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stepFile = path.join(__dirname, 'public/Udaan.stp');

try {
  const content = fs.readFileSync(stepFile, 'utf-8');
  
  console.log('=== DETAILED COMPONENT ANALYSIS ===\n');
  
  // Extract all PRODUCT definitions with their IDs
  const productPattern = /#(\d+)\s*=\s*PRODUCT\s*\(\s*['"]([^'"]+)['"]/g;
  const components = new Map();
  let match;
  
  while ((match = productPattern.exec(content)) !== null) {
    const id = match[1];
    const name = match[2];
    components.set(id, name);
  }
  
  // Group components by category
  const categories = {
    'Propulsion': [],
    'Airframe': [],
    'Control Surfaces': [],
    'Landing Gear': [],
    'Avionics': [],
    'Structural': [],
    'Other': []
  };
  
  components.forEach((name, id) => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('propell') || lowerName.includes('motor') || lowerName.includes('speed controller')) {
      categories['Propulsion'].push({ id, name });
    } else if (lowerName.includes('fuselage') || lowerName.includes('fuse') || lowerName.includes('boom')) {
      categories['Airframe'].push({ id, name });
    } else if (lowerName.includes('aileron') || lowerName.includes('rudder') || lowerName.includes('elevator') || lowerName.includes('tail')) {
      categories['Control Surfaces'].push({ id, name });
    } else if (lowerName.includes('landing') || lowerName.includes('wheel') || lowerName.includes('gear')) {
      categories['Landing Gear'].push({ id, name });
    } else if (lowerName.includes('servo') || lowerName.includes('receiver') || lowerName.includes('battery')) {
      categories['Avionics'].push({ id, name });
    } else if (lowerName.includes('spar') || lowerName.includes('rib') || lowerName.includes('cap') || lowerName.includes('web') || lowerName.includes('skin')) {
      categories['Structural'].push({ id, name });
    } else {
      categories['Other'].push({ id, name });
    }
  });
  
  // Print organized components
  Object.entries(categories).forEach(([category, items]) => {
    if (items.length > 0) {
      console.log(`\n=== ${category.toUpperCase()} (${items.length} components) ===`);
      items.forEach(item => {
        console.log(`  #${item.id}: ${item.name}`);
      });
    }
  });
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total components: ${components.size}`);
  console.log(`\nComponents that can be animated/rotated:`);
  console.log('  ✓ Propeller - can spin continuously');
  console.log('  ✓ Control Surfaces - can rotate for flight control visualization');
  console.log('  ✓ Landing Gear - can be deployed/retracted');
  console.log('  ✓ Tail Wheel - can spin with motion');
  
  // Find key components
  console.log('\n=== KEY COMPONENTS FOR SIMULATION ===');
  const keyComponents = [
    'Propellor',
    'Motor Assembly',
    'Wing',
    'Fuse Assembly',
    'LG With Wheels',
    'Aileron',
    'Rudder',
    'Elevator',
    'Tails'
  ];
  
  keyComponents.forEach(key => {
    const found = Array.from(components.entries())
      .find(([id]) => {
        const comp = components.get(id);
        return comp.includes(key);
      });
    
    if (found) {
      console.log(`  ✓ ${key} (ID: ${found[0]})`);
    }
  });
  
} catch (error) {
  console.error('Error:', error.message);
}
