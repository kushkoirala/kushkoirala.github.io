/**
 * Aerodynamic Calculations for Aircraft Simulation
 * Based on Roskam's empirical methods and standard aerodynamic theory
 * 
 * This module calculates lift, drag, and other aerodynamic forces
 * for your aircraft based on flight conditions
 */

import { weightModel } from './weightModel.js';

export class AerodynamicCalculator {
  /**
   * Initialize with aircraft parameters
   * Values calibrated for Udaan aircraft
   */
  constructor(config = {}) {
    // Wing parameters
    this.wingArea = config.wingArea || 3.5;        // m² - planform area
    this.wingSpan = config.wingSpan || 5.2;        // m - span
    this.wingChord = config.wingChord || 0.67;     // m - average chord
    this.wingIncidence = config.wingIncidence || 2 * Math.PI / 180;  // rad - angle

    // Fuselage parameters
    this.fuselageLength = config.fuselageLength || 1.8;     // m
    this.fuselageDiameter = config.fuselageDiameter || 0.2; // m
    this.fuselageArea = config.fuselageArea || 1.2;         // m²

    // Tail parameters
    this.horzTailArea = config.horzTailArea || 0.8;  // m²
    this.vertTailArea = config.vertTailArea || 0.5;  // m²

    // Aircraft mass - use accurate weight model including pilot
    this.totalMass = config.totalMass || weightModel.getTotalWeight();  // kg with pilot
    this.emptyMass = config.emptyMass || weightModel.getEmptyWeight(); // kg empty
    this.mass = this.totalMass; // Default to total mass for flight calculations

    // Environmental conditions
    this.density = config.density || 1.225;  // kg/m³ at sea level
    this.gravity = config.gravity || 9.81;   // m/s²

    // Aerodynamic coefficients
    this.CLα = config.CLα || 5.73;    // Lift curve slope (1/rad)
    this.CL0 = config.CL0 || 0.2;     // Zero-lift coefficient
    this.CLmax = config.CLmax || 1.4; // Maximum lift coefficient
    this.CD0 = config.CD0 || 0.025;   // Parasitic drag coefficient
    this.e = config.e || 0.92;        // Oswald efficiency factor

    // Derived parameters
    this.aspectRatio = (this.wingSpan ** 2) / this.wingArea;
  }

  /**
   * Calculate lift coefficient from angle of attack
   * Uses linear approximation with stall effects
   * 
   * @param {number} angleOfAttack - in radians
   * @returns {number} CL value
   */
  calculateCL(angleOfAttack) {
    // Linear lift formula: CL = CL0 + CLα × α
    let CL = this.CL0 + this.CLα * angleOfAttack;

    // Account for stall (post-stall behavior)
    const stallAngle = Math.asin(1 / this.CLα);  // Angle at CLmax
    
    if (angleOfAttack > stallAngle) {
      // Post-stall: drop to near-zero with hysteresis
      const postStallFactor = Math.exp(-10 * (angleOfAttack - stallAngle));
      CL = this.CLmax * postStallFactor;
    } else if (angleOfAttack < -stallAngle * 0.8) {
      // Negative stall
      CL = -this.CLmax * 0.6;
    }

    // Clamp to reasonable limits
    CL = Math.max(-this.CLmax, Math.min(this.CLmax, CL));

    return CL;
  }

  /**
   * Calculate drag coefficient
   * Includes both parasitic (CD0) and induced (CDi) drag
   * 
   * @param {number} CL - Lift coefficient
   * @returns {number} CD value
   */
  calculateCD(CL) {
    // Induced drag: CDi = CL² / (π × e × AR)
    const CDi = (CL ** 2) / (Math.PI * this.e * this.aspectRatio);

    // Total drag
    const CD = this.CD0 + CDi;

    return CD;
  }

  /**
   * Calculate moment coefficient (pitch stability)
   * 
   * @param {number} CL - Lift coefficient
   * @returns {number} Cm value
   */
  calculateCm(CL) {
    // Simplified pitch moment - proportional to lift
    // More negative = nose-down stability
    const Cm0 = -0.05;  // Zero-lift moment
    const Cmα = -0.15;  // Pitch stability

    return Cm0 + Cmα * CL;
  }

  /**
   * Calculate side force coefficient (yaw effects)
   * 
   * @param {number} yawRate - in rad/s
   * @returns {number} CY value
   */
  calculateCY(yawRate) {
    // Side force proportional to yaw rate
    return yawRate * 0.1;
  }

