#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reqifFile = path.join(projectRoot, 'public', 'reqif', 'part25-certification.reqif');

// Updated Powerplant requirements with official FAA regulatory text
// Source: Cornell Law Institute - https://www.law.cornell.edu/cfr/text/14/part-25
const updates = [
  {
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

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function main() {
  console.log('Reading ReqIF file...');
  let xml = await fs.readFile(reqifFile, 'utf8');

  let updateCount = 0;
  let derivedCount = 0;

  for (const req of updates) {
    // Update parent requirement text - match by IDENTIFIER containing certId
    const parentPattern = new RegExp(
      `(<ns0:SPEC-OBJECT IDENTIFIER="REQ_E_\\d+"[^>]*>[\\s\\S]*?THE-VALUE="${req.certId}"[\\s\\S]*?<ns0:ATTRIBUTE-VALUE-STRING THE-VALUE=")[^"]*("[^>]*><ns0:DEFINITION><ns0:ATTRIBUTE-DEFINITION-STRING-REF>ATTR_CFR<)`,
      'g'
    );

    if (xml.match(parentPattern)) {
      xml = xml.replace(parentPattern, `$1${req.cfr}$2`);
    }

    // Update the XHTML text content for parent requirement
    const textPattern = new RegExp(
      `(IDENTIFIER="REQ_E_\\d+"[\\s\\S]*?THE-VALUE="${req.certId}"[\\s\\S]*?<ns0:THE-VALUE><html:div><html:strong>)[^<]*(:</html:strong>)[^<]*(</html:div></ns0:THE-VALUE>)`,
      'g'
    );

    if (xml.match(textPattern)) {
      xml = xml.replace(textPattern, `$1${req.title}$2 ${escapeXml(req.text)}$3`);
      updateCount++;
      console.log(`Updated ${req.certId}: ${req.title}`);
    }

    // Update derived shalls
    for (const ds of req.derivedShalls) {
      const dsId = `${req.certId}-${ds.id}`;

      // Update the derived shall text
      const dsPattern = new RegExp(
        `(IDENTIFIER="${dsId}"[\\s\\S]*?<ns0:THE-VALUE><html:div><html:p>)[^<]*(</html:p></html:div></ns0:THE-VALUE>)`,
        'g'
      );

      if (xml.match(dsPattern)) {
        xml = xml.replace(dsPattern, `$1${escapeXml(ds.text)}$2`);
        derivedCount++;
      }
    }
  }

  console.log(`\nUpdated ${updateCount} parent requirements`);
  console.log(`Updated ${derivedCount} derived shalls`);

  await fs.writeFile(reqifFile, xml, 'utf8');
  console.log('\nReqIF file updated with official FAA regulatory text');
}

main().catch((err) => {
  console.error('Failed to update Powerplant text:', err);
  process.exit(1);
});
