#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reqifFile = path.join(projectRoot, 'public', 'reqif', 'part25-certification.reqif');

// Generate unique hex ID
const genId = () => Math.random().toString(16).slice(2, 14).toUpperCase();

// Additional Powerplant requirements based on 14 CFR Part 25 Subpart E
// Source: Cornell Law Institute - https://www.law.cornell.edu/cfr/text/14/part-25
const newPowerplantReqs = [
  {
    id: 'REQ_E_005',
    certId: 'CERT-PWR-005',
    cfr: '25.1091',
    title: 'Air Induction',
    text: 'The air induction system for each engine and auxiliary power unit must supply the air required by that engine and auxiliary power unit under each operating condition for which certification is requested, and the air for proper fuel metering and mixture distribution with the induction system valves in any position.',
    derivedShalls: [
      { id: 'DS1', text: '§25.1091(a): The air induction system for each engine must supply the air required by that engine under each operating condition for which certification is requested.' },
      { id: 'DS2', text: '§25.1091(b): Each reciprocating engine must have an alternate air source that prevents the entry of rain, ice, or any other foreign matter.' },
      { id: 'DS3', text: '§25.1091(d): For turbine engine powered airplanes, there must be means to prevent hazardous quantities of fuel leakage or overflow from drains, vents, or other components of flammable fluid systems from entering the engine intake system.' },
    ],
  },
  {
    id: 'REQ_E_006',
    certId: 'CERT-PWR-006',
    cfr: '25.1121',
    title: 'Exhaust System - General',
    text: 'Each exhaust system must ensure safe disposal of exhaust gases without fire hazard or carbon monoxide contamination in any personnel compartment.',
    derivedShalls: [
      { id: 'DS1', text: '§25.1121(a): Each exhaust system must ensure safe disposal of exhaust gases without fire hazard or carbon monoxide contamination in any personnel compartment.' },
      { id: 'DS2', text: '§25.1121(b): Each exhaust system part with surface hot enough to ignite flammable fluids or vapors must be located or shielded so that leakage from any flammable fluid system will not result in a fire caused by impingement of the leakage on any hot surface.' },
      { id: 'DS3', text: '§25.1121(e): No exhaust gases may discharge so as to cause a glare seriously affecting pilot vision at night.' },
    ],
  },
  {
    id: 'REQ_E_007',
    certId: 'CERT-PWR-007',
    cfr: '25.1141',
    title: 'Powerplant Controls: General',
    text: 'Each powerplant control must be located, arranged, and designed under §§25.777 through 25.781 and marked under §25.1555. Controls must not be in locations where they might be inadvertently operated.',
    derivedShalls: [
      { id: 'DS1', text: '§25.1141(a): Powerplant controls must not be located where persons entering, leaving, or moving normally in the cockpit might inadvertently operate them.' },
      { id: 'DS2', text: '§25.1141(b): Each flexible control must be approved or must be shown to be suitable for the particular application.' },
      { id: 'DS3', text: '§25.1141(d): Each control must be able to maintain any set position without constant attention by flight crewmembers and without creep due to control loads or vibration.' },
    ],
  },
  {
    id: 'REQ_E_008',
    certId: 'CERT-PWR-008',
    cfr: '25.1163',
    title: 'Powerplant Accessories',
    text: 'Each engine mounted accessory must be approved for mounting on the engine involved, use the provisions on the engine for mounting, and be sealed to prevent contamination of the engine oil system and the accessory system.',
    derivedShalls: [
      { id: 'DS1', text: '§25.1163(a)(1): Each engine mounted accessory must be approved for mounting on the engine involved.' },
      { id: 'DS2', text: '§25.1163(b): Electrical equipment subject to arcing or sparking must be installed to minimize the probability of contact with any flammable fluids or vapors that might be present in a free state.' },
      { id: 'DS3', text: '§25.1163(c): If continued rotation of an engine-driven cabin supercharger or of any remote accessory driven by the engine is hazardous if malfunctioning occurs, there must be means to prevent rotation without interfering with the continued operation of the engine.' },
    ],
  },
  {
    id: 'REQ_E_009',
    certId: 'CERT-PWR-009',
    cfr: '25.1181',
    title: 'Designated Fire Zones',
    text: 'Designated fire zones include the engine power section, engine accessory section, any complete powerplant compartment, any auxiliary power unit compartment, and any fuel-burning heater installation. Each designated fire zone must meet the requirements of §§25.863, 25.865, 25.867, 25.869, and 25.1185 through 25.1203.',
    derivedShalls: [
      { id: 'DS1', text: '§25.1181(a)(1): The engine power section is a designated fire zone.' },
      { id: 'DS2', text: '§25.1181(a)(4): Any auxiliary power unit compartment is a designated fire zone.' },
      { id: 'DS3', text: '§25.1181(b): Each designated fire zone must meet the requirements of §§25.863, 25.865, 25.867, 25.869, and 25.1185 through 25.1203.' },
    ],
  },
  {
    id: 'REQ_E_010',
    certId: 'CERT-PWR-010',
    cfr: '25.1197',
    title: 'Fire Extinguishing Agents',
    text: 'Fire extinguishing agents must be capable of extinguishing flames emanating from any burning of fluids or other combustible materials in the area protected by the agent and have thermal stability over the temperature range likely to be experienced in the compartment in which they are stored.',
    derivedShalls: [
      { id: 'DS1', text: '§25.1197(a): Fire extinguishing agents must be capable of extinguishing flames emanating from any burning of fluids or other combustible materials in the area protected by the agent.' },
      { id: 'DS2', text: '§25.1197(a): Fire extinguishing agents must have thermal stability over the temperature range likely to be experienced in the compartment in which they are stored.' },
      { id: 'DS3', text: '§25.1197(b): If any toxic extinguishing agent is used, there must be a means to prevent harmful concentrations of fluid or fluid vapors from entering any personnel compartment either because of leakage during normal operation of the airplane or because of discharging the fire extinguisher on the ground or in flight.' },
    ],
  },
  {
    id: 'REQ_E_011',
    certId: 'CERT-PWR-011',
    cfr: '25.1305',
    title: 'Powerplant Instruments',
    text: 'The following instruments are required for all airplanes: fuel pressure warning means, fuel quantity indicator, oil quantity indicator, oil pressure indicator and warning means, oil temperature indicator, fire-warning indicator, and augmentation liquid quantity indicator.',
    derivedShalls: [
      { id: 'DS1', text: '§25.1305(a)(1): A fuel pressure warning means for each engine, or a master warning means for all engines with provision for isolating the individual warning means from the master warning means.' },
      { id: 'DS2', text: '§25.1305(c)(1): For turbine engine powered airplanes, a gas temperature indicator for each engine.' },
      { id: 'DS3', text: '§25.1305(d)(3): For turbojet engine powered airplanes, an indicator to indicate rotor system unbalance.' },
    ],
  },
  {
    id: 'REQ_E_012',
    certId: 'CERT-PWR-012',
    cfr: '25.1521',
    title: 'Powerplant Limitations',
    text: 'The powerplant limitations prescribed must be established so that they do not exceed the corresponding limits for which the engines or propellers are type certificated and do not exceed the values on which compliance with any other requirement of this part is based.',
    derivedShalls: [
      { id: 'DS1', text: '§25.1521(a): The powerplant limitations must not exceed the corresponding limits for which the engines or propellers are type certificated.' },
      { id: 'DS2', text: '§25.1521(b): For reciprocating engine installations, operating limitations relating to maximum continuous and takeoff horsepower, RPM, manifold pressure, and time at rated power must be established.' },
      { id: 'DS3', text: '§25.1521(d): An ambient temperature limitation including limitations for winterization installations, if applicable, that meets the requirements of §25.1043(b) must be established.' },
    ],
  },
];