  /**
   * Calculate all aerodynamic coefficients for current flight state
   * 
   * @param {number} airspeed - m/s
   * @param {number} angleOfAttack - radians
   * @param {number} pitch - radians (not directly used in coefficient calculation)
   * @param {number} roll - radians
   * @param {number} yaw - radians (not directly used)
   * @param {number} yawRate - rad/s
   * @returns {Object} {CL, CD, Cm, CY}
   */
  calculateCoefficients(airspeed, angleOfAttack, pitch, roll, yaw, yawRate = 0) {
    const CL = this.calculateCL(angleOfAttack);
    const CD = this.calculateCD(CL);
    const Cm = this.calculateCm(CL);
    const CY = this.calculateCY(yawRate);

    return { CL, CD, Cm, CY };
  }

  /**
   * Calculate aerodynamic forces from coefficients
   * 
   * @param {number} airspeed - m/s
   * @param {number} CL - Lift coefficient
   * @param {number} CD - Drag coefficient
   * @param {number} CY - Side force coefficient
   * @returns {Object} {lift, drag, sideForce} in Newtons
   */
  calculateForces(airspeed, CL, CD, CY) {
    // Dynamic pressure: q = 0.5 × ρ × V²
    const q = 0.5 * this.density * (airspeed ** 2);

    // Forces = Coefficient × Dynamic Pressure × Reference Area
    const lift = q * this.wingArea * CL;
    const drag = q * this.wingArea * CD;
    const sideForce = q * this.wingArea * CY;

    return { lift, drag, sideForce };
  }

  /**
   * Calculate power required for level flight
   * Based on thrust required for equilibrium
   * 
   * @param {number} airspeed - m/s
   * @returns {Object} {thrust, power} - thrust in N, power in W
   */
  calculatePowerRequired(airspeed) {
    const weight = this.mass * this.gravity;
    
    // At level flight: Thrust = Drag, Lift = Weight
    // For given weight, find required lift coefficient
    const q = 0.5 * this.density * (airspeed ** 2);
    const CLrequired = weight / (q * this.wingArea);

    // Drag at this lift coefficient
    const CDrequired = this.calculateCD(CLrequired);
    const draginForce = q * this.wingArea * CDrequired;

    // Required thrust equals drag
    const thrust = draginForce;

    // Power = Thrust × Velocity
    const power = thrust * airspeed;

    return { thrust, power };
  }

  /**
   * Calculate stall speed (minimum controllable airspeed)
   * 
   * @param {number} weight - kg (optional, uses this.mass if not provided)
   * @returns {number} Stall speed in m/s
   */
  calculateStallSpeed(weight = null) {
    if (weight === null) {
      weight = this.mass * this.gravity;
    } else {
      weight = weight * this.gravity;
    }

    // Vs = sqrt(2 × W / (ρ × S × CLmax))
    const stallSpeed = Math.sqrt(
      (2 * weight) / (this.density * this.wingArea * this.CLmax)
    );

    return stallSpeed;
  }

  /**
   * Calculate cruise speed at given power
   * Iteratively solves for airspeed where power required equals power available
   * 
   * @param {number} powerAvailable - Watts
   * @returns {number} Cruise speed in m/s
   */
  calculateCruiseSpeed(powerAvailable = 1500) {
    let airspeed = 15;  // Initial guess (m/s)
    
    // Iterative solution
    for (let iteration = 0; iteration < 20; iteration++) {
      const { power } = this.calculatePowerRequired(airspeed);
      const error = power - powerAvailable;

      // Check convergence
      if (Math.abs(error) < 10) break;

      // Newton's method: adjust airspeed based on error
      // Power is roughly proportional to V³, so derivative ≈ 3 × power / V
      const derivative = Math.max(1, 3 * power / airspeed);
      airspeed = Math.max(this.calculateStallSpeed(), airspeed - error / derivative);
    }

    return airspeed;
  }

  /**
   * Calculate angle of attack from pitch and climb angle
   * 
   * @param {number} pitchAngle - radians
   * @param {number} flightPathAngle - radians (climb angle)
   * @returns {number} AOA in radians
   */
  calculateAOA(pitchAngle, flightPathAngle = 0) {
    return pitchAngle - flightPathAngle;
  }

