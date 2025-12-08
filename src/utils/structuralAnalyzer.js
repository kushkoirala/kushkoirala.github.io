/**
 * Structural Integrity & FEA Analysis Module
 * Real-time finite element analysis for aircraft components
 * 
 * Aircraft Materials:
 * - Balsa: Ribs (low strength, low density)
 * - Spruce: Spars (high strength-to-weight, anisotropic)
 * - Aluminum 2024: Boom & landing gear (high strength, ductile)
 * - Foam: Control surfaces (low density, crushable)
 */

import * as THREE from 'three';
import { weightModel } from './weightModel.js';

export class StructuralAnalyzer {
  constructor() {
    // Aircraft mass from weight model
    this.aircraftMass = weightModel.getTotalWeight(); // kg including pilot
    
    // Material properties (SI units)
    this.materials = {
      balsa: {
        name: 'Balsa Wood',
        density: 150, // kg/m³
        elasticityParallel: 1.2e9, // Pa (along grain)
        elasticityPerpendicular: 0.3e9, // Pa (across grain)
        shearModulus: 0.08e9, // Pa
        tensileStrengthParallel: 40e6, // Pa
        tensileStrengthPerpendicular: 2e6, // Pa
        compressiveStrengthParallel: 15e6, // Pa
        compressiveStrengthPerpendicular: 5e6, // Pa
        color: { safe: 0x90EE90, warning: 0xFFFF00, critical: 0xFF0000 },
        safetyFactor: 2.5
      },
      spruce: {
        name: 'Sitka Spruce',
        density: 450, // kg/m³
        elasticityParallel: 12e9, // Pa (along grain - spar direction)
        elasticityPerpendicular: 0.8e9, // Pa (across grain)
        shearModulus: 1.0e9, // Pa
        tensileStrengthParallel: 90e6, // Pa
        tensileStrengthPerpendicular: 3e6, // Pa
        compressiveStrengthParallel: 45e6, // Pa
        compressiveStrengthPerpendicular: 10e6, // Pa
        color: { safe: 0x8B4513, warning: 0xFF8C00, critical: 0xFF0000 },
        safetyFactor: 2.0
      },
      aluminum2024: {
        name: 'Aluminum 2024-T3',
        density: 2780, // kg/m³
        elasticity: 73e9, // Pa (Young's modulus)
        shearModulus: 28e9, // Pa
        yieldStrength: 345e6, // Pa
        ultimateTensileStrength: 485e6, // Pa
        color: { safe: 0xC0C0C0, warning: 0xFF8C00, critical: 0xFF0000 },
        safetyFactor: 1.5
      },
      foam: {
        name: 'Polyurethane Foam',
        density: 60, // kg/m³
        elasticity: 0.05e9, // Pa
        shearModulus: 0.02e9, // Pa
        compressiveStrength: 0.3e6, // Pa
        color: { safe: 0xFFFFCC, warning: 0xFF8C00, critical: 0xFF0000 },
        safetyFactor: 3.0
      }
    };

    // Component definitions with material assignments
    this.components = {
      wing: {
        name: 'Wing',
        material: 'spruce', // Spar
        ribMaterial: 'balsa',
        area: 3.5, // m²
        spanwise: 4.5, // m
        chord: 0.8, // m
        thickness: 0.08, // m
        criticalLoading: 'bending', // Primary loading type
        description: 'Spruce spar with balsa ribs'
      },
      boom: {
        name: 'Boom (Fuselage)',
        material: 'aluminum2024',
        diameter: 0.04, // m (40 mm)
        wallThickness: 0.002, // m (2 mm)
        length: 1.2, // m
        criticalLoading: 'compression',
        description: 'Aluminum 2024-T3 tube'
      },
      horizontalStabilizer: {
        name: 'Horizontal Stabilizer',
        material: 'spruce',
        ribMaterial: 'balsa',
        area: 0.8, // m²
        spanwise: 1.2, // m
        chord: 0.6, // m
        criticalLoading: 'bending',
        description: 'Spruce spar with balsa ribs'
      },
      verticalStabilizer: {
        name: 'Vertical Stabilizer',
        material: 'spruce',
        area: 0.4, // m²
        spanwise: 0.8, // m
        chord: 0.5, // m
        criticalLoading: 'shear',
        description: 'Spruce spar with balsa ribs'
      },
      ailerons: {
        name: 'Ailerons',
        material: 'foam',
        area: 0.3, // m² total
        thickness: 0.03, // m
        criticalLoading: 'compression',
        description: 'Polyurethane foam with aluminum leading edge'
      },
      elevator: {
        name: 'Elevator',
        material: 'foam',
        area: 0.2, // m²
        thickness: 0.025, // m
        criticalLoading: 'compression',
        description: 'Polyurethane foam with aluminum leading edge'
      },
      rudder: {
        name: 'Rudder',
        material: 'foam',
        area: 0.15, // m²
        thickness: 0.025, // m
        criticalLoading: 'compression',
        description: 'Polyurethane foam with aluminum leading edge'
      },
      landingGear: {
        name: 'Landing Gear',
        material: 'aluminum2024',
        tubeLength: 0.3, // m per strut
        diameter: 0.015, // m (15 mm diameter)
        criticalLoading: 'compression',
        description: 'Aluminum 2024-T3 spring struts'
      }
    };

    // Structural state tracking
    this.structuralState = {};
    this.stressHistory = {};
    this.failureWarnings = [];
    
    // Initialize state for all components
    this.initializeStructuralState();
  }

