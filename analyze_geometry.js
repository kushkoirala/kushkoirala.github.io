#!/usr/bin/env node

/**
 * Analyze STEP file geometry structure
 * Reads the STEP file to identify components like fuselage, wings, propellers, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stepFile = path.join(__dirname, 'public/Udaan.stp');

try {
  const content = fs.readFileSync(stepFile, 'utf-8');
  
  console.log('=== STEP FILE ANALYSIS ===\n');
  console.log(`File size: ${(content.length / 1024).toFixed(2)} KB\n`);
  
  // Extract header information
  console.log('=== FILE HEADER ===');
  const headerMatch = content.match(/^(.{1,500})/);
  if (headerMatch) {
    console.log(headerMatch[0].substring(0, 300) + '...\n');
  }
  
  // Extract all named objects/components
  console.log('=== NAMED ENTITIES ===');
  const namePattern = /#\d+\s*=\s*([A-Z_]+)\s*\((.*?)\)\s*;/g;
  const entities = {};
  let match;
  let count = 0;
  
  while ((match = namePattern.exec(content)) !== null && count < 100) {
    const entityType = match[1];
    
    if (!entities[entityType]) {
      entities[entityType] = 0;
    }
    entities[entityType]++;
    count++;
  }
  
  Object.entries(entities)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count} occurrences`);
    });
  
  console.log('\n=== SEARCHING FOR COMPONENTS ===');
  
  // Look for shape/part names
  const shapePattern = /#\d+\s*=\s*NAMED_UNIT\s*\(\s*([^,]+),/g;
  const shapes = new Set();
  while ((match = shapePattern.exec(content)) !== null) {
    const name = match[1].trim().replace(/['\s]/g, '');
    if (name) shapes.add(name);
  }
  
  if (shapes.size > 0) {
    console.log('\nNamed units found:');
    Array.from(shapes).forEach(s => console.log(`  - ${s}`));
  }
  
  // Look for shape representations
  const shapeRepPattern = /#\d+\s*=\s*SHAPE_REPRESENTATION\s*\(\s*['"]([^'"]+)['"]/g;
  const shapeReps = new Set();
  while ((match = shapeRepPattern.exec(content)) !== null) {
    shapeReps.add(match[1]);
  }
  
  if (shapeReps.size > 0) {
    console.log('\nShape representations:');
    Array.from(shapeReps).forEach(s => console.log(`  - ${s}`));
  }
  
  // Search for product names (component names)
  const productPattern = /#\d+\s*=\s*PRODUCT\s*\(\s*['"]([^'"]+)['"]/g;
  const products = new Set();
  while ((match = productPattern.exec(content)) !== null) {
    products.add(match[1]);
  }
  
  if (products.size > 0) {
    console.log('\nProduct components:');
    Array.from(products).forEach(p => console.log(`  - ${p}`));
  }
  
  // Count geometric primitives
  console.log('\n=== GEOMETRIC PRIMITIVES ===');
  const solidCount = (content.match(/#\d+\s*=\s*CLOSED_SHELL/g) || []).length;
  const faceCount = (content.match(/#\d+\s*=\s*FACE_BOUND/g) || []).length;
  const loopCount = (content.match(/#\d+\s*=\s*EDGE_LOOP/g) || []).length;
  const edgeCount = (content.match(/#\d+\s*=\s*EDGE_CURVE/g) || []).length;
  const vertexCount = (content.match(/#\d+\s*=\s*CARTESIAN_POINT/g) || []).length;
  
  console.log(`  Cartesian Points (vertices): ${vertexCount}`);
  console.log(`  Edge Curves: ${edgeCount}`);
  console.log(`  Edge Loops: ${loopCount}`);
  console.log(`  Face Bounds: ${faceCount}`);
  console.log(`  Closed Shells (solids): ${solidCount}`);
  
  // Estimate complexity
  console.log('\n=== COMPLEXITY ESTIMATE ===');
  console.log(`  Approximate triangles when tessellated: ${(faceCount * 2)}`);
  
} catch (error) {
  console.error('Error analyzing STEP file:', error.message);
}
