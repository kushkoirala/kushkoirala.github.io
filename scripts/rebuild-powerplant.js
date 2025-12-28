#!/usr/bin/env node
/**
 * Rebuild Powerplant Section (Subpart E) with proper 14 CFR Part 25 structure
 * Source: Cornell Law Institute - https://www.law.cornell.edu/cfr/text/14/part-25/subpart-E
 *
 * This script:
 * 1. Removes existing CERT-PWR requirements
 * 2. Adds properly structured Powerplant categories and requirements matching CFR hierarchy
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reqifFile = path.join(projectRoot, 'public', 'reqif', 'part25-certification.reqif');

const genId = () => Math.random().toString(16).slice(2, 14).toUpperCase();
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Powerplant structure matching 14 CFR Part 25 Subpart E
// Source: Cornell Law - https://www.law.cornell.edu/cfr/text/14/part-25/subpart-E
const powerplantStructure = {
  categories: [
    {
      id: 'CAT_PWR_GEN',
      title: 'General',
      cfrRange: '25.901-25.945',
      requirements: [
        {
          cfr: '25.901',
          title: 'Installation',
          text: 'For the purpose of this part, the airplane powerplant installation includes each component that is necessary for propulsion, affects the control of the major propulsive units, or affects the safety of the major propulsive units between normal inspections or overhauls.',
          derivedShalls: [
            { id: 'DS1', text: '§25.901(a): The powerplant installation includes each component necessary for propulsion that affects control of major propulsive units or affects safety between normal inspections or overhauls.' },
            { id: 'DS2', text: '§25.901(b): Each powerplant and auxiliary power unit installation must be constructed and arranged to ensure safe continued operation and accessibility for necessary inspections and maintenance.' },
            { id: 'DS3', text: '§25.901(c): Powerplant and auxiliary power unit installations must comply with §25.1309 requirements for equipment, systems, and installations.' },
          ],
        },
        {
          cfr: '25.903',
          title: 'Engines',
          text: 'Each engine must have a type certificate and meet applicable requirements. The powerplants must be arranged and isolated from each other to allow operation so that failure or malfunction of any engine will not prevent continued safe operation of remaining engines.',
          derivedShalls: [
            { id: 'DS1', text: '§25.903(a): Each engine must have a type certificate and meet the applicable requirements of part 34 of this chapter.' },
            { id: 'DS2', text: '§25.903(b): The powerplants must be arranged and isolated from each other to allow operation so that failure or malfunction of any engine will not prevent continued safe operation of remaining engines.' },
            { id: 'DS3', text: '§25.903(d): For turbine engine installations, design precautions must be taken to minimize the hazards to the airplane in the event of an engine rotor failure or fire that burns through the engine case.' },
            { id: 'DS4', text: '§25.903(e): Means must be provided for restarting any engine in flight. The altitude and airspeed envelope for engine restart must be established.' },
          ],
        },
        {
          cfr: '25.905',
          title: 'Propellers',
          text: 'Each propeller must have a type certificate. Engine power and propeller shaft rotational speed may not exceed the limits for which the propeller is certificated.',
          derivedShalls: [
            { id: 'DS1', text: '§25.905(a): Each propeller must have a type certificate.' },
            { id: 'DS2', text: '§25.905(b): Engine power and propeller shaft rotational speed may not exceed the limits for which the propeller is certificated.' },
            { id: 'DS3', text: '§25.905(d): Design precautions must be taken to minimize the hazards to the airplane in the event a propeller blade fails or is released by a hub failure.' },
          ],
        },
      ],
    },
    {
      id: 'CAT_PWR_FUEL',
      title: 'Fuel System',
      cfrRange: '25.951-25.1001',
      requirements: [
        {
          cfr: '25.951',
          title: 'Fuel System General',
          text: 'Each fuel system must be constructed and arranged to ensure a flow of fuel at a rate and pressure established for proper engine and auxiliary power unit functioning under each likely operating condition.',
          derivedShalls: [
            { id: 'DS1', text: '§25.951(a): Each fuel system must be constructed and arranged to ensure fuel flow at a rate and pressure established for proper engine functioning under each likely operating condition.' },
            { id: 'DS2', text: '§25.951(b): Each fuel system must be arranged so that no air introduced into the system will result in flameout for turbine engines or power interruption for more than 20 seconds for reciprocating engines.' },
            { id: 'DS3', text: '§25.951(c): Each turbine engine fuel system must be capable of sustained operation with fuel initially saturated with water at 80°F and cooled to the most critical icing condition.' },
          ],
        },
        {
          cfr: '25.963',
          title: 'Fuel Tanks: General',
          text: 'Each fuel tank must be able to withstand the applicable pressure tests without failure or leakage. Each fuel tank must have adequate structural strength to withstand applicable loads.',
          derivedShalls: [
            { id: 'DS1', text: '§25.963(a): Each fuel tank must be able to withstand, without failure, the vibration, inertia, fluid, and structural loads to which it may be subjected in operation.' },
            { id: 'DS2', text: '§25.963(b): Flexible fuel tank liners must be approved or must be shown to be suitable for the particular application.' },
            { id: 'DS3', text: '§25.963(d): Each fuel tank must be isolated from personnel compartments by fume-proof and fuel-proof enclosures.' },
          ],
        },
        {
          cfr: '25.981',
          title: 'Fuel Tank Explosion Prevention',
          text: 'Fuel tank flammability must be reduced by an acceptable Ignition Mitigation Means (IMM) or Flammability Reduction Means (FRM), or fuel tank must be located to minimize development of flammable vapors.',
          derivedShalls: [
            { id: 'DS1', text: '§25.981(a): No ignition source may be present at each point in the fuel tank or fuel tank system where catastrophic failure could occur due to ignition of fuel or vapors.' },
            { id: 'DS2', text: '§25.981(b): Except as provided, no component whose failure could cause an ignition source may be installed in a fuel tank unless proven to not create a hazard under failure conditions.' },
          ],
        },
      ],
    },
    {
      id: 'CAT_PWR_OIL',
      title: 'Oil System',
      cfrRange: '25.1011-25.1027',
      requirements: [
        {
          cfr: '25.1011',
          title: 'Oil System General',
          text: 'Each engine must have an independent oil system that can supply it with an appropriate quantity of oil at a temperature not above that safe for continuous operation.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1011(a): Each engine must have an independent oil system that can supply it with an appropriate quantity of oil at a temperature not above that safe for continuous operation.' },
            { id: 'DS2', text: '§25.1011(b): The usable oil tank capacity may not be less than the product of the endurance of the airplane under critical operating conditions and the maximum allowable oil consumption of the engine.' },
          ],
        },
        {
          cfr: '25.1013',
          title: 'Oil Tanks',
          text: 'Each oil tank must be designed and installed to withstand applicable loads and have adequate structural strength. Oil tanks must allow proper draining and filling.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1013(a): Each oil tank must have an expansion space of not less than 10 percent of the tank capacity.' },
            { id: 'DS2', text: '§25.1013(b): Each oil tank must be vented from the top part of the expansion space.' },
            { id: 'DS3', text: '§25.1013(c): Each oil tank must provide an oil filler that is accessible, marked with contents, and has a closure that prevents loss of oil.' },
          ],
        },
      ],
    },
    {
      id: 'CAT_PWR_COOL',
      title: 'Cooling',
      cfrRange: '25.1041-25.1045',
      requirements: [
        {
          cfr: '25.1041',
          title: 'Cooling General',
          text: 'The powerplant and auxiliary power unit cooling provisions must be able to maintain the temperatures of powerplant components, engine fluids, and auxiliary power unit components and fluids within the temperature limits established for these components and fluids.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1041: Powerplant cooling provisions must maintain temperatures of powerplant components and fluids within established limits under ground, water, and flight operating conditions.' },
            { id: 'DS2', text: '§25.1041: Cooling must be maintained after normal engine or auxiliary power unit shutdown.' },
          ],
        },
        {
          cfr: '25.1043',
          title: 'Cooling Tests',
          text: 'Cooling tests must be conducted to show compliance with cooling requirements. Compliance must be shown by flight test or analysis.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1043(a): Cooling tests must be conducted with the airplane in the configuration that is critical for cooling.' },
            { id: 'DS2', text: '§25.1043(b): Maximum ambient atmospheric temperature at which compliance has been established must be determined.' },
          ],
        },
      ],
    },
    {
      id: 'CAT_PWR_IND',
      title: 'Induction System',
      cfrRange: '25.1091-25.1107',
      requirements: [
        {
          cfr: '25.1091',
          title: 'Air Induction',
          text: 'The air induction system for each engine and auxiliary power unit must supply the air required by that engine and auxiliary power unit under each operating condition for which certification is requested.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1091(a): The air induction system must supply the air required by each engine under each operating condition for which certification is requested.' },
            { id: 'DS2', text: '§25.1091(b): Each reciprocating engine must have an alternate air source that prevents the entry of rain, ice, or any other foreign matter.' },
            { id: 'DS3', text: '§25.1091(d): For turbine engine powered airplanes, there must be means to prevent hazardous quantities of fuel leakage from entering the engine intake system.' },
          ],
        },
        {
          cfr: '25.1093',
          title: 'Induction System Icing Protection',
          text: 'Each reciprocating engine air induction system must have means to prevent and eliminate icing. Turbine engines must operate throughout their flight power range in icing conditions without adverse effects.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1093(a): Each reciprocating engine air induction system must have means to prevent and eliminate icing with adequate preheater capacity.' },
            { id: 'DS2', text: '§25.1093(b): Turbine engines with icing protection must operate throughout their flight power range in specified icing conditions without ice accumulation causing adverse engine operation.' },
            { id: 'DS3', text: '§25.1093(b)(2): Turbine engines must operate at ground idle for 30 minutes minimum on a concrete surface under specified icing conditions.' },
          ],
        },
      ],
    },
    {
      id: 'CAT_PWR_EXH',
      title: 'Exhaust System',
      cfrRange: '25.1121-25.1127',
      requirements: [
        {
          cfr: '25.1121',
          title: 'Exhaust System General',
          text: 'Each exhaust system must ensure safe disposal of exhaust gases without fire hazard or carbon monoxide contamination in any personnel compartment.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1121(a): Each exhaust system must ensure safe disposal of exhaust gases without fire hazard or carbon monoxide contamination in any personnel compartment.' },
            { id: 'DS2', text: '§25.1121(b): Each exhaust system part with surface hot enough to ignite flammable fluids must be located or shielded to prevent fires from leakage.' },
            { id: 'DS3', text: '§25.1121(e): No exhaust gases may discharge so as to cause a glare seriously affecting pilot vision at night.' },
          ],
        },
        {
          cfr: '25.1123',
          title: 'Exhaust Piping',
          text: 'Exhaust piping must be supported and designed to withstand vibration, inertia, and other loads. Exhaust pipes must be separated from other components to prevent damage.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1123(a): Exhaust piping must be heat and corrosion resistant and must have provisions to prevent failure due to expansion.' },
            { id: 'DS2', text: '§25.1123(b): Exhaust piping connected to components between which relative motion could exist must have means for flexibility.' },
          ],
        },
      ],
    },
    {
      id: 'CAT_PWR_CTRL',
      title: 'Powerplant Controls and Accessories',
      cfrRange: '25.1141-25.1167',
      requirements: [
        {
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
          cfr: '25.1143',
          title: 'Engine Controls',
          text: 'There must be a separate power or thrust control for each engine. Power and thrust controls must provide individual and combined operation of all engines.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1143(a): There must be a separate power or thrust control for each engine.' },
            { id: 'DS2', text: '§25.1143(c): Each power and thrust control must provide a positive and immediately responsive means of controlling its engine.' },
            { id: 'DS3', text: '§25.1143(e): If a power or thrust control incorporates a fuel shutoff feature, it must have a means to prevent inadvertent movement to the shutoff position.' },
          ],
        },
        {
          cfr: '25.1163',
          title: 'Powerplant Accessories',
          text: 'Each engine mounted accessory must be approved for mounting on the engine involved, use the provisions on the engine for mounting, and be sealed to prevent contamination.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1163(a): Each engine mounted accessory must be approved for mounting on the engine involved and use the provisions on the engine for mounting.' },
            { id: 'DS2', text: '§25.1163(b): Electrical equipment subject to arcing or sparking must be installed to minimize the probability of contact with any flammable fluids or vapors.' },
            { id: 'DS3', text: '§25.1163(c): If continued rotation of any engine-driven accessory is hazardous if malfunctioning occurs, there must be means to prevent rotation without interfering with engine operation.' },
          ],
        },
      ],
    },
    {
      id: 'CAT_PWR_FIRE',
      title: 'Powerplant Fire Protection',
      cfrRange: '25.1181-25.1207',
      requirements: [
        {
          cfr: '25.1181',
          title: 'Designated Fire Zones',
          text: 'Designated fire zones include the engine power section, engine accessory section, any complete powerplant compartment, any auxiliary power unit compartment, and combustion equipment installations.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1181(a)(1): The engine power section is a designated fire zone.' },
            { id: 'DS2', text: '§25.1181(a)(4): Any auxiliary power unit compartment is a designated fire zone.' },
            { id: 'DS3', text: '§25.1181(b): Each designated fire zone must meet the requirements of §§25.863, 25.865, 25.867, 25.869, and 25.1185 through 25.1203.' },
          ],
        },
        {
          cfr: '25.1183',
          title: 'Flammable Fluid-Carrying Components',
          text: 'Lines, fittings, and components carrying flammable fluids in designated fire zones must be fire resistant. Flammable fluid tanks and supports must be fireproof or enclosed by fireproof shielding.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1183(a): Lines, fittings, and components carrying flammable fluids in designated fire zones must be at least fire resistant.' },
            { id: 'DS2', text: '§25.1183(a): Flammable fluid tanks and supports in designated fire zones must be fireproof or enclosed by a fireproof shield.' },
            { id: 'DS3', text: '§25.1183(c): All components in designated fire zones must be fireproof if their exposure to fire could cause fire spreading to other airplane regions.' },
          ],
        },
        {
          cfr: '25.1191',
          title: 'Firewalls',
          text: 'Each engine, auxiliary power unit, fuel-burning heater, and combustion equipment must be isolated from the rest of the airplane by firewalls, shrouds, or equivalent means.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1191(a): Each engine and auxiliary power unit must be isolated from the rest of the airplane by firewalls, shrouds, or equivalent means.' },
            { id: 'DS2', text: '§25.1191(b)(1): Each firewall and shroud must be fireproof.' },
            { id: 'DS3', text: '§25.1191(b)(2): Each firewall must be constructed so that no hazardous quantity of air, fluid, or flame can pass from the compartment to other parts of the airplane.' },
          ],
        },
        {
          cfr: '25.1195',
          title: 'Fire Extinguishing Systems',
          text: 'Each designated fire zone must have a fire extinguisher system, except for certain turbine engine sections. Agent quantity, discharge rate, and distribution must adequately extinguish fires.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1195(a): Except for combustor, turbine, and tail pipe sections of turbine engines, each designated fire zone must have a fire extinguisher system.' },
            { id: 'DS2', text: '§25.1195(b): The fire extinguishing system, agent quantity, rate of discharge, and distribution must be adequate to extinguish fires.' },
            { id: 'DS3', text: '§25.1195(b): Other than for APUs and heaters, each fire zone must have two discharges producing adequate agent concentration.' },
          ],
        },
        {
          cfr: '25.1197',
          title: 'Fire Extinguishing Agents',
          text: 'Fire extinguishing agents must be capable of extinguishing flames from burning fluids in the protected area and have thermal stability over the temperature range experienced in storage compartments.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1197(a): Fire extinguishing agents must be capable of extinguishing flames emanating from any burning of fluids or combustible materials in the area protected.' },
            { id: 'DS2', text: '§25.1197(a): Fire extinguishing agents must have thermal stability over the temperature range likely to be experienced in the storage compartment.' },
            { id: 'DS3', text: '§25.1197(b): If toxic extinguishing agents are used, there must be means to prevent harmful concentrations from entering personnel compartments.' },
          ],
        },
        {
          cfr: '25.1203',
          title: 'Fire Detector System',
          text: 'Fire or overheat detectors must be installed in designated fire zones and turbine engine compartment sections to ensure prompt detection of fire.',
          derivedShalls: [
            { id: 'DS1', text: '§25.1203(a): Fire or overheat detectors must be provided for each designated fire zone and installed to ensure prompt detection of fire.' },
            { id: 'DS2', text: '§25.1203(b): Each fire detector system must warn the crew if a sensor or wiring is severed at any point, unless system continues to function.' },
            { id: 'DS3', text: '§25.1203(c): No fire or overheat detector may be affected by any oil, water, other fluids or fumes that might be present.' },
            { id: 'DS4', text: '§25.1203(e): Components of each fire detector system in a fire zone must be fire-resistant.' },
          ],
        },
      ],
    },
  ],
};

async function main() {
  console.log('Reading ReqIF file...');
  let xml = await fs.readFile(reqifFile, 'utf8');
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

  // Step 1: Remove existing CERT-PWR requirements (but keep SUBPART_E header)
  console.log('Removing existing Powerplant requirements...');

  // Remove SPEC-OBJECTS with CERT-PWR or REQ_E_ identifiers
  const specObjPattern = /<ns0:SPEC-OBJECT IDENTIFIER="(REQ_E_\d+|CERT-PWR-[^"]+)"[\s\S]*?<\/ns0:SPEC-OBJECT>/g;
  let removed = 0;
  xml = xml.replace(specObjPattern, () => { removed++; return ''; });
  console.log(`Removed ${removed} SPEC-OBJECTS`);

  // Remove hierarchy entries for REQ_E_
  const hierPattern = /<ns0:SPEC-HIERARCHY IDENTIFIER="H_[^"]*"[^>]*>[\s\S]*?<ns0:SPEC-OBJECT-REF>REQ_E_\d+<\/ns0:SPEC-OBJECT-REF>[\s\S]*?<\/ns0:SPEC-HIERARCHY>/g;
  xml = xml.replace(hierPattern, '');

  // Remove hierarchy entries for CERT-PWR-
  const hierPattern2 = /<ns0:SPEC-HIERARCHY IDENTIFIER="H_[^"]*"[^>]*>[\s\S]*?<ns0:SPEC-OBJECT-REF>CERT-PWR-[^<]+<\/ns0:SPEC-OBJECT-REF>[\s\S]*?<\/ns0:SPEC-HIERARCHY>/g;
  xml = xml.replace(hierPattern2, '');

  // Clean up empty CHILDREN tags
  xml = xml.replace(/<ns0:CHILDREN>\s*<\/ns0:CHILDREN>/g, '');

  // Step 2: Build new SPEC-OBJECTS
  console.log('Building new Powerplant structure...');
  let specObjects = '';
  let reqCount = 0;
  let dsCount = 0;
  let catNum = 0;

  for (const cat of powerplantStructure.categories) {
    catNum++;

    // Add category SPEC-OBJECT
    specObjects += `
        <ns0:SPEC-OBJECT IDENTIFIER="${cat.id}" LAST-CHANGE="${timestamp}">
          <ns0:VALUES>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${cat.title}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_ID</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${cat.cfrRange}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_CFR</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-XHTML><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-XHTML-REF>ATTR_Text</ns0:ATTRIBUTE-DEFINITION-XHTML-REF></ns0:DEFINITION>
              <ns0:THE-VALUE><html:div><html:strong>${escapeXml(cat.title)}</html:strong> - 14 CFR ${cat.cfrRange}</html:div></ns0:THE-VALUE>
            </ns0:ATTRIBUTE-VALUE-XHTML>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="14 CFR Part 25"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Source</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
          </ns0:VALUES>
          <ns0:TYPE><ns0:SPEC-OBJECT-TYPE-REF>TYPE_Heading</ns0:SPEC-OBJECT-TYPE-REF></ns0:TYPE>
        </ns0:SPEC-OBJECT>`;

    let reqNum = 0;
    for (const req of cat.requirements) {
      reqNum++;
      reqCount++;
      const reqId = `CERT-PWR-${String(catNum).padStart(2, '0')}${String(reqNum).padStart(2, '0')}`;

      // Parent requirement
      specObjects += `
        <ns0:SPEC-OBJECT IDENTIFIER="${reqId}" LAST-CHANGE="${timestamp}">
          <ns0:VALUES>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${reqId}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_ID</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${req.cfr}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_CFR</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-XHTML><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-XHTML-REF>ATTR_Text</ns0:ATTRIBUTE-DEFINITION-XHTML-REF></ns0:DEFINITION>
              <ns0:THE-VALUE><html:div><html:strong>§${req.cfr} ${escapeXml(req.title)}:</html:strong> ${escapeXml(req.text)}</html:div></ns0:THE-VALUE>
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
        dsCount++;
        const dsId = `${reqId}-${ds.id}`;
        specObjects += `
        <ns0:SPEC-OBJECT IDENTIFIER="${dsId}" LAST-CHANGE="${timestamp}">
          <ns0:VALUES>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${dsId.replace('DS', 'DS-')}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_ID</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="${req.cfr}"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_CFR</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
            <ns0:ATTRIBUTE-VALUE-XHTML><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-XHTML-REF>ATTR_Text</ns0:ATTRIBUTE-DEFINITION-XHTML-REF></ns0:DEFINITION>
              <ns0:THE-VALUE><html:div><html:p>${escapeXml(ds.text)}</html:p></html:div></ns0:THE-VALUE>
            </ns0:ATTRIBUTE-VALUE-XHTML>
            <ns0:ATTRIBUTE-VALUE-STRING THE-VALUE="Derived from 14 CFR Part 25"><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_Source</ns0:ATTRIBUTE-DEFINITION-STRING-REF></ns0:DEFINITION></ns0:ATTRIBUTE-VALUE-STRING>
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
      }
    }
  }

  // Insert SPEC-OBJECTS before </ns0:SPEC-OBJECTS>
  xml = xml.replace('</ns0:SPEC-OBJECTS>', specObjects + '\n      </ns0:SPEC-OBJECTS>');

  // Step 3: Build hierarchy entries
  console.log('Building hierarchy...');
  let hierarchyEntries = '';

  for (const cat of powerplantStructure.categories) {
    hierarchyEntries += `
              <ns0:SPEC-HIERARCHY IDENTIFIER="H_${genId()}" LONG-NAME="${cat.title}">
                <ns0:OBJECT><ns0:SPEC-OBJECT-REF>${cat.id}</ns0:SPEC-OBJECT-REF></ns0:OBJECT>
                <ns0:CHILDREN>`;

    let catNum2 = powerplantStructure.categories.indexOf(cat) + 1;
    let reqNum2 = 0;

    for (const req of cat.requirements) {
      reqNum2++;
      const reqId = `CERT-PWR-${String(catNum2).padStart(2, '0')}${String(reqNum2).padStart(2, '0')}`;

      hierarchyEntries += `
                  <ns0:SPEC-HIERARCHY IDENTIFIER="H_${genId()}" LONG-NAME="§${req.cfr}">
                    <ns0:OBJECT><ns0:SPEC-OBJECT-REF>${reqId}</ns0:SPEC-OBJECT-REF></ns0:OBJECT>
                    <ns0:CHILDREN>`;

      for (const ds of req.derivedShalls) {
        const dsId = `${reqId}-${ds.id}`;
        hierarchyEntries += `
                      <ns0:SPEC-HIERARCHY IDENTIFIER="H_${genId()}" LONG-NAME="Derived Shall">
                        <ns0:OBJECT><ns0:SPEC-OBJECT-REF>${dsId}</ns0:SPEC-OBJECT-REF></ns0:OBJECT>
                      </ns0:SPEC-HIERARCHY>`;
      }

      hierarchyEntries += `
                    </ns0:CHILDREN>
                  </ns0:SPEC-HIERARCHY>`;
    }

    hierarchyEntries += `
                </ns0:CHILDREN>
              </ns0:SPEC-HIERARCHY>`;
  }

  // Find and update the Subpart E hierarchy
  const subpartEPattern = /(<ns0:SPEC-OBJECT-REF>SUBPART_E<\/ns0:SPEC-OBJECT-REF><\/ns0:OBJECT>)(\s*<ns0:CHILDREN>)?[\s\S]*?(<\/ns0:SPEC-HIERARCHY>)(\s*<ns0:SPEC-HIERARCHY[^>]*>\s*<ns0:OBJECT>\s*<ns0:SPEC-OBJECT-REF>SUBPART_F)/;

  if (xml.match(subpartEPattern)) {
    xml = xml.replace(subpartEPattern, `$1
              <ns0:CHILDREN>${hierarchyEntries}
              </ns0:CHILDREN>
            $3$4`);
    console.log('Updated Subpart E hierarchy');
  } else {
    console.log('Warning: Could not find Subpart E hierarchy insertion point');
  }

  // Write updated file
  await fs.writeFile(reqifFile, xml, 'utf8');

  console.log(`\nPowerplant section rebuilt successfully!`);
  console.log(`- ${powerplantStructure.categories.length} categories`);
  console.log(`- ${reqCount} parent requirements`);
  console.log(`- ${dsCount} derived shalls`);
  console.log(`\nCategories:`);
  for (const cat of powerplantStructure.categories) {
    console.log(`  - ${cat.title} (${cat.cfrRange}): ${cat.requirements.length} requirements`);
  }
}

main().catch((err) => {
  console.error('Failed to rebuild Powerplant section:', err);
  process.exit(1);
});