  /**
   * Initialize structural state tracking for all components
   */
  initializeStructuralState() {
    Object.entries(this.components).forEach(([key, component]) => {
      this.structuralState[key] = {
        stress: 0, // Pa
        strain: 0, // dimensionless
        deformation: 0, // m
        temperature: 293, // K (20°C)
        safetyMargin: 1.0, // ratio of allowable to actual stress
        healthFactor: 1.0, // 1.0 = perfect, 0 = failed
        color: this.materials[component.material].color.safe
      };
      this.stressHistory[key] = [];
    });
  }

  /**
   * Calculate aerodynamic loads on lifting surfaces
   * @param {number} lift - Total lift force (N)
   * @param {number} drag - Total drag force (N)
   * @param {number} gLoad - G-loading (multiple of gravity)
   * @param {number} rollingMoment - Rolling moment (N·m)
   * @param {number} pitchingMoment - Pitching moment (N·m)
   * @param {number} yawingMoment - Yawing moment (N·m)
   */
  calculateAerodynamicLoads(lift, drag, gLoad, rollingMoment, pitchingMoment, yawingMoment) {
    this.failureWarnings = [];

    // Wing bending stress (primary concern)
    this.analyzeWingStructure(lift, pitchingMoment, gLoad);
    
    // Boom compression/bending
    this.analyzeBoom(drag, gLoad);
    
    // Tail surface loads
    this.analyzeHorizontalStabilizer(pitchingMoment);
    this.analyzeVerticalStabilizer(yawingMoment, drag);
    
    // Control surface loads
    this.analyzeControlSurfaces(lift, rollingMoment, pitchingMoment, yawingMoment);
    
    // Landing gear loads (static when on ground)
    this.analyzeLandingGear(gLoad);
    
    return {
      structuralState: this.structuralState,
      warnings: this.failureWarnings,
      overallHealth: this.calculateOverallStructuralHealth()
    };
  }

