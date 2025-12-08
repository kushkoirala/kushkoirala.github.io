/**
 * Weight Model for Udaan Aircraft
 * Accurate component-based mass calculation
 * 
 * Udaan is a human-powered aircraft research platform
 * Reference: https://www.iitb.ac.in/
 */

export class WeightModel {
  constructor() {
    // Component definitions with realistic masses
    this.components = {
      // STRUCTURE
      wing: {
        name: 'Wing (Spruce & Balsa)',
        mass: 0.85, // kg - composite structure
        material: 'spruce_balsa',
        quantity: 1,
        description: 'Main wing assembly with spruce spars and balsa ribs'
      },
      
      boom: {
        name: 'Boom/Fuselage (Carbon Fiber)',
        mass: 0.35, // kg - lightweight boom structure
        material: 'carbon_fiber',
        quantity: 1,
        description: 'Main fuselage boom, carbon fiber tube'
      },
      
      horizontalTail: {
        name: 'Horizontal Stabilizer',
        mass: 0.25, // kg
        material: 'balsa',
        quantity: 1,
        description: 'H-tail with elevator control surface'
      },
      
      verticalTail: {
        name: 'Vertical Stabilizer',
        mass: 0.15, // kg
        material: 'balsa',
        quantity: 1,
        description: 'V-tail with rudder control surface'
      },
      
      // CONTROL SURFACES
      ailerons: {
        name: 'Ailerons (Pair)',
        mass: 0.12, // kg total
        material: 'foam_mylar',
        quantity: 2,
        description: 'Roll control surfaces, foam core with mylar covering'
      },
      
      elevator: {
        name: 'Elevator',
        mass: 0.08, // kg
        material: 'foam_mylar',
        quantity: 1,
        description: 'Pitch control surface'
      },
      
      rudder: {
        name: 'Rudder',
        mass: 0.06, // kg
        material: 'foam_mylar',
        quantity: 1,
        description: 'Yaw control surface'
      },
      
      // LANDING GEAR
      landingGear: {
        name: 'Landing Gear (Wheels & Struts)',
        mass: 0.45, // kg - includes rubber stock wheels and aluminum struts
        material: 'aluminum_rubber',
        quantity: 3, // 2 main + 1 tail wheel
        description: 'Tricycle landing gear with rubber stock wheels'
      },
      
      wheelLeft: {
        name: 'Wheel (Left Main) - Rubber Stock',
        mass: 0.12, // kg - tennis ball diameter rubber wheel
        material: 'rubber',
        quantity: 1,
        description: 'Pneumatic rubber wheel, ~65mm diameter'
      },
      
      wheelRight: {
        name: 'Wheel (Right Main) - Rubber Stock',
        mass: 0.12, // kg
        material: 'rubber',
        quantity: 1,
        description: 'Pneumatic rubber wheel, ~65mm diameter'
      },
      
      wheelTail: {
        name: 'Wheel (Tail) - Rubber Stock',
        mass: 0.08, // kg - smaller tail wheel
        material: 'rubber',
        quantity: 1,
        description: 'Smaller tail wheel'
      },
      
      // PAYLOAD / REMOTE CONTROL PAYLOAD
      remoteControlUnit: {
        name: 'Remote Control Unit + Receiver',
        mass: 0.15, // kg - RC receiver, servo amplifier, integration
        material: 'plastic_pcb',
        quantity: 1,
        description: 'RC receiver and servo control electronics'
      },
      
      // PROPULSION
      propeller: {
        name: 'Propeller (Composite)',
        mass: 0.20, // kg - carbon/wood composite
        material: 'composite',
        quantity: 1,
        description: 'RC-powered propeller, optimized for low-speed flight'
      },
      
      motor: {
        name: 'Electric Motor + Speed Controller',
        mass: 0.35, // kg - brushless motor + ESC
        material: 'copper_aluminum',
        quantity: 1,
        description: 'Brushless electric motor with ESC for propeller drive'
      },
      
      servoMotors: {
        name: 'Servo Motors (Control)',
        mass: 0.15, // kg - 3-4 micro servos for ailerons, elevator, rudder
        material: 'plastic_metal',
        quantity: 4,
        description: 'RC servo motors for flight control surfaces'
      },
      
      // SYSTEMS & EQUIPMENT
      batteryElectronics: {
        name: 'Battery & Electronics',
        mass: 0.80, // kg - LiPo battery, avionics, flight controller
        material: 'lithium_plastic_pcb',
        quantity: 1,
        description: 'Lithium polymer battery (3S 5000mAh ~0.45kg) + flight instrumentation'
      },
      
      liPoBattery: {
        name: 'LiPo Battery (3S 5000mAh)',
        mass: 0.45, // kg - standard RC battery
        material: 'lithium_polymer',
        quantity: 1,
        description: '11.1V lithium polymer, ~150Wh capacity'
      },
      
      avionics: {
        name: 'Avionics Package',
        mass: 0.15, // kg - IMU, barometer, GPS, telemetry
        material: 'pcb_plastic',
        quantity: 1,
        description: 'Flight controller, sensors, telemetry transmitter'
      },
      
      cabling: {
        name: 'Electrical Cabling',
        mass: 0.20, // kg - wiring, connectors
        material: 'copper_pvc',
        quantity: 1,
        description: 'Power and signal wiring throughout aircraft'
      },
      
      // COVERING & MATERIALS
      skinCovering: {
        name: 'Skin Covering (Mylar/Ripstop)',
        mass: 0.30, // kg - lightweight fabric covering
        material: 'mylar_ripstop',
        quantity: 1,
        description: 'Aircraft skin covering and sealing'
      },
      
      adhesives: {
        name: 'Adhesives & Sealants',
        mass: 0.15, // kg - wood glue, epoxy, tape
        material: 'epoxy_polymer',
        quantity: 1,
        description: 'Assembly adhesives and sealing compounds'
      }
    };
  }

