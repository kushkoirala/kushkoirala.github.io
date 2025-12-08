#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * STEP File Editor - Safely modify STEP files while maintaining integrity
 * Handles component renaming, property updates, and structure validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StepFileEditor {
  constructor(filePath) {
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');
    this.lines = this.content.split('\n');
    this.headerEndIdx = this.findSectionEnd('HEADER');
    this.dataStartIdx = this.findSectionStart('DATA');
    this.dataEndIdx = this.findSectionEnd('DATA');
  }

  findSectionStart(sectionName) {
    return this.lines.findIndex(line => line.trim() === `${sectionName};`);
  }

  findSectionEnd(sectionName) {
    const start = this.findSectionStart(sectionName);
    if (start === -1) return -1;
    
    for (let i = start + 1; i < this.lines.length; i++) {
      if (this.lines[i].trim() === 'ENDSEC;') {
        return i;
      }
    }
    return -1;
  }

  /**
   * Rename a component by its product name
   * Updates all references safely
   */
  renameComponent(oldName, newName) {
    console.log(`\nRenaming component: "${oldName}" → "${newName}"`);
    
    // Find the PRODUCT line with the old name
    const productPattern = new RegExp(`#(\\d+)=PRODUCT\\('${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
    let productId = null;
    let renameCount = 0;

    for (let i = this.dataStartIdx; i < this.dataEndIdx; i++) {
      const match = this.lines[i].match(productPattern);
      if (match) {
        productId = match[1];
        console.log(`  Found PRODUCT #${productId}`);
        
        // Replace the product name
        this.lines[i] = this.lines[i].replace(
          `PRODUCT('${oldName}'`,
          `PRODUCT('${newName}'`
        );
        renameCount++;
      }
    }

    if (renameCount > 0) {
      console.log(`  ✓ Successfully renamed ${renameCount} occurrence(s)`);
      return true;
    } else {
      console.log(`  ✗ Component "${oldName}" not found`);
      return false;
    }
  }

  /**
   * List all components in the file
   */
  listComponents() {
    const components = new Map();
    const productPattern = /#(\d+)=PRODUCT\('([^']+)'/g;
    let match;

    const dataSection = this.lines.slice(this.dataStartIdx, this.dataEndIdx).join('\n');
    
    while ((match = productPattern.exec(dataSection)) !== null) {
      const id = match[1];
      const name = match[2];
      components.set(id, name);
    }

    return components;
  }

  /**
   * Get the current integrity status
   */
  validateStructure() {
    const issues = [];

    // Check for HEADER and DATA sections
    if (this.findSectionStart('HEADER') === -1) issues.push('Missing HEADER section');
    if (this.findSectionStart('DATA') === -1) issues.push('Missing DATA section');

    // Check for matching ENDSEC statements
    const headerEnd = this.findSectionEnd('HEADER');
    const dataEnd = this.findSectionEnd('DATA');
    
    if (headerEnd === -1) issues.push('HEADER section not properly closed');
    if (dataEnd === -1) issues.push('DATA section not properly closed');

    // Check for ISO header
    if (!this.lines[0].includes('ISO-10303-21')) {
      issues.push('Missing ISO-10303-21 header');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Save the modified file with backup
   */
  save(outputPath = null) {
    const savePath = outputPath || this.filePath;
    const backupPath = `${this.filePath}.backup_${Date.now()}`;

    // Create backup
    fs.copyFileSync(this.filePath, backupPath);
    console.log(`\n✓ Backup created: ${backupPath}`);

    // Write modified content
    const newContent = this.lines.join('\n');
    fs.writeFileSync(savePath, newContent, 'utf-8');
    console.log(`✓ File saved: ${savePath}`);

    // Validate the saved file
    const validation = this.validateStructure();
    if (validation.valid) {
      console.log('✓ File structure validated successfully');
    } else {
      console.warn('⚠ Validation warnings:');
      validation.issues.forEach(issue => console.warn(`  - ${issue}`));
    }

    return backupPath;
  }

  /**
   * Print file statistics
   */
  getStats() {
    const components = this.listComponents();
    const lineCount = this.lines.length;
    const dataLineCount = this.dataEndIdx - this.dataStartIdx;

    return {
      totalLines: lineCount,
      headerLines: this.headerEndIdx + 1,
      dataLines: dataLineCount,
      componentCount: components.size,
      fileSizeMB: (fs.statSync(this.filePath).size / 1024 / 1024).toFixed(2)
    };
  }
}

// CLI Interface
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help') {
  console.log(`
STEP File Editor - Safely modify STEP files

Usage:
  node step-editor.js <command> [options]

Commands:
  list                    List all components in the file
  rename <old> <new>      Rename a component
  stats                   Show file statistics
  validate                Validate file structure
  help                    Show this help message

Examples:
  node step-editor.js list
  node step-editor.js rename "Propellor" "Main Propeller"
  node step-editor.js stats
  node step-editor.js validate
  `);
  process.exit(0);
}

const stepFile = path.join(__dirname, 'public/Udaan.stp');

if (!fs.existsSync(stepFile)) {
  console.error(`❌ STEP file not found: ${stepFile}`);
  process.exit(1);
}

const editor = new StepFileEditor(stepFile);

switch (args[0]) {
  case 'list': {
    const components = editor.listComponents();
    console.log('\n=== STEP File Components ===\n');
    let count = 0;
    components.forEach((name, id) => {
      console.log(`  #${id}: ${name}`);
      count++;
    });
    console.log(`\nTotal: ${count} components\n`);
    break;
  }

  case 'rename': {
    if (args.length < 3) {
      console.error('❌ Usage: rename <old_name> <new_name>');
      process.exit(1);
    }
    const oldName = args[1];
    const newName = args[2];
    
    const success = editor.renameComponent(oldName, newName);
    if (success) {
      editor.save();
      console.log('\n✓ Component renamed successfully\n');
    } else {
      console.log('\n❌ Rename failed\n');
      process.exit(1);
    }
    break;
  }

  case 'stats': {
    const stats = editor.getStats();
    console.log('\n=== STEP File Statistics ===\n');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log();
    break;
  }

  case 'validate': {
    const validation = editor.validateStructure();
    console.log('\n=== File Validation ===\n');
    if (validation.valid) {
      console.log('✓ File structure is valid\n');
    } else {
      console.log('❌ File structure issues found:\n');
      validation.issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
      console.log();
      process.exit(1);
    }
    break;
  }

  default: {
    console.error(`❌ Unknown command: ${args[0]}`);
    console.log('Run "node step-editor.js help" for usage information\n');
    process.exit(1);
  }
}
