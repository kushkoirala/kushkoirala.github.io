#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * CATIA Component Naming Assistant
 * Helps ensure components exported from CATIA are properly named for simulation
 * 
 * Usage:
 *   node naming-helper.js check yourfile.stp
 *   node naming-helper.js suggest propeller
 *   node naming-helper.js patterns
 */

const COMPONENT_PATTERNS = {
  propeller: {
    aliases: ['Propeller', 'Propellor', 'Prop', 'Rotor', 'Propeller_Main'],
    pattern: /propell|rotor|screw/i,
    description: 'Spinning propeller - rotates continuously based on throttle',
    examples: ['Propeller', 'Propellor_Main', 'Main_Rotor'],
  },
  motor: {
    aliases: ['Motor', 'Motor_Assembly', 'Engine', 'Powerplant'],
    pattern: /motor|engine|powerplant/i,
    description: 'Motor assembly - rotates with propeller',
    examples: ['Motor', 'Motor_Assembly', 'Engine_Mount'],
  },
  wing: {
    aliases: ['Wing', 'Wing_Left', 'Wing_Right', 'Wing_Main'],
    pattern: /wing(?!_tip)/i,
    description: 'Wing structure - provides lift',
    examples: ['Wing', 'Wing_Left', 'Wing_Right'],
  },
  fuselage: {
    aliases: ['Fuselage', 'Fuse', 'Body', 'Hull'],
    pattern: /fusel|body|fus/i,
    description: 'Aircraft body - main structure',
    examples: ['Fuselage', 'Fuselage_Assembly', 'Fuse_Main'],
  },
  aileron: {
    aliases: ['Aileron', 'Aileron_Left', 'Aileron_Right'],
    pattern: /aileron/i,
    description: 'Roll control surface - deflects for banking',
    deflection: '±15 degrees',
    examples: ['Aileron', 'Aileron_L', 'Aileron_Right'],
  },
  rudder: {
    aliases: ['Rudder', 'Vertical_Fin', 'Vertical_Stabilizer'],
    pattern: /rudder|vertical.*fin/i,
    description: 'Yaw control surface - controls direction',
    deflection: '±25 degrees',
    examples: ['Rudder', 'Vertical_Fin', 'Rudder_Main'],
  },
  elevator: {
    aliases: ['Elevator', 'Horiz_Stab', 'Horizontal_Stabilizer'],
    pattern: /elevator|horizontal.*stab|horiz.*elev/i,
    description: 'Pitch control surface - controls up/down',
    deflection: '±20 degrees',
    examples: ['Elevator', 'Horizontal_Stab', 'Elevator_Main'],
  },
  landing_gear: {
    aliases: ['Landing_Gear', 'LG', 'Undercarriage', 'Strut'],
    pattern: /landing.gear|gear|undercarriage|strut|lg/i,
    description: 'Landing gear - deploys and retracts',
    states: ['deployed', 'retracted'],
    examples: ['Landing_Gear', 'LG', 'Main_Gear'],
  },
  wheel: {
    aliases: ['Wheel', 'Wheels', 'Tire', 'Tyre'],
    pattern: /wheel|tire|tyre/i,
    description: 'Wheel - rotates during ground movement',
    maxRPM: '1000 RPM',
    examples: ['Wheel', 'Main_Wheel', 'Wheel_Left'],
  },
  stabilizer: {
    aliases: ['Stabilizer', 'Horizontal_Stab', 'Vertical_Stab', 'Fin'],
    pattern: /stabilizer|stab|fin/i,
    description: 'Stabilizing surface - provides stability',
    examples: ['Horizontal_Stab', 'Vertical_Stab', 'Fin_Main'],
  },
  tail_wheel: {
    aliases: ['Tail_Wheel', 'Tailwheel', 'TG', 'Tail_Gear'],
    pattern: /tail.wheel|tailwheel|tail.*gear/i,
    description: 'Tail wheel - rear landing wheel',
    maxRPM: '300 RPM',
    examples: ['Tail_Wheel', 'Tailwheel_Main', 'TG_Main'],
  },
};

