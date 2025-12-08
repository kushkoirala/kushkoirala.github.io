#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * STEP File Validation & Optimization Tool
 * Validates CATIA-exported STEP files for simulation compatibility
 * Checks component naming, structure, and provides recommendations
 */

import fs from 'fs';
import path from 'path';

class StepValidator {
  constructor(filePath) {
    this.filePath = filePath;
    this.fileName = path.basename(filePath);
    this.fileSize = fs.statSync(filePath).size;
    this.content = fs.readFileSync(filePath, 'utf-8');
    this.lines = this.content.split('\n');
    
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
    this.components = [];
  }

  // Parse STEP file structure
  parse() {
    console.log(`\n📋 Analyzing: ${this.fileName}`);
    console.log(`📦 File Size: ${(this.fileSize / 1024 / 1024).toFixed(2)} MB\n`);

    this.findComponents();
    this.checkNaming();
    this.checkStructure();
    this.checkForLargeGeometry();
  }

  // Find all products/components
  findComponents() {
    const productPattern = /#(\d+)=PRODUCT\('([^']+)'/g;
    let match;

    while ((match = productPattern.exec(this.content)) !== null) {
      this.components.push({
        id: match[1],
        name: match[2],
        recognized: this.isRecognized(match[2])
      });
    }

    console.log(`🔍 Found ${this.components.length} components:\n`);
    this.components.forEach((comp, idx) => {
      const status = comp.recognized ? '✅' : '⚠️';
      console.log(`   ${status} [${idx + 1}] ${comp.name} (ID: ${comp.id})`);
    });
  }

  // Check if component name is recognized by simulation
  isRecognized(name) {
    const patterns = {
      propeller: /propell/i,
      motor: /motor|engine|powerplant/i,
      wing: /wing(?!_tip)/i,
      fuselage: /fusel|body|fus/i,
      aileron: /aileron/i,
      rudder: /rudder|vertical.*fin/i,
      elevator: /elevator|horizontal.*stab/i,
      landing_gear: /landing.gear|gear|undercarriage|strut/i,
      wheel: /wheel|tire|tyre/i,
      stabilizer: /stabilizer|stab|fin/i,
      tail_wheel: /tail.wheel|tailwheel/i
    };

    return Object.values(patterns).some(pattern => pattern.test(name));
  }

  // Check component naming conventions
  checkNaming() {
    console.log(`\n📝 Naming Analysis:\n`);

    const unrecognized = this.components.filter(c => !c.recognized);
    
    if (unrecognized.length > 0) {
      console.log(`⚠️  ${unrecognized.length} unrecognized components:\n`);
      unrecognized.forEach(comp => {
        console.log(`   • "${comp.name}"`);
        const suggestion = this.suggestRename(comp.name);
        if (suggestion) {
          console.log(`     💡 Consider renaming to: "${suggestion}"`);
        }
      });
      this.warnings.push(`${unrecognized.length} components not recognized by simulation`);
    } else {
      console.log(`✅ All ${this.components.length} components recognized!`);
    }

    // Check for naming patterns
    const hasNumbers = this.components.filter(c => /\d{5,}/.test(c.name)).length;
    if (hasNumbers > 0) {
      this.suggestions.push(`Found ${hasNumbers} components with large ID numbers in names - consider simplifying`);
    }

    const hasSpecialChars = this.components.filter(c => /[^a-zA-Z0-9_\s-]/.test(c.name)).length;
    if (hasSpecialChars > 0) {
      this.warnings.push(`${hasSpecialChars} components have special characters - may cause issues`);
    }
  }

  // Suggest better names
  suggestRename(name) {
    const lower = name.toLowerCase();
    
    if (lower.includes('prop') || lower.includes('rotor')) return 'Propeller';
    if (lower.includes('motor') || lower.includes('engine')) return 'Motor';
    if (lower.includes('wing')) return 'Wing_Left';
    if (lower.includes('fus')) return 'Fuselage';
    if (lower.includes('ail')) return 'Aileron_Left';
    if (lower.includes('rud') || lower.includes('fin')) return 'Rudder';
    if (lower.includes('elev')) return 'Elevator';
    if (lower.includes('gear') || lower.includes('under')) return 'Landing_Gear';
    if (lower.includes('wheel') || lower.includes('tire')) return 'Wheel';
    if (lower.includes('tail')) return 'Tail_Wheel';
    if (lower.includes('stab')) return 'Stabilizer';
    
    return null;
  }