  /**
   * Calculate wing loading (weight per unit wing area)
   * 
   * @returns {number} Wing loading in N/m²
   */
  getWingLoading() {
    const weight = this.mass * this.gravity;
    return weight / this.wingArea;
  }

  /**
   * Calculate dynamic pressure at given airspeed
   * 
   * @param {number} airspeed - m/s
   * @returns {number} Dynamic pressure in Pa
   */
  getDynamicPressure(airspeed) {
    return 0.5 * this.density * (airspeed ** 2);
  }

  /**
   * Calculate climb rate based on excess power
   * Excess power = (Available Power - Required Power) / Weight
   * Climb rate ≈ Excess Power / Gravity
   * 
   * @param {number} airspeed - m/s
   * @param {number} powerAvailable - Watts
   * @returns {number} Maximum climb rate in m/s
   */
  calculateMaxClimbRate(airspeed, powerAvailable = 1500) {
    const { power: powerRequired } = this.calculatePowerRequired(airspeed);
    const excessPower = Math.max(0, powerAvailable - powerRequired);
    const weight = this.mass * this.gravity;

    // Climb rate = Excess Power / Weight
    const climbRate = excessPower / weight;

    return climbRate;
  }

  /**
   * Calculate g-load (load factor) from forces
   * 
   * @param {number} lift - Newtons
   * @returns {number} g-load (lift / weight)
   */
  calculateGLoad(lift) {
    const weight = this.mass * this.gravity;
    return lift / weight;
  }

  /**
   * Calculate turn rate at given airspeed
   * Assumes level turn with specified bank angle
   * 
   * @param {number} airspeed - m/s
   * @param {number} bankAngle - radians
   * @returns {number} Turn rate in rad/s
   */
  calculateTurnRate(airspeed, bankAngle) {
    const g = this.gravity;
    // Turn rate = g × tan(bank) / airspeed
    const turnRate = (g * Math.tan(bankAngle)) / airspeed;
    return turnRate;
  }

  /**
   * Get summary of current aerodynamic state
   * 
   * @param {number} airspeed - m/s
   * @param {number} angleOfAttack - radians
   * @param {number} powerAvailable - Watts
   * @returns {Object} Summary of aerodynamic state
   */
  getSummary(airspeed, angleOfAttack, powerAvailable = 1500) {
    const { CL, CD, Cm, CY } = this.calculateCoefficients(airspeed, angleOfAttack, 0, 0, 0);
    const { lift, drag, sideForce } = this.calculateForces(airspeed, CL, CD, CY);
    const { power: powerRequired } = this.calculatePowerRequired(airspeed);
    const stallSpeed = this.calculateStallSpeed();
    const cruiseSpeed = this.calculateCruiseSpeed(powerAvailable);
    const climbRate = this.calculateMaxClimbRate(airspeed, powerAvailable);
    const gLoad = this.calculateGLoad(lift);

    return {
      airspeed: parseFloat(airspeed.toFixed(2)),
      angleOfAttack: parseFloat((angleOfAttack * 180 / Math.PI).toFixed(2)),
      CL: parseFloat(CL.toFixed(3)),
      CD: parseFloat(CD.toFixed(4)),
      Cm: parseFloat(Cm.toFixed(4)),
      lift: parseFloat(lift.toFixed(2)),
      drag: parseFloat(drag.toFixed(2)),
      sideForce: parseFloat(sideForce.toFixed(2)),
      powerRequired: parseFloat(powerRequired.toFixed(0)),
      powerAvailable,
      stallSpeed: parseFloat(stallSpeed.toFixed(2)),
      cruiseSpeed: parseFloat(cruiseSpeed.toFixed(2)),
      climbRate: parseFloat((climbRate * 60).toFixed(1)),  // Convert to m/min
      gLoad: parseFloat(gLoad.toFixed(2))
    };
  }

  /**
   * Get weight and mass properties of the aircraft
   */
  getWeightReport() {
    const report = weightModel.getDetailedReport();
    return {
      emptyWeight: parseFloat(report.emptyWeight),
      payloadWeight: report.payloadWeight,
      totalWeight: parseFloat(report.totalWeight),
      breakdown: report.breakdown,
      centerOfGravity: weightModel.getCenterOfGravity(),
      weightDistribution: weightModel.getWeightDistribution()
    };
  }
}

export default AerodynamicCalculator;