  /**
   * Analyze wing structure under bending and shear loads
   * 
   * Bending stress in rectangular beam:
   * σ = M * c / I
   * where M = bending moment, c = distance to neutral axis, I = moment of inertia
   */
  analyzeWingStructure(lift, pitchingMoment, gLoad) {
    const wing = this.components.wing;
    const material = this.materials.spruce;
    
    // Wing root bending moment (cantilever beam)
    // Approximate: M = (L × b/2) where b = semi-span
    const semiSpan = wing.spanwise / 2;
    const wingBendingMoment = (lift * semiSpan) / 2 + Math.abs(pitchingMoment);
    
    // Approximate moment of inertia for spar
    // I ≈ (thickness * chord³) / 12
    const momentOfInertia = (wing.thickness * Math.pow(wing.chord, 3)) / 12;
    
    // Bending stress at root (critical location)
    const bendingStress = (wingBendingMoment * (wing.chord / 2)) / momentOfInertia;
    
    // Shear stress (V/A where V = shear force = lift)
    const shearStress = lift / (wing.thickness * wing.chord);
    
    // Combined stress (von Mises equivalent)
    const combinedStress = Math.sqrt(
      bendingStress ** 2 + 
      3 * shearStress ** 2 // Shear contribution
    );
    
    // Allowable stress with safety factor
    const allowableStress = material.tensileStrengthParallel / material.safetyFactor;
    const safetyMargin = allowableStress / Math.max(combinedStress, 1);
    
    // Elastic deflection (tip of cantilever)
    // δ = (F * L³) / (3 * E * I)
    const deflection = (lift * Math.pow(semiSpan, 3)) / 
                       (3 * material.elasticityParallel * momentOfInertia);
    
    // Strain = stress / Young's modulus
    const strain = combinedStress / material.elasticityParallel;
    
    // Health factor decreases with stress
    const healthFactor = Math.max(0, Math.min(1, 2 - safetyMargin));
    
    this.structuralState.wing = {
      stress: combinedStress,
      strain: strain,
      deformation: deflection,
      temperature: 293,
      safetyMargin: safetyMargin,
      healthFactor: healthFactor,
      color: this.getStressColor(safetyMargin, material)
    };
    
    if (safetyMargin < 1) {
      this.failureWarnings.push({
        component: 'Wing',
        severity: 'CRITICAL',
        message: `Wing stress critical: ${(combinedStress/1e6).toFixed(1)} MPa (limit: ${(allowableStress/1e6).toFixed(1)} MPa)`,
        safetyMargin: safetyMargin
      });
    } else if (safetyMargin < 1.5) {
      this.failureWarnings.push({
        component: 'Wing',
        severity: 'WARNING',
        message: `Wing stress elevated: ${(combinedStress/1e6).toFixed(1)} MPa`,
        safetyMargin: safetyMargin
      });
    }
  }

  /**
   * Analyze boom (fuselage) under axial and bending loads
   * 
   * For circular tube:
   * I = π * (D⁴ - d⁴) / 64
   */
  analyzeBoom(drag, gLoad) {
    const boom = this.components.boom;
    const material = this.materials.aluminum2024;
    
    // Axial stress from drag
    const crossSectionArea = Math.PI * 
      ((boom.diameter / 2) ** 2 - ((boom.diameter / 2) - boom.wallThickness) ** 2);
    
    const axialStress = drag / crossSectionArea;
    
    // Buckling check (Euler buckling for compression)
    // σ_critical = (π² * E * I) / (K * L)²
    // K = 1 for cantilever, K = 2 for pin-pin
    const momentOfInertia = Math.PI * 
      (Math.pow(boom.diameter / 2, 4) - Math.pow((boom.diameter / 2) - boom.wallThickness, 4)) / 64;
    
    const bucklingSafetyFactor = 2.0;
    const K = 2; // Effective length factor
    const criticalBucklingStress = (Math.PI ** 2 * material.elasticity * momentOfInertia) /
                                    (Math.pow(K * boom.length, 2) * crossSectionArea);
    
    const buckling = axialStress / criticalBucklingStress;
    
    // Allowable stress
    const allowableStress = material.yieldStrength / bucklingSafetyFactor;
    const safetyMargin = Math.min(
      allowableStress / Math.max(axialStress, 1),
      1 / buckling
    );
    
    // Strain
    const strain = axialStress / material.elasticity;
    
    const healthFactor = Math.max(0, Math.min(1, 2 - safetyMargin));
    
    this.structuralState.boom = {
      stress: axialStress,
      strain: strain,
      deformation: (drag / crossSectionArea / material.elasticity) * boom.length,
      temperature: 293,
      safetyMargin: safetyMargin,
      healthFactor: healthFactor,
      color: this.getStressColor(safetyMargin, material)
    };
    
    if (safetyMargin < 1) {
      this.failureWarnings.push({
        component: 'Boom',
        severity: 'CRITICAL',
        message: `Boom failure risk (buckling): ${(axialStress/1e6).toFixed(1)} MPa`,
        safetyMargin: safetyMargin
      });
    }
  }