  // Check STEP file structure
  checkStructure() {
    console.log(`\n🏗️  Structure Analysis:\n`);

    // Check for required sections
    const hasHeader = /^HEADER;/m.test(this.content);
    const hasData = /^DATA;/m.test(this.content);
    const hasEndsec = /ENDSEC;/g.test(this.content);

    console.log(`   ${hasHeader ? '✅' : '❌'} HEADER section present`);
    console.log(`   ${hasData ? '✅' : '❌'} DATA section present`);
    console.log(`   ${hasEndsec ? '✅' : '❌'} ENDSEC sections present`);

    if (!hasHeader || !hasData) {
      this.issues.push('Missing required STEP sections (HEADER or DATA)');
    }

    // Count geometric elements
    const vertices = (this.content.match(/CARTESIAN_POINT\s*\(/g) || []).length;
    const edges = (this.content.match(/EDGE_LOOP\s*\(/g) || []).length;
    const faces = (this.content.match(/FACE\s*\(/g) || []).length;

    console.log(`\n   Geometric Elements:`);
    console.log(`   • Vertices: ${vertices.toLocaleString()}`);
    console.log(`   • Edges: ${edges.toLocaleString()}`);
    console.log(`   • Faces: ${faces.toLocaleString()}`);

    if (vertices > 500000) {
      this.warnings.push('High vertex count (>500K) may impact performance');
      this.suggestions.push('Consider reducing mesh density in CATIA before export');
    }
  }

  // Check for large geometry that might slow rendering
  checkForLargeGeometry() {
    console.log(`\n⚡ Performance Analysis:\n`);

    const fileSizeMB = this.fileSize / 1024 / 1024;
    
    if (fileSizeMB > 15) {
      console.log(`   ⚠️  Large file size: ${fileSizeMB.toFixed(1)} MB`);
      this.warnings.push(`File size is ${fileSizeMB.toFixed(1)} MB (over 15 MB threshold)`);
      this.suggestions.push('Optimize in CATIA: reduce surface density, remove internal geometry');
    } else if (fileSizeMB > 10) {
      console.log(`   ⚠️  Moderate file size: ${fileSizeMB.toFixed(1)} MB`);
      this.suggestions.push('File size is moderate - consider optimization if performance is an issue');
    } else {
      console.log(`   ✅ File size optimal: ${fileSizeMB.toFixed(1)} MB`);
    }

    // Check line count
    const lineCount = this.lines.length;
    if (lineCount > 200000) {
      console.log(`   ⚠️  High line count: ${lineCount.toLocaleString()} lines`);
      this.suggestions.push('High complexity STEP file - may need optimization');
    }
  }

  // Generate report
  report() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(60));

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ File is valid and ready for simulation!\n');
    } else {
      if (this.issues.length > 0) {
        console.log('\n❌ ISSUES (Must Fix):\n');
        this.issues.forEach(issue => console.log(`   • ${issue}`));
      }

      if (this.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS (Review):\n');
        this.warnings.forEach(warning => console.log(`   • ${warning}`));
      }
    }

    if (this.suggestions.length > 0) {
      console.log('\n💡 SUGGESTIONS:\n');
      this.suggestions.forEach(suggestion => console.log(`   • ${suggestion}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Summary:\n');
    console.log(`   Components: ${this.components.length}`);
    console.log(`   Recognized: ${this.components.filter(c => c.recognized).length}/${this.components.length}`);
    console.log(`   Issues: ${this.issues.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    console.log('='.repeat(60) + '\n');
  }

  // Generate rename commands for unrecognized components
  generateRenameCommands() {
    const unrecognized = this.components.filter(c => !c.recognized);
    
    if (unrecognized.length === 0) return;

    console.log('\n🔧 To Rename Unrecognized Components:\n');
    console.log('Execute these commands to rename components:');
    console.log(`cd ${path.dirname(this.filePath)}\n`);

    unrecognized.forEach(comp => {
      const suggestion = this.suggestRename(comp.name);
      if (suggestion) {
        console.log(`node step-editor.js rename "${comp.name}" "${suggestion}"`);
      }
    });
  }
}

// Main execution
const args = process.argv.slice(2);
const filePath = args[0] || './public/Udaan.stp';

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

const validator = new StepValidator(filePath);
validator.parse();
validator.report();
validator.generateRenameCommands();