async function main() {
  console.log('Reading ReqIF file...');
  let xml = await fs.readFile(reqifFile, 'utf8');

  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

  // Build SPEC-OBJECTS for new requirements
  let specObjects = '';
  for (const req of newPowerplantReqs) {
    // Parent requirement
    specObjects += `
        <ns0:SPEC-OBJECT IDENTIFIER="${req.id}" LAST-CHANGE="${timestamp}">
          <ns0:VALUES>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${req.certId}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_ID</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${req.cfr}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_CFR</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-XHTML><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-XHTML-REF>ATTR_Text</ns0:ATTRIBUTE-DEFINITION-XHTML-REF></ns0:DEFINITION>
              <ns0:THE-VALUE><html:div><html:strong>${req.title}:</html:strong> ${req.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</html:div></ns0:THE-VALUE>
            </ns0:ATTRIBUTE-VALUE-XHTML>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="14 CFR Part 25"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Source</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="Safety-Critical"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Criticality</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-ENUMERATION>
              <ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF>ATTR_VerificationMethod</ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF></ns0:DEFINITION>
              <ns0:VALUES><ns0:ENUM-VALUE-REF>VM_Test</ns0:ENUM-VALUE-REF></ns0:VALUES>
            </ns0:ATTRIBUTE-VALUE-ENUMERATION>
            <ns0:ATTRIBUTE-VALUE-ENUMERATION>
              <ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF>ATTR_ComplianceStatus</ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF></ns0:DEFINITION>
              <ns0:VALUES><ns0:ENUM-VALUE-REF>CS_NotStarted</ns0:ENUM-VALUE-REF></ns0:VALUES>
            </ns0:ATTRIBUTE-VALUE-ENUMERATION>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Evidence</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_ResponsibleParty</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_TargetDate</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Notes</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
          </ns0:VALUES>
          <ns0:TYPE><ns0:SPEC-OBJECT-TYPE-REF>TYPE_Requirement</ns0:SPEC-OBJECT-TYPE-REF></ns0:TYPE>
        </ns0:SPEC-OBJECT>`;

    // Derived shalls
    for (const ds of req.derivedShalls) {
      const dsId = `${req.certId}-${ds.id}`;
      specObjects += `<ns0:SPEC-OBJECT IDENTIFIER="${dsId}" LAST-CHANGE="${timestamp}"><ns0:VALUES><ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${dsId.replace('DS', 'DS-')}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_ID</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING><ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${req.cfr}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_CFR</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING><ns0:ATTRIBUTE-VALUE-XHTML><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-XHTML-REF>ATTR_Text</ns0:ATTRIBUTE-DEFINITION-XHTML-REF></ns0:DEFINITION><ns0:THE-VALUE><html:div><html:p>${ds.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</html:p></html:div></ns0:THE-VALUE></ns0:ATTRIBUTE-VALUE-XHTML><ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="Derived from 14 CFR Part 25"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Source</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING><ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="Safety-Critical"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Criticality</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-ENUMERATION>
              <ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF>ATTR_VerificationMethod</ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF></ns0:DEFINITION>
              <ns0:VALUES><ns0:ENUM-VALUE-REF>VM_Test</ns0:ENUM-VALUE-REF></ns0:VALUES>
            </ns0:ATTRIBUTE-VALUE-ENUMERATION>
            <ns0:ATTRIBUTE-VALUE-ENUMERATION>
              <ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF>ATTR_ComplianceStatus</ns0:ATTRIBUTE-DEFINITION-ENUMERATION-REF></ns0:DEFINITION>
              <ns0:VALUES><ns0:ENUM-VALUE-REF>CS_NotStarted</ns0:ENUM-VALUE-REF></ns0:VALUES>
            </ns0:ATTRIBUTE-VALUE-ENUMERATION>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Evidence</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_ResponsibleParty</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_TargetDate</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=""><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Notes</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
          </ns0:VALUES><ns0:TYPE><ns0:SPEC-OBJECT-TYPE-REF>TYPE_Requirement</ns0:SPEC-OBJECT-TYPE-REF></ns0:TYPE></ns0:SPEC-OBJECT>`;
    }
  }

  // Insert SPEC-OBJECTS before </ns0:SPEC-OBJECTS>
  xml = xml.replace('</ns0:SPEC-OBJECTS>', specObjects + '\n      </ns0:SPEC-OBJECTS>');

  // Build hierarchy entries for new requirements
  let hierarchyEntries = '';
  for (const req of newPowerplantReqs) {
    hierarchyEntries += `<ns0:SPEC-HIERARCHY IDENTIFIER="H_DER_${genId()}"><ns0:OBJECT><ns0:SPEC-OBJECT-REF>${req.id}</ns0:SPEC-OBJECT-REF></ns0:OBJECT><ns0:CHILDREN>`;
    for (const ds of req.derivedShalls) {
      const dsId = `${req.certId}-${ds.id}`;
      hierarchyEntries += `<ns0:SPEC-HIERARCHY IDENTIFIER="H_DER_${genId()}" LONG-NAME="Derived Shall ${ds.id.replace('DS', '')}"><ns0:OBJECT><ns0:SPEC-OBJECT-REF>${dsId}</ns0:SPEC-OBJECT-REF></ns0:OBJECT></ns0:SPEC-HIERARCHY>`;
    }
    hierarchyEntries += '</ns0:CHILDREN></ns0:SPEC-HIERARCHY>';
  }

  // Find Subpart E hierarchy and add new children
  // Look for: <ns0:SPEC-OBJECT-REF>SUBPART_E</ns0:SPEC-OBJECT-REF></ns0:OBJECT><ns0:CHILDREN>
  // and insert after existing children before </ns0:CHILDREN></ns0:SPEC-HIERARCHY>

  // Find the Subpart E section in hierarchy
  const subpartEPattern = /(<ns0:SPEC-OBJECT-REF>SUBPART_E<\/ns0:SPEC-OBJECT-REF><\/ns0:OBJECT><ns0:CHILDREN>[\s\S]*?)((?:<\/ns0:CHILDREN><\/ns0:SPEC-HIERARCHY>)(?=<ns0:SPEC-HIERARCHY[^>]*>(?:<ns0:OBJECT><ns0:SPEC-OBJECT-REF>SUBPART_F|<\/ns0:CHILDREN>)))/;

  if (xml.match(subpartEPattern)) {
    xml = xml.replace(subpartEPattern, `$1${hierarchyEntries}$2`);
    console.log(`Added ${newPowerplantReqs.length} new Powerplant requirements with ${newPowerplantReqs.length * 3} derived shalls`);
  } else {
    // Alternative approach: find after REQ_E_004 derived shalls
    const afterE004Pattern = /(CERT-PWR-004-DS3<\/ns0:SPEC-OBJECT-REF><\/ns0:OBJECT><\/ns0:SPEC-HIERARCHY><\/ns0:CHILDREN><\/ns0:SPEC-HIERARCHY>)(<\/ns0:CHILDREN><\/ns0:SPEC-HIERARCHY>)/;
    if (xml.match(afterE004Pattern)) {
      xml = xml.replace(afterE004Pattern, `$1${hierarchyEntries}$2`);
      console.log(`Added ${newPowerplantReqs.length} new Powerplant requirements with ${newPowerplantReqs.length * 3} derived shalls`);
    } else {
      console.log('Warning: Could not find insertion point for hierarchy. Requirements added but hierarchy not updated.');
    }
  }

  await fs.writeFile(reqifFile, xml, 'utf8');
  console.log('ReqIF file updated successfully');
}

main().catch((err) => {
  console.error('Failed to expand Powerplant section:', err);
  process.exit(1);
});
