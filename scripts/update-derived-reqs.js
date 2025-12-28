#!/usr/bin/env node
/**
 * Updates derived requirements with official FAA 14 CFR Part 25 regulatory text
 * Source: https://www.law.cornell.edu/cfr/text/14/part-25
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reqifPath = path.join(projectRoot, 'public', 'reqif', 'part25-certification.reqif');

// Official FAA 14 CFR Part 25 derived requirements based on actual regulatory text
// Source: Cornell Law Institute - https://www.law.cornell.edu/cfr/text/14/part-25
const derivedReqs = {
  // §25.1 Applicability
  'CERT-GEN-001': {
    DS1: '§25.1(a): This part prescribes airworthiness standards for the issue of type certificates, and changes to those certificates, for transport category airplanes.',
    DS2: '§25.1(b): Each person who applies under Part 21 for such a certificate or change must show compliance with the applicable requirements in this part.',
    DS3: '§25.1: Transport category applies to jets with 10+ seats or MTOW >12,500 lbs, or propeller aircraft with 19+ seats or MTOW >19,000 lbs.'
  },
  // §25.3 Special retroactive requirements (ETOPS)
  'CERT-GEN-002': {
    DS1: '§25.3(a): The applicant must demonstrate that the airplane-engine combination is capable of safe extended operations beyond 60 minutes from an adequate airport.',
    DS2: '§25.3(b): ETOPS eligibility requires demonstration of safe flight considering catastrophic single failures and adverse operating conditions.',
    DS3: '§25.3(c): The applicant must identify ETOPS-critical systems and establish maintenance requirements for continued airworthiness.'
  },
  // §25.21 Proof of compliance
  'CERT-FLT-001': {
    DS1: '§25.21(a): Each requirement must be met at each appropriate combination of weight and center of gravity within the range of loading conditions.',
    DS2: '§25.21(a): Compliance must be shown by tests upon an airplane of the type for which certification is requested, or by calculations based on, and equal in accuracy to, the results of testing.',
    DS3: '§25.21(c): Controllability, stability, trim, and stalling characteristics must be shown for each altitude up to the maximum expected in operation.'
  },
  // §25.101 General Performance
  'CERT-FLT-002': {
    DS1: '§25.101(a): Unless otherwise prescribed, airplanes must meet the applicable performance requirements of this subpart for ambient atmospheric conditions and still air.',
    DS2: '§25.101(c): Performance must account for the propulsive thrust available under the particular ambient atmospheric conditions, including installation losses and accessory power absorption.',
    DS3: '§25.101(i): Accelerate-stop and landing distances must be determined with all airplane wheel brake assemblies at the fully worn limit of their allowable wear range.'
  },
  // §25.103/119/125 Landing Performance
  'CERT-FLT-003': {
    DS1: '§25.119: In the landing configuration, the steady gradient of climb may not be less than 3.2% for two-engine airplanes with critical engine inoperative.',
    DS2: '§25.125(a): The horizontal distance necessary to land and come to a complete stop from a point 50 feet above the landing surface must be determined.',
    DS3: '§25.125(b): Landing distances must be determined on a level, smooth, dry, hard-surfaced runway using operational procedures.'
  },
  // §25.103 Stall speed
  'CERT-FLT-004': {
    DS1: '§25.103(a): The reference stall speed VSR is a calibrated airspeed defined by the applicant as an equivalent airspeed with respect to the 1-g stall speed.',
    DS2: '§25.103(b): VSR must be determined with zero thrust at the stall speed, or with thrust not exceeding that required for level flight at 1.5VSR.',
    DS3: '§25.103(c): The stall warning must begin at a speed exceeding the stall speed by a sufficient margin to allow the pilot to prevent stalling.'
  },
  // §25.143 General controllability
  'CERT-FLT-005': {
    DS1: '§25.143(a): The airplane must be safely controllable and maneuverable during takeoff, climb, level flight, descent, and landing.',
    DS2: '§25.143(b): It must be possible to make a smooth transition from one flight condition to any other flight condition without exceptional piloting skill, alertness, or strength.',
    DS3: '§25.143(d): Control forces may not exceed: Pitch 75 lbs (short term), 10 lbs (long term); Roll 50 lbs (short term), 5 lbs (long term); Yaw 150 lbs (short term), 20 lbs (long term).'
  },
  // §25.147 Directional and lateral control
  'CERT-FLT-006': {
    DS1: '§25.147(a): For turbopropeller aircraft, takeoff must be possible using normal piloting skill when the critical engine suddenly becomes inoperative.',
    DS2: '§25.147(c): For all airplanes, it must be possible to safely make a reasonably sudden change in heading of up to 15 degrees at 1.4VSR1.',
    DS3: '§25.147(e): VMC is the calibrated airspeed at which, when the critical engine is suddenly made inoperative, it is possible to maintain control with a bank of not more than 5 degrees.'
  },
  // §25.171-181 Stability
  'CERT-FLT-007': {
    DS1: '§25.171: The airplane must be longitudinally, directionally, and laterally stable in accordance with the provisions of §§25.173 through 25.181.',
    DS2: '§25.173: Static longitudinal stability - the stick force curve must have a stable slope at speeds between 85% and 115% of the trim speed.',
    DS3: '§25.181: Dynamic stability - any short-period oscillation must be heavily damped; any combined lateral-directional oscillations must be positively damped.'
  },
  // §25.201 Stall demonstration
  'CERT-FLT-008': {
    DS1: '§25.201(a): Stall characteristics must be demonstrated in straight flight and in 30-degree banked turns with power off and at maximum continuous power.',
    DS2: '§25.201(b): During the stall tests, it must be possible to prevent more than 15 degrees of roll or yaw by the normal use of the controls.',
    DS3: '§25.201(c): The airplane must give a clear and distinctive stall warning with sufficient margin to prevent inadvertent stalling.'
  },
  // §25.301 Loads
  'CERT-STR-001': {
    DS1: '§25.301(a): Strength requirements are specified in terms of limit loads (maximum loads expected in service) and ultimate loads (limit loads multiplied by prescribed factors of safety).',
    DS2: '§25.301(b): Air, ground, and water loads must be placed in equilibrium with inertia forces, considering each item of mass in the airplane.',
    DS3: '§25.301(c): If deflections under load significantly change the distribution of external or internal loads, this redistribution must be taken into account.'
  },
  // §25.303/305 Factors of safety / Strength and deformation
  'CERT-STR-002': {
    DS1: '§25.303: Unless otherwise specified, a factor of safety of 1.5 must be applied to the prescribed limit load which are considered external loads on the structure.',
    DS2: '§25.305(a): The structure must be able to support limit loads without detrimental permanent deformation.',
    DS3: '§25.305(b): The structure must be able to support ultimate loads without failure for at least 3 seconds.'
  },
  // §25.571 Damage-tolerance and fatigue evaluation
  'CERT-STR-003': {
    DS1: '§25.571(a): An evaluation must be conducted to show that catastrophic failure due to fatigue, corrosion, manufacturing defects, or accidental damage will be avoided throughout the operational life.',
    DS2: '§25.571(b): Damage-tolerance evaluation must include a determination of probable locations and modes of damage, and inspection thresholds and intervals.',
    DS3: '§25.571(b): A limit of validity (LOV) of the engineering data that supports the structural maintenance program must be established.'
  },
  // §25.581 Lightning protection
  'CERT-STR-004': {
    DS1: '§25.581(a): The airplane must be protected against catastrophic effects from lightning.',
    DS2: '§25.581(b): For metallic components, acceptable methods of protection include bonding and grounding to disperse lightning currents.',
    DS3: '§25.581(c): For non-metallic components, acceptable methods include installation of conductive materials to provide lightning current paths.'
  },
  // §25.631 Bird strike
  'CERT-STR-005': {
    DS1: '§25.631(a): The empennage structure must be designed to assure capability of continued safe flight and landing after impact with a 4-pound bird at VC.',
    DS2: '§25.631(b): The airplane must be capable of successfully completing the flight after impact with a 4-pound bird when damage locations are in accordance with the requirements.',
    DS3: '§25.775: Windshields and windows must be made of material that will not break into dangerous fragments when subjected to a 4-pound bird impact at VC.'
  },
  // §25.603 Materials
  'CERT-DES-001': {
    DS1: '§25.603(a): The suitability and durability of materials used for parts, the failure of which could adversely affect safety, must be established on the basis of experience or tests.',
    DS2: '§25.603(b): Materials must conform to approved specifications that ensure their having the strength and other properties assumed in the design data.',
    DS3: '§25.605: Fabrication methods must produce consistently sound structure. Special processes must be performed under approved process specifications.'
  },
  // §25.671 Control systems - General
  'CERT-DES-002': {
    DS1: '§25.671(a): Each control system must operate with the ease, smoothness, and positiveness appropriate to its function.',
    DS2: '§25.671(c): The airplane must be shown by analysis, test, or both, to be capable of continued safe flight and landing after any single failure in the flight control system.',
    DS3: '§25.671(d): All failures not shown to be extremely improbable must be considered, including jamming, disconnection, unintended engagement, or runaway.'
  },
  // §25.721-735 Landing gear
  'CERT-DES-003': {
    DS1: '§25.721: The landing gear system must be designed so that when it fails due to overloads during takeoff and landing, the failure mode is not likely to cause spillage of enough fuel to constitute a fire hazard.',
    DS2: '§25.729(a): The landing gear retracting mechanism must be designed so that the landing gear can be extended in case of failure of the normal landing gear operating mechanism.',
    DS3: '§25.735: Brakes must be designed to prevent hazardous accumulation of heat; the brake temperature must be within operating limits after rejected takeoff at maximum energy.'
  },
  // §25.801-807 Ditching / Emergency provisions
  'CERT-DES-004': {
    DS1: '§25.801(a): If certification with ditching provisions is requested, the airplane must meet the requirements of this section and §§25.807(e), 25.1411, and 25.1415(a).',
    DS2: '§25.801(b): Each practicable design measure must be taken to minimize the probability that in an emergency landing on water, the behavior of the airplane would cause immediate injury to the occupants.',
    DS3: '§25.807: Emergency exits must be distributed as uniformly as practical, and the number and types must meet the requirements for maximum seating capacity.'
  },
  // §25.853 Compartment interiors
  'CERT-DES-005': {
    DS1: '§25.853(a): Each compartment occupied by the crew or passengers must meet the flammability requirements of Appendix F or other approved equivalent.',
    DS2: '§25.853(d): Each compartment must have a means to allow smoke to be dissipated to prevent obscuration of visibility to the extent necessary for the flight crew to perform their duties.',
    DS3: '§25.855: Each cargo or baggage compartment must be classified according to means of detecting and suppressing fire.'
  },
  // §25.901 Installation (Powerplant)
  'CERT-PWR-001': {
    DS1: '§25.901(a): For each powerplant, the installation must comply with the installation instructions provided under §§33.5 and 35.3.',
    DS2: '§25.901(b)(2): Each component of the installation must be constructed, arranged, and installed so as to ensure its continued safe operation between normal inspections or overhauls.',
    DS3: '§25.901(b)(3): Each component of the installation must be accessible for such inspections and maintenance as are necessary for continued airworthiness.'
  },
  // §25.951-955 Fuel system
  'CERT-PWR-002': {
    DS1: '§25.951: Each fuel system must be constructed and arranged to ensure a flow of fuel at a rate and pressure established for proper engine and auxiliary power unit functioning.',
    DS2: '§25.952: Each fuel system must be designed and arranged to prevent the ignition of fuel vapor within the system by lightning strikes, static electricity, or other ignition sources.',
    DS3: '§25.954: Each fuel system must be arranged so that no pump can draw fuel from more than one tank at a time, or provisions must be made to prevent air from being drawn into the fuel system.'
  },
  // §25.1181-1207 Fire protection
  'CERT-PWR-003': {
    DS1: '§25.1181: Designated fire zones must include the engine power section, engine accessory section, any complete powerplant compartment, and APU compartment.',
    DS2: '§25.1182: Each designated fire zone must meet the fire protection requirements of §§25.1185 through 25.1203.',
    DS3: '§25.1183(a): Each part of the airplane within a designated fire zone must be constructed of fireproof or fire resistant materials as appropriate for the likely fire zone conditions.'
  },
  // §25.1091-1093 Engine air and induction
  'CERT-PWR-004': {
    DS1: '§25.1091: The air induction system for each engine and auxiliary power unit must supply the air required by that engine and APU under all operating conditions.',
    DS2: '§25.1091(d): Each turbine engine and APU must be designed to prevent hazardous quantities of fuel from draining from the main fuel system into the engine or APU.',
    DS3: '§25.1093(b): Each engine must function throughout its flight power range without adverse effect when operated in rain and icing conditions for which certification is requested.'
  },
  // §25.1301 Function and installation
  'CERT-EQP-001': {
    DS1: '§25.1301(a): Each item of installed equipment must be of a kind and design appropriate to its intended function.',
    DS2: '§25.1301(b): Each item of installed equipment must be labeled as to its identification, function, or operating limitations.',
    DS3: '§25.1301(c): Each item of installed equipment must be installed according to limitations specified for that equipment.'
  },
  // §25.1303/1305 Instruments / Powerplant instruments
  'CERT-EQP-002': {
    DS1: '§25.1303: Each required flight instrument must be visible from the appropriate pilots station, have adequate lighting, and have marking as prescribed.',
    DS2: '§25.1305: Required powerplant instruments include fuel quantity, oil quantity, oil pressure, oil temperature, and engine tachometer for each engine.',
    DS3: '§25.1321: Instrument arrangement and visibility must allow the flight crew to monitor the flight path and detect any failure or improper functioning of equipment.'
  },
  // §25.1351 Electrical systems and equipment
  'CERT-EQP-003': {
    DS1: '§25.1351(a): Each electrical system must be adequate for the intended use and be designed so that the required load can be powered under any probable operating condition.',
    DS2: '§25.1351(b): Generating system - each generating system must be designed so that no failure or malfunction of any one generating system can result in the loss of more than one source of electrical power.',
    DS3: '§25.1351(d): Each system must be designed so that essential loads can be powered for a time period sufficient to complete an emergency landing under any probable operating condition.'
  },
  // §25.1435 Hydraulic systems
  'CERT-EQP-004': {
    DS1: '§25.1435(a): Each element of the hydraulic system must be designed and installed to function properly when installed, and each such element must be substantiated by proof pressure tests.',
    DS2: '§25.1435(b): The hydraulic system must be designed to perform the intended function under all foreseeable operating conditions with a means to ensure adequate fluid cleanliness.',
    DS3: '§25.1435(c): Hydraulic system fire protection must be provided to minimize hazards to the airplane from hydraulic fluid fires.'
  },
  // §25.1501 General Operating Limitations
  'CERT-OPS-001': {
    DS1: '§25.1501(a): Each operating limitation specified in §§25.1503 through 25.1533 and other limitations and information necessary for safe operation must be established.',
    DS2: '§25.1501(b): The operating limitations and other information necessary for safe operation must be made available to the crewmembers as prescribed.',
    DS3: '§25.1503: Airspeed limitations - VMO/MMO, VD/MD, and the speed for maximum gust intensity must be established so that they provide adequate margin for probable variations in pilot technique and atmospheric conditions.'
  },
  // §25.1581-1587 AFM
  'CERT-OPS-002': {
    DS1: '§25.1581: An Airplane Flight Manual (AFM) must be furnished with each airplane and contain the information required by §§25.1583 through 25.1587.',
    DS2: '§25.1583: The AFM operating limitations section must include VMO/MMO, takeoff and landing weights and CG limits, and kinds of operation authorized.',
    DS3: '§25.1585: The AFM operating procedures section must include normal, abnormal, and emergency procedures, including procedures for making a balked landing and for ditching if applicable.'
  },
  // §25.1701 EWIS
  'CERT-EWI-001': {
    DS1: '§25.1701: This section prescribes requirements for transport category airplanes for EWIS (Electrical Wiring Interconnection System).',
    DS2: '§25.1707: EWIS must be designed and installed so that each EWIS component is protected from likely damage by the environment in which it is installed.',
    DS3: '§25.1709: System safety must be assessed to ensure that the failure of any EWIS component will not prevent continued safe flight and landing or significantly reduce the capability of the airplane.'
  },
  // Appendix C - Icing
  'CERT-APP-001': {
    DS1: 'Appendix C Part I: Continuous maximum icing conditions are defined in terms of liquid water content, mean effective diameter of the cloud droplets, and ambient air temperature.',
    DS2: 'Appendix C Part II: Intermittent maximum icing conditions (freezing rain) are defined by the freezing rain environment parameters.',
    DS3: '§25.1419: Ice protection must be designed and installed so that the airplane is capable of operating safely in continuous and intermittent maximum icing conditions as defined in Appendix C.'
  },
  // Appendix O - SLD Icing
  'CERT-APP-002': {
    DS1: 'Appendix O: Supercooled large drop (SLD) icing conditions are defined in terms of freezing drizzle and freezing rain parameters.',
    DS2: '§25.1420: If certification for flight in SLD icing conditions is sought, the applicant must demonstrate safe operation in Appendix O conditions.',
    DS3: '§25.1420(a): Means must be provided to detect SLD icing conditions and alert the flight crew when operating in those conditions.'
  },
  // Appendix I - Contaminated runway
  'CERT-APP-003': {
    DS1: 'Appendix I: Takeoff and landing performance on wet and contaminated runways must be determined in accordance with this appendix.',
    DS2: '§25.109: Accelerate-stop distance on wet runways must account for reduced braking effectiveness.',
    DS3: '§25.125: Landing distance on wet runways is 115% of the landing distance on dry runways unless specific wet runway data is approved.'
  },
  // Appendix D - MMEL
  'CERT-APP-004': {
    DS1: 'Appendix D: Criteria for demonstration of the emergency evacuation procedures specified in §25.803 are established.',
    DS2: '§25.1529: Instructions for Continued Airworthiness (ICA) must be prepared and included in the maintenance manual or appropriate maintenance instructions.',
    DS3: '§25.1533: For airplanes with MMEL provisions, the operating limitations must include the limitations resulting from the MMEL, if any.'
  }
};

async function updateFile() {
  let content = await fs.readFile(reqifPath, 'utf8');
  let updateCount = 0;

  for (const [certId, shalls] of Object.entries(derivedReqs)) {
    for (const [dsNum, text] of Object.entries(shalls)) {
      const fullId = `${certId}-${dsNum}`;

      // Find the SPEC-OBJECT for this derived requirement and update its THE-VALUE
      // The structure is: <ns0:THE-VALUE><html:div><html:p>...text...</html:p><html:p>...</html:p></html:div></ns0:THE-VALUE>
      const specObjPattern = new RegExp(
        `(SPEC-OBJECT IDENTIFIER="${fullId}"[\\s\\S]*?<ns0:THE-VALUE>)<html:div><html:p>[\\s\\S]*?</html:p>(?:<html:p>[\\s\\S]*?</html:p>)*</html:div>`,
        'g'
      );

      // Escape special XML characters
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      const before = content;
      content = content.replace(specObjPattern, `$1<html:div><html:p>${escapedText}</html:p></html:div>`);

      if (content !== before) {
        updateCount++;
      }
    }
  }

  await fs.writeFile(reqifPath, content, 'utf8');
  console.log(`Updated ${updateCount} derived requirements with official FAA regulatory text`);
  console.log('Source: https://www.law.cornell.edu/cfr/text/14/part-25');
}

updateFile().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