class NamingHelper {
  constructor() {
    this.patterns = COMPONENT_PATTERNS;
  }

  // Check component name against patterns
  checkName(componentName) {
    console.log(`\n🔍 Checking: "${componentName}"\n`);

    let found = false;
    for (const [type, config] of Object.entries(this.patterns)) {
      if (config.pattern.test(componentName)) {
        console.log(`✅ MATCHES: ${type.toUpperCase()}`);
        console.log(`   Description: ${config.description}`);
        console.log(`   Aliases: ${config.aliases.join(', ')}`);
        if (config.deflection) console.log(`   Deflection: ${config.deflection}`);
        if (config.maxRPM) console.log(`   Max RPM: ${config.maxRPM}`);
        if (config.states) console.log(`   States: ${config.states.join(', ')}`);
        console.log(`   Examples: ${config.examples.join(', ')}`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`⚠️  NOT RECOGNIZED`);
      console.log(`\n   Suggestions:`);
      const suggestions = this.suggestMatches(componentName);
      if (suggestions.length > 0) {
        suggestions.forEach(suggestion => {
          console.log(`   • Try: "${suggestion.alias}" (matches ${suggestion.type})`);
        });
      } else {
        console.log(`   • Check spelling`);
        console.log(`   • See 'node naming-helper.js patterns' for valid names`);
      }
    }

    return found;
  }

  // Suggest component types based on name similarity
  suggestMatches(componentName) {
    const lower = componentName.toLowerCase();
    const suggestions = [];

    for (const [type, config] of Object.entries(this.patterns)) {
      for (const alias of config.aliases) {
        if (lower.includes(alias.toLowerCase())) {
          suggestions.push({ type, alias });
          break;
        }
      }
    }

    return suggestions;
  }

  // Show all recognized patterns
  showPatterns() {
    console.log('\n📋 RECOGNIZED COMPONENT PATTERNS\n');
    console.log('=' + '='.repeat(75));

    for (const [type, config] of Object.entries(this.patterns)) {
      console.log(`\n🔹 ${type.toUpperCase()}`);
      console.log(`   Pattern: ${config.pattern.source}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Preferred Names: ${config.aliases.slice(0, 3).join(', ')}`);
      console.log(`   Examples: ${config.examples.join(', ')}`);
      if (config.deflection) console.log(`   Animation: Deflection ${config.deflection}`);
      if (config.maxRPM) console.log(`   Animation: Rotation up to ${config.maxRPM}`);
      if (config.states) console.log(`   States: ${config.states.join(', ')}`);
    }

    console.log('\n' + '='.repeat(76));
  }

  // Show naming guide
  showGuide() {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║         CATIA Component Naming Guide for Aircraft Simulation               ║
╚════════════════════════════════════════════════════════════════════════════╝

📌 KEY PRINCIPLE:
   Use CLEAR, RECOGNIZABLE names that match component types

✅ DO THIS:
   • "Propeller"           → Recognized as propeller
   • "Wing_Left"           → Recognized as wing
   • "Aileron_Right"       → Recognized as aileron
   • "Landing_Gear"        → Recognized as landing gear
   • "Wheel_Main"          → Recognized as wheel

❌ DON'T DO THIS:
   • "Part1"               → Not recognized
   • "Component_v2"        → Not recognized
   • "rotating_device"     → Too vague
   • "control_surface_1"   → Not specific enough
   • "assembly_xyz"        → Not descriptive

🏗️  NAMING STRUCTURE:
   [ComponentType]_[Location/Designation]
   
   Examples:
   • Propeller           (just the type)
   • Wing_Left           (type + location)
   • Aileron_Right_Main  (type + location + detail)
   • Motor_Assembly      (type + descriptor)

🔤 NAMING RULES:
   1. Use component type as primary identifier (Propeller, Wing, etc.)
   2. Add location if multiple: Left, Right, Main, Center
   3. Use underscores to separate words
   4. Capitalize first letter of each word
   5. Avoid special characters and spaces
   6. Avoid generic names like "Part", "Product", "Assembly"

📊 COMPONENT CHECKLIST:

   ☐ Propeller / Rotor    → "Propeller" or "Propellor"
   ☐ Motor / Engine       → "Motor" or "Motor_Assembly"
   ☐ Wings                → "Wing", "Wing_Left", "Wing_Right"
   ☐ Fuselage             → "Fuselage" or "Fuse_Main"
   ☐ Aileron              → "Aileron", "Aileron_Left", "Aileron_Right"
   ☐ Rudder               → "Rudder" or "Vertical_Fin"
   ☐ Elevator             → "Elevator" or "Horizontal_Stab"
   ☐ Landing Gear         → "Landing_Gear" or "LG_Main"
   ☐ Wheels               → "Wheel", "Wheel_Main", "Wheel_Tail"
   ☐ Tail Wheel           → "Tail_Wheel" or "Tailwheel"
   ☐ Stabilizers          → "Horizontal_Stab", "Vertical_Stab"

⚠️  EXPORT TIPS:
   1. In CATIA, rename components BEFORE exporting
   2. Use consistent naming across all parts in assembly
   3. Enable "Write Assembly Structure" in STEP export
   4. Always export from the main CATProduct (assembly), not individual parts

🔧 FIXING BAD NAMES:
   If you exported with wrong names, use:
   node step-editor.js rename "BadName" "GoodName"
   
   Example:
   node step-editor.js rename "Part1" "Wing_Left"
   node step-editor.js rename "Product2" "Fuselage"

📝 VERIFICATION:
   After export, validate your STEP file:
   npm run validate:step ./public/yourfile.stp
   
   This will show:
   ✅ Recognized components
   ⚠️  Unrecognized components (you can fix)
   📊 File statistics

`);
  }

  // Generate checklist for STEP file
  generateChecklist(filePath) {
    console.log(`\n📋 PRE-EXPORT CHECKLIST FOR: ${filePath}\n`);
    console.log(`Before exporting from CATIA, verify:\n`);
    console.log(`☐ All components have descriptive names`);
    console.log(`☐ No components named "Part1", "Product2", "Assembly", etc.`);
    console.log(`☐ Component names use underscores for separation`);
    console.log(`☐ Component names follow pattern: ComponentType_Location`);
    console.log(`☐ All instances of same component type have unique names`);
    console.log(`☐ Avoid spaces, special characters in names`);
    console.log(`☐ Use consistent capitalization (Propeller not PROPELLER)`);
    console.log(`☐ Main assembly is active before export`);
    console.log(`☐ STEP export options:`);
    console.log(`  ✓ Write Assembly Structure: ON`);
    console.log(`  ✓ Write Shapes: ON`);
    console.log(`  ✓ Write Attributes: ON`);
    console.log(`\nAfter export, run:\nnpm run validate:step ./public/${filePath}\n`);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const param = args[1];

const helper = new NamingHelper();

if (!command) {
  console.log('\n🛠️  CATIA Component Naming Helper\n');
  console.log('Usage:');
  console.log('  node naming-helper.js check <componentName>');
  console.log('  node naming-helper.js patterns');
  console.log('  node naming-helper.js guide');
  console.log('  node naming-helper.js checklist <filename>\n');
  console.log('Examples:');
  console.log('  node naming-helper.js check "Propeller"');
  console.log('  node naming-helper.js check "Part1"');
  console.log('  node naming-helper.js patterns');
  console.log('  node naming-helper.js guide');
  console.log('  node naming-helper.js checklist Udaan.stp\n');
} else if (command === 'check') {
  if (!param) {
    console.error('❌ Please provide a component name');
    console.error('Usage: node naming-helper.js check <componentName>');
    process.exit(1);
  }
  helper.checkName(param);
} else if (command === 'patterns') {
  helper.showPatterns();
} else if (command === 'guide') {
  helper.showGuide();
} else if (command === 'checklist') {
  helper.generateChecklist(param || 'yourfile.stp');
} else {
  console.error(`❌ Unknown command: ${command}`);
  console.error('Valid commands: check, patterns, guide, checklist');
  process.exit(1);
}