  /**
   * Get total empty aircraft weight (without payload)
   */
  getEmptyWeight() {
    let total = 0;
    Object.values(this.components).forEach(comp => {
      // Exclude payload from empty weight
      if (comp.name !== 'Remote Control Unit + Receiver') {
        total += comp.mass * comp.quantity;
      }
    });
    return total;
  }

  /**
   * Get total weight with payload
   */
  getTotalWeight() {
    let total = 0;
    Object.values(this.components).forEach(comp => {
      total += comp.mass * comp.quantity;
    });
    return total;
  }

  /**
   * Get weight breakdown by category
   */
  getWeightBreakdown() {
    const categories = {
      'Structure': ['wing', 'boom', 'horizontalTail', 'verticalTail'],
      'Control Surfaces': ['ailerons', 'elevator', 'rudder'],
      'Landing Gear': ['landingGear', 'wheelLeft', 'wheelRight', 'wheelTail'],
      'Propulsion': ['propeller', 'motor', 'servoMotors'],
      'Power & Electronics': ['batteryElectronics', 'liPoBattery', 'avionics', 'cabling'],
      'Materials & Covering': ['skinCovering', 'adhesives'],
      'Payload': ['remoteControlUnit']
    };

    const breakdown = {};
    Object.entries(categories).forEach(([category, keys]) => {
      breakdown[category] = keys.reduce((sum, key) => {
        const comp = this.components[key];
        return sum + (comp ? comp.mass * comp.quantity : 0);
      }, 0);
    });

    return breakdown;
  }

  /**
   * Get detailed weight report
   */
  getDetailedReport() {
    const emptyWeight = this.getEmptyWeight();
    const totalWeight = this.getTotalWeight();
    const breakdown = this.getWeightBreakdown();

    return {
      emptyWeight: emptyWeight.toFixed(2),
      payloadWeight: this.components.remoteControlUnit.mass,
      totalWeight: totalWeight.toFixed(2),
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([cat, weight]) => [
          cat,
          (weight).toFixed(2)
        ])
      ),
      components: Object.entries(this.components).map(([key, comp]) => ({
        key,
        name: comp.name,
        mass: (comp.mass * comp.quantity).toFixed(2),
        unit: comp.mass.toFixed(3),
        quantity: comp.quantity,
        material: comp.material,
        description: comp.description
      }))
    };
  }

  /**
   * Get center of gravity estimate
   * Returns CG position as fraction of fuselage length from nose
   */
  getCenterOfGravity() {
    // Simplified CG calculation based on typical RC aircraft
    // CG is typically ~25-30% of wing chord from leading edge
    return {
      x: 0.28, // 28% of fuselage length from nose
      y: 0.0,  // On centerline
      z: 0.0,  // On centerline
      description: 'Estimated center of gravity'
    };
  }

  /**
   * Get weight distribution for structural analysis
   */
  getWeightDistribution() {
    return {
      wingWeight: this.components.wing.mass,
      tailWeight: (this.components.horizontalTail.mass + this.components.verticalTail.mass),
      fuselageWeight: this.components.boom.mass,
      landingGearWeight: this.components.landingGear.mass,
      payloadWeight: this.components.remoteControlUnit.mass,
      systemsWeight: (
        this.components.batteryElectronics.mass +
        this.components.avionics.mass +
        this.components.cabling.mass
      ),
      propulsionWeight: (
        this.components.propeller.mass +
        this.components.motor.mass +
        this.components.servoMotors.mass
      )
    };
  }
}

// Export singleton instance
export const weightModel = new WeightModel();
