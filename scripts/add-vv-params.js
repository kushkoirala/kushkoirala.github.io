#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reqifFile = path.join(projectRoot, 'public', 'reqif', 'part25-certification.reqif');

// Map requirement types to default verification methods
const reqTypeToMethod = {
  'CERT-GEN': 'Analysis',          // General - typically analysis
  'CERT-FLT': 'Test',               // Flight - typically flight test
  'CERT-STR': 'Analysis/Test',      // Structure - analysis and test
  'CERT-DES': 'Inspection',         // Design - inspection
  'CERT-PWR': 'Test',               // Powerplant - engine tests
  'CERT-EQP': 'Test',               // Equipment - equipment tests
  'CERT-OPS': 'Demonstration',      // Operations - demonstration
  'CERT-ELE': 'Test',               // Electrical - electrical tests
  'CERT-MIS': 'Analysis'            // Miscellaneous - analysis
};

async function main() {
  console.log('Reading ReqIF file...');
  let xml = await fs.readFile(reqifFile, 'utf8');

  // Step 1: Add new datatypes for V&V enumeration
  const newDatatypes = `
        <ns0:DATATYPE-DEFINITION-ENUMERATION IDENTIFIER="DT_VerificationMethod" LONG-NAME="Verification Method">
          <ns0:SPECIFIED-VALUES>
            <ns0:ENUM-VALUE IDENTIFIER="VM_Analysis" LONG-NAME="Analysis"/>
            <ns0:ENUM-VALUE IDENTIFIER="VM_Test" LONG-NAME="Test"/>
            <ns0:ENUM-VALUE IDENTIFIER="VM_Inspection" LONG-NAME="Inspection"/>
            <ns0:ENUM-VALUE IDENTIFIER="VM_Demonstration" LONG-NAME="Demonstration"/>
            <ns0:ENUM-VALUE IDENTIFIER="VM_AnalysisTest" LONG-NAME="Analysis/Test"/>
          </ns0:SPECIFIED-VALUES>
        </ns0:DATATYPE-DEFINITION-ENUMERATION>
        <ns0:DATATYPE-DEFINITION-ENUMERATION IDENTIFIER="DT_ComplianceStatus" LONG-NAME="Compliance Status">
          <ns0:SPECIFIED-VALUES>
            <ns0:ENUM-VALUE IDENTIFIER="CS_NotStarted" LONG-NAME="Not Started"/>
            <ns0:ENUM-VALUE IDENTIFIER="CS_InProgress" LONG-NAME="In Progress"/>
            <ns0:ENUM-VALUE IDENTIFIER="CS_Compliant" LONG-NAME="Compliant"/>
            <ns0:ENUM-VALUE IDENTIFIER="CS_NonCompliant" LONG-NAME="Non-Compliant"/>
            <ns0:ENUM-VALUE IDENTIFIER="CS_NotApplicable" LONG-NAME="Not Applicable"/>
          </ns0:SPECIFIED-VALUES>
        </ns0:DATATYPE-DEFINITION-ENUMERATION>`;

  // Insert datatypes before </ns0:DATATYPES>
  xml = xml.replace('</ns0:DATATYPES>', newDatatypes + '\n      </ns0:DATATYPES>');
  console.log('Added V&V enumeration datatypes');

  // Step 2: Add new attribute definitions to TYPE_Requirement
  const newAttributes = `
            <ns0:ATTRIBUTE-DEFINITION-ENUMERATION IDENTIFIER="ATTR_VerificationMethod" LONG-NAME="Verification Method">
              <ns0:TYPE><ns0:DATATYPE-DEFINITION-ENUMERATION-REF>DT_VerificationMethod</ns0:DATATYPE-DEFINITION-ENUMERATION-REF></ns0:TYPE>
            </ns0:ATTRIBUTE-DEFINITION-ENUMERATION>
            <ns0:ATTRIBUTE-DEFINITION-ENUMERATION IDENTIFIER="ATTR_ComplianceStatus" LONG-NAME="Compliance Status">
              <ns0:TYPE><ns0:DATATYPE-DEFINITION-ENUMERATION-REF>DT_ComplianceStatus</ns0:DATATYPE-DEFINITION-ENUMERATION-REF></ns0:TYPE>
            </ns0:ATTRIBUTE-DEFINITION-ENUMERATION>
            <ns0:ATTRIBUTE-DEFINITION-STRING IDENTIFIER="ATTR_Evidence" LONG-NAME="Evidence/Artifact">
              <ns0:TYPE><ns0:DATATYPE-DEFINITION-STRING-REF>DT_String</ns0:DATATYPE-DEFINITION-STRING-REF></ns0:TYPE>
            </ns0:ATTRIBUTE-DEFINITION-STRING>
            <ns0:ATTRIBUTE-DEFINITION-STRING IDENTIFIER="ATTR_ResponsibleParty" LONG-NAME="Responsible Party">
              <ns0:TYPE><ns0:DATATYPE-DEFINITION-STRING-REF>DT_String</ns0:DATATYPE-DEFINITION-STRING-REF></ns0:TYPE>
            </ns0:ATTRIBUTE-DEFINITION-STRING>
            <ns0:ATTRIBUTE-DEFINITION-STRING IDENTIFIER="ATTR_TargetDate" LONG-NAME="Target Date">
              <ns0:TYPE><ns0:DATATYPE-DEFINITION-STRING-REF>DT_String</ns0:DATATYPE-DEFINITION-STRING-REF></ns0:TYPE>
            </ns0:ATTRIBUTE-DEFINITION-STRING>
            <ns0:ATTRIBUTE-DEFINITION-STRING IDENTIFIER="ATTR_Notes" LONG-NAME="V&amp;V Notes">
              <ns0:TYPE><ns0:DATATYPE-DEFINITION-STRING-REF>DT_String</ns0:DATATYPE-DEFINITION-STRING-REF></ns0:TYPE>
            </ns0:ATTRIBUTE-DEFINITION-STRING>`;

  // Find the TYPE_Requirement SPEC-OBJECT-TYPE and add attributes before its closing tag
  const typeReqPattern = /(<ns0:SPEC-OBJECT-TYPE IDENTIFIER="TYPE_Requirement"[^>]*>[\s\S]*?<ns0:SPEC-ATTRIBUTES>)([\s\S]*?)(<\/ns0:SPEC-ATTRIBUTES>)/;
  xml = xml.replace(typeReqPattern, (match, start, existing, end) => {
    return start + existing + newAttributes + '\n          ' + end;
  });
  console.log('Added V&V attribute definitions to TYPE_Requirement');

  // Step 3: Add V&V parameter values to each requirement (SPEC-OBJECT with TYPE_Requirement)
  // Match requirements by their IDENTIFIER pattern
  const reqPattern = /(<ns0:SPEC-OBJECT IDENTIFIER="(CERT-[^"]+|REQ_[^"]+)"[^>]*>[\s\S]*?<ns0:VALUES>)([\s\S]*?)(<\/ns0:VALUES>)/g;

  let updateCount = 0;
  xml = xml.replace(reqPattern, (match, start, id, values, end) => {
    // Skip if already has V&V attributes
    if (values.includes('ATTR_VerificationMethod')) {
      return match;
    }

    // Determine verification method based on requirement type
    let method = 'Analysis';
    for (const [prefix, defaultMethod] of Object.entries(reqTypeToMethod)) {
      if (id.startsWith(prefix)) {
        method = defaultMethod;
        break;
      }
    }

    // Map method to enum value ID
    const methodMap = {
      'Analysis': 'VM_Analysis',
      'Test': 'VM_Test',
      'Inspection': 'VM_Inspection',
      'Demonstration': 'VM_Demonstration',
      'Analysis/Test': 'VM_AnalysisTest'
    };

    const vvValues = `
            <ns0:ATTRIBUTE-VALUE-ENUMERATION>
              <ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF>ATTR_VerificationMethod</ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF></ns0:DEFINITION>
              <ns0:VALUES><ns0:ENUM-VALUE-REF>${methodMap[method]}</ns0:ENUM-VALUE-REF></ns0:VALUES>
            </ns0:ATTRIBUTE-VALUE-ENUMERATION>
            <ns0:ATTRIBUTE-VALUE-ENUMERATION>
              <ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF>ATTR_ComplianceStatus</ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF></ns0:DEFINITION>
              <ns0:VALUES><ns0:ENUM-VALUE-REF>CS_NotStarted</ns0:ENUM-VALUE-REF></ns0:VALUES>
            </ns0:ATTRIBUTE-VALUE-ENUMERATION>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Evidence</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_ResponsibleParty</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_TargetDate</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Notes</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>`;

    updateCount++;
    return start + values + vvValues + '\n          ' + end;
  });

  console.log(`Added V&V parameters to ${updateCount} requirements`);

  // Write updated file
  await fs.writeFile(reqifFile, xml, 'utf8');
  console.log('ReqIF file updated successfully');
}

main().catch((err) => {
  console.error('Failed to add V&V parameters:', err);
  process.exit(1);
});
