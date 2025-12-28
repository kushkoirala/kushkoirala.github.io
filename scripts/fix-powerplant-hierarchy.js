#!/usr/bin/env node
/**
 * Fix Powerplant Section Hierarchy
 * Add Subpart E back to the specification hierarchy with proper structure
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reqifFile = path.join(projectRoot, 'public', 'reqif', 'part25-certification.reqif');

const genId = () => Math.random().toString(16).slice(2, 14).toUpperCase();

// Powerplant structure matching 14 CFR Part 25 Subpart E
const powerplantStructure = {
  categories: [
    { id: 'CAT_PWR_GEN', title: 'General', cfrRange: '25.901-25.945', reqs: ['CERT-PWR-0101', 'CERT-PWR-0102', 'CERT-PWR-0103'] },
    { id: 'CAT_PWR_FUEL', title: 'Fuel System', cfrRange: '25.951-25.1001', reqs: ['CERT-PWR-0201', 'CERT-PWR-0202', 'CERT-PWR-0203'] },
    { id: 'CAT_PWR_OIL', title: 'Oil System', cfrRange: '25.1011-25.1027', reqs: ['CERT-PWR-0301', 'CERT-PWR-0302'] },
    { id: 'CAT_PWR_COOL', title: 'Cooling', cfrRange: '25.1041-25.1045', reqs: ['CERT-PWR-0401', 'CERT-PWR-0402'] },
    { id: 'CAT_PWR_IND', title: 'Induction System', cfrRange: '25.1091-25.1107', reqs: ['CERT-PWR-0501', 'CERT-PWR-0502'] },
    { id: 'CAT_PWR_EXH', title: 'Exhaust System', cfrRange: '25.1121-25.1127', reqs: ['CERT-PWR-0601', 'CERT-PWR-0602'] },
    { id: 'CAT_PWR_CTRL', title: 'Powerplant Controls and Accessories', cfrRange: '25.1141-25.1167', reqs: ['CERT-PWR-0701', 'CERT-PWR-0702', 'CERT-PWR-0703'] },
    { id: 'CAT_PWR_FIRE', title: 'Powerplant Fire Protection', cfrRange: '25.1181-25.1207', reqs: ['CERT-PWR-0801', 'CERT-PWR-0802', 'CERT-PWR-0803', 'CERT-PWR-0804', 'CERT-PWR-0805', 'CERT-PWR-0806'] },
  ],
};

// Derived shall counts per requirement (from the rebuild script)
const derivedShallCounts = {
  'CERT-PWR-0101': 3, 'CERT-PWR-0102': 4, 'CERT-PWR-0103': 3,
  'CERT-PWR-0201': 3, 'CERT-PWR-0202': 3, 'CERT-PWR-0203': 2,
  'CERT-PWR-0301': 2, 'CERT-PWR-0302': 3,
  'CERT-PWR-0401': 2, 'CERT-PWR-0402': 2,
  'CERT-PWR-0501': 3, 'CERT-PWR-0502': 3,
  'CERT-PWR-0601': 3, 'CERT-PWR-0602': 2,
  'CERT-PWR-0701': 3, 'CERT-PWR-0702': 3, 'CERT-PWR-0703': 3,
  'CERT-PWR-0801': 3, 'CERT-PWR-0802': 3, 'CERT-PWR-0803': 3, 'CERT-PWR-0804': 3, 'CERT-PWR-0805': 3, 'CERT-PWR-0806': 4,
};

async function main() {
  console.log('Reading ReqIF file...');
  let xml = await fs.readFile(reqifFile, 'utf8');

  // Build Subpart E hierarchy
  let subpartEHierarchy = `<ns0:SPEC-HIERARCHY IDENTIFIER="H_SUBPART_E" LONG-NAME="Subpart E - Powerplant (25.901 - 25.1207)"><ns0:OBJECT><ns0:SPEC-OBJECT-REF>SUBPART_E</ns0:SPEC-OBJECT-REF></ns0:OBJECT><ns0:CHILDREN>`;

  for (const cat of powerplantStructure.categories) {
    subpartEHierarchy += `<ns0:SPEC-HIERARCHY IDENTIFIER="H_${genId()}" LONG-NAME="${cat.title}"><ns0:OBJECT><ns0:SPEC-OBJECT-REF>${cat.id}</ns0:SPEC-OBJECT-REF></ns0:OBJECT><ns0:CHILDREN>`;

    for (const reqId of cat.reqs) {
      subpartEHierarchy += `<ns0:SPEC-HIERARCHY IDENTIFIER="H_${genId()}"><ns0:OBJECT><ns0:SPEC-OBJECT-REF>${reqId}</ns0:SPEC-OBJECT-REF></ns0:OBJECT><ns0:CHILDREN>`;

      const dsCount = derivedShallCounts[reqId] || 3;
      for (let i = 1; i <= dsCount; i++) {
        subpartEHierarchy += `<ns0:SPEC-HIERARCHY IDENTIFIER="H_${genId()}" LONG-NAME="Derived Shall ${i}"><ns0:OBJECT><ns0:SPEC-OBJECT-REF>${reqId}-DS${i}</ns0:SPEC-OBJECT-REF></ns0:OBJECT></ns0:SPEC-HIERARCHY>`;
      }

      subpartEHierarchy += `</ns0:CHILDREN></ns0:SPEC-HIERARCHY>`;
    }

    subpartEHierarchy += `</ns0:CHILDREN></ns0:SPEC-HIERARCHY>`;
  }

  subpartEHierarchy += `</ns0:CHILDREN></ns0:SPEC-HIERARCHY>`;

  // Find where Subpart F starts and insert Subpart E before it
  const subpartFPattern = /<ns0:SPEC-HIERARCHY IDENTIFIER="[^"]*" LONG-NAME="Subpart F/;

  if (xml.match(subpartFPattern)) {
    xml = xml.replace(subpartFPattern, subpartEHierarchy + '$&');
    console.log('Added Subpart E hierarchy before Subpart F');
  } else {
    console.log('Warning: Could not find Subpart F to insert before');
  }

  await fs.writeFile(reqifFile, xml, 'utf8');
  console.log('ReqIF file updated with Powerplant hierarchy');
}

main().catch((err) => {
  console.error('Failed to fix hierarchy:', err);
  process.exit(1);
});