  /**
   * Analyze horizontal stabilizer
   */
  analyzeHorizontalStabilizer(pitchingMoment) {
    const htail = this.components.horizontalStabilizer;
    const material = this.materials.spruce;
    
    // Tail loads from pitching moment
    const tailLoad = Math.abs(pitchingMoment) / (htail.spanwise / 2);
    
    const momentOfInertia = (htail.chord * Math.pow(0.05, 3)) / 12; // Assume 50mm depth
    const bendingStress = (tailLoad * (htail.spanwise / 2) * (0.025)) / momentOfInertia;
    
    const allowableStress = material.tensileStrengthParallel / material.safetyFactor;
    const safetyMargin = allowableStress / Math.max(bendingStress, 1);
    const strain = bendingStress / material.elasticityParallel;
    
    this.structuralState.horizontalStabilizer = {
      stress: bendingStress,
      strain: strain,
      deformation: (tailLoad * Math.pow(htail.spanwise / 2, 3)) / (3 * material.elasticityParallel * momentOfInertia),
      temperature: 293,
      safetyMargin: safetyMargin,
      healthFactor: Math.max(0, Math.min(1, 2 - safetyMargin)),
      color: this.getStressColor(safetyMargin, material)
    };
  }

  /**
   * Analyze vertical stabilizer
   */
  analyzeVerticalStabilizer(yawingMoment, drag) {
    const vtail = this.components.verticalStabilizer;
    const material = this.materials.spruce;
    
    const tailLoad = Math.abs(yawingMoment) / (vtail.spanwise / 2);
    const shearFromDrag = drag;
    
    const combinedLoad = Math.sqrt(tailLoad ** 2 + shearFromDrag ** 2);
    
    const momentOfInertia = (vtail.chord * Math.pow(0.04, 3)) / 12;
    const stress = (combinedLoad * (vtail.spanwise / 2)) / 
                   (vtail.chord * 0.04); // Approximate beam formula
    
    const allowableStress = material.tensileStrengthParallel / material.safetyFactor;
    const safetyMargin = allowableStress / Math.max(stress, 1);
    
    this.structuralState.verticalStabilizer = {
      stress: stress,
      strain: stress / material.elasticityParallel,
      deformation: 0.001,
      temperature: 293,
      safetyMargin: safetyMargin,
      healthFactor: Math.max(0, Math.min(1, 2 - safetyMargin)),
      color: this.getStressColor(safetyMargin, material)
    };
  }

  /**
   * Analyze control surfaces (foam with low stress tolerance)
   */
  analyzeControlSurfaces(lift, rollingMoment, pitchingMoment, yawingMoment) {
    const aileron = this.components.ailerons;
    const elevator = this.components.elevator;
    const rudder = this.components.rudder;
    
    const foamMaterial = this.materials.foam;
    
    // Aileron loads from rolling moment
    const aileronLoad = Math.abs(rollingMoment) / (aileron.area * 0.5); // Load per unit area
    const aileronStress = aileronLoad / aileron.area;
    const aileronSafetyMargin = (foamMaterial.compressiveStrength / foamMaterial.safetyFactor) / 
                               Math.max(aileronStress, 1);
    
    this.structuralState.ailerons = {
      stress: aileronStress,
      strain: aileronStress / foamMaterial.elasticity,
      deformation: 0.0001,
      temperature: 293,
      safetyMargin: aileronSafetyMargin,
      healthFactor: Math.max(0, Math.min(1, 2 - aileronSafetyMargin)),
      color: this.getStressColor(aileronSafetyMargin, foamMaterial)
    };
    
    // Elevator from pitching moment
    const elevatorLoad = Math.abs(pitchingMoment) / (elevator.area * 0.3);
    const elevatorStress = elevatorLoad / elevator.area;
    const elevatorSafetyMargin = (foamMaterial.compressiveStrength / foamMaterial.safetyFactor) / 
                                Math.max(elevatorStress, 1);
    
    this.structuralState.elevator = {
      stress: elevatorStress,
      strain: elevatorStress / foamMaterial.elasticity,
      deformation: 0.0001,
      temperature: 293,
      safetyMargin: elevatorSafetyMargin,
      healthFactor: Math.max(0, Math.min(1, 2 - elevatorSafetyMargin)),
      color: this.getStressColor(elevatorSafetyMargin, foamMaterial)
    };
    
    // Rudder from yawing moment
    const rudderLoad = Math.abs(yawingMoment) / (rudder.area * 0.25);
    const rudderStress = rudderLoad / rudder.area;
    const rudderSafetyMargin = (foamMaterial.compressiveStrength / foamMaterial.safetyFactor) / 
                              Math.max(rudderStress, 1);
    
    this.structuralState.rudder = {
      stress: rudderStress,
      strain: rudderStress / foamMaterial.elasticity,
      deformation: 0.0001,
      temperature: 293,
      safetyMargin: rudderSafetyMargin,
      healthFactor: Math.max(0, Math.min(1, 2 - rudderSafetyMargin)),
      color: this.getStressColor(rudderSafetyMargin, foamMaterial)
    };
  }

  /**
   * Analyze landing gear struts (impact and g-loading)
   */
  analyzeLandingGear(gLoad) {
    const gear = this.components.landingGear;
    const material = this.materials.aluminum2024;
    
    // Landing gear sees significant compression loads
    // Assume dual strut supporting 50% of weight each
    const mass = 4.0; // kg
    const weight = mass * 9.81 * gLoad;
    const forcePerStrut = weight / 2;
    
    const crossSectionArea = Math.PI * 
      ((gear.diameter / 2) ** 2 - ((gear.diameter / 2) - 0.0005) ** 2);
    
    const compressiveStress = forcePerStrut / Math.max(crossSectionArea, 0.0001);
    const allowableStress = material.yieldStrength / 1.5;
    const safetyMargin = allowableStress / Math.max(compressiveStress, 1);
    
    this.structuralState.landingGear = {
      stress: compressiveStress,
      strain: compressiveStress / material.elasticity,
      deformation: (compressiveStress / material.elasticity) * gear.tubeLength,
      temperature: 293,
      safetyMargin: safetyMargin,
      healthFactor: Math.max(0, Math.min(1, 2 - safetyMargin)),
      color: this.getStressColor(safetyMargin, material)
    };
  }

  /**
   * Get color based on stress level (safety margin)
   * Green: Safe (SM > 1.5)
   * Yellow: Warning (1.0 < SM < 1.5)
   * Red: Critical (SM < 1.0)
   */
  getStressColor(safetyMargin, material) {
    if (safetyMargin > 1.5) {
      return material.color.safe; // Green
    } else if (safetyMargin > 1.0) {
      return material.color.warning; // Yellow/Orange
    } else {
      return material.color.critical; // Red
    }
  }

  /**
   * Calculate overall structural health (0 = failed, 1 = perfect)
   */
  calculateOverallStructuralHealth() {
    const healthFactors = Object.values(this.structuralState)
      .map(state => state.healthFactor);
    
    return healthFactors.length > 0 
      ? healthFactors.reduce((a, b) => a + b, 0) / healthFactors.length
      : 1.0;
  }

  /**
   * Get material properties
   */
  getMaterialProperties(materialName) {
    return this.materials[materialName] || null;
  }

  /**
   * Get component definition
   */
  getComponent(componentName) {
    return this.components[componentName] || null;
  }

  /**
   * Get all components
   */
  getAllComponents() {
    return this.components;
  }

  /**
   * Generate structural analysis report
   */
  generateReport(structuralAnalysis) {
    const report = {
      timestamp: new Date().toISOString(),
      overallHealth: structuralAnalysis.overallHealth,
      criticalComponents: this.failureWarnings.filter(w => w.severity === 'CRITICAL'),
      warningComponents: this.failureWarnings.filter(w => w.severity === 'WARNING'),
      componentStatus: Object.entries(structuralAnalysis.structuralState).map(([name, state]) => ({
        component: name,
        stress: `${(state.stress / 1e6).toFixed(2)} MPa`,
        safetyMargin: state.safetyMargin.toFixed(2),
        healthFactor: `${(state.healthFactor * 100).toFixed(1)}%`,
        deformation: `${(state.deformation * 1000).toFixed(2)} mm`
      }))
    };
    
    return report;
  }
}

export default StructuralAnalyzer;
