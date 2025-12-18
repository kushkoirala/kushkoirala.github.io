import React, { useState, useMemo } from 'react';
import { 
  Gauge, Wind, Thermometer, Activity, 
  ArrowLeft, ChevronsLeft, Settings, Volume2, Info, Cpu, Zap, Menu, X, Plus
} from 'lucide-react';
import EngineBuilder from './EngineBuilder';

// --- 1. Physics & Math Models ---

// Constants
const R_GAS = 287;
const GAMMA_C = 1.37; // Compressor
const GAMMA_F = 1.4;  // Fan
const GAMMA_T = 1.33; // Turbine
const GAMMA_N = 1.36; // Nozzle
const GAMMA_AIR = 1.4;

const CP_C = (GAMMA_C * R_GAS) / (GAMMA_C - 1);
const CP_F = (GAMMA_F * R_GAS) / (GAMMA_F - 1);
const CP_T = (GAMMA_T * R_GAS) / (GAMMA_T - 1);
const CP_N = (GAMMA_N * R_GAS) / (GAMMA_N - 1);

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

const normalShockM2 = (M1, gamma = GAMMA_AIR) => {
  const numerator = 1 + 0.5 * (gamma - 1) * M1 * M1;
  const denominator = gamma * M1 * M1 - 0.5 * (gamma - 1);
  return Math.sqrt(Math.max(1e-6, numerator / denominator));
};

const normalShockTotalPressureRatio = (M1, gamma = GAMMA_AIR) => {
  const P2P1 = 1 + (2 * gamma / (gamma + 1)) * (M1 * M1 - 1);
  const M2 = normalShockM2(M1, gamma);
  const P0_1P1 = Math.pow(1 + 0.5 * (gamma - 1) * M1 * M1, gamma / (gamma - 1));
  const P0_2P2 = Math.pow(1 + 0.5 * (gamma - 1) * M2 * M2, gamma / (gamma - 1));
  const ratio = (P2P1 * P0_2P2) / P0_1P1;
  return { ratio, M2 };
};

const solveObliqueShockBeta = (M, thetaRad, gamma = GAMMA_AIR) => {
  if (thetaRad <= 0 || M <= 1) return Math.asin(1 / Math.max(M, 1.01)) + 0.05;
  let bestBeta = Math.asin(1 / M) + 0.01;
  let bestErr = Infinity;
  const start = thetaRad + 0.01;
  const end = Math.PI / 2 - 0.01;
  for (let i = 0; i < 200; i++) {
    const beta = start + (i / 199) * (end - start);
    const lhs = Math.tan(thetaRad);
    const rhs = (2 * Math.pow(Math.sin(beta), -1) * (M * M * Math.sin(beta) * Math.sin(beta) - 1)) 
      / (M * M * (gamma + Math.cos(2 * beta)) + 2);
    const diff = Math.abs(lhs - rhs);
    if (diff < bestErr) {
      bestErr = diff;
      bestBeta = beta;
    }
  }
  return bestBeta;
};

const computeInletLosses = (mach, inletType, shockAngleDeg, supersonicDeflections) => {
  if (inletType !== 'supersonic' || mach <= 1.0) {
    const subRec = clamp(0.995 - 0.02 * mach, 0.96, 0.995);
    return { recovery: subRec, machExit: Math.max(0.2, mach), betaDeg: null, note: 'Subsonic diffuser' };
  }

  if (mach < 1.02) {
    const rec = clamp(0.98 - 0.02 * (mach - 1), 0.94, 0.98);
    return { recovery: rec, machExit: 0.7, betaDeg: null, note: 'Transonic fallback' };
  }

  const deflections = (supersonicDeflections && supersonicDeflections.length) ? supersonicDeflections : [shockAngleDeg || 6];
  const inletPlan = designSupersonicInlet(mach, deflections);
  const subRec = clamp(0.995 - 0.02 * Math.max(inletPlan.machExit, 0.2), 0.94, 0.995);
  const recovery = clamp(inletPlan.totalP0Ratio * subRec, 0.6, 0.98);
  return {
    recovery,
    machExit: Math.max(0.2, inletPlan.machExit),
    betaDeg: inletPlan.shocks[0]?.betaDeg ?? null,
    note: 'Multi-ramp supersonic inlet',
    shocks: inletPlan.shocks,
    totalP0Ratio: inletPlan.totalP0Ratio
  };
};

// Multi-ramp supersonic inlet estimator (simple 2D shocks)
const designSupersonicInlet = (mach, deflectionsDeg = [6, 6], gamma = GAMMA_AIR) => {
  let M = mach;
  let totalP0Ratio = 1;
  const shocks = [];
  for (const thetaDeg of deflectionsDeg) {
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const beta = solveObliqueShockBeta(M, thetaRad, gamma);
    const Mn1 = M * Math.sin(beta);
    const { ratio: p0ratio, M2: Mn2 } = normalShockTotalPressureRatio(Mn1, gamma);
    const M2 = Mn2 / Math.max(Math.sin(beta - thetaRad), 0.1);
    totalP0Ratio *= p0ratio;
    shocks.push({
      thetaDeg,
      betaDeg: (beta * 180) / Math.PI,
      Mn1,
      Mn2,
      M2,
      p0ratio
    });
    M = M2;
    if (M <= 1) break;
  }
  const hasNormal = M > 1;
  if (hasNormal) {
    const { ratio: normalP0, M2 } = normalShockTotalPressureRatio(M, gamma);
    totalP0Ratio *= normalP0;
    shocks.push({
      thetaDeg: 0,
      betaDeg: 90,
      Mn1: M,
      Mn2: M2,
      M2,
      normal: true
    });
    M = M2;
  }
  return { shocks, machExit: M, totalP0Ratio };
};

const logSum = (db, count) => {
  if (!isFinite(db) || count <= 0) return db;
  return 10 * Math.log10(Math.max(1e-12, count * Math.pow(10, db / 10)));
};

// Utility: A-weighting (IEC 61672) in dB for a given frequency (Hz)
const aWeightDb = (freqHz) => {
  const f2 = freqHz * freqHz;
  const ra = (
    (12194 ** 2) * (f2 ** 2)
  ) / (
    (f2 + 20.6 ** 2)
    * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2))
    * (f2 + 12194 ** 2)
  );
  const a = 20 * Math.log10(ra) + 2.00;
  return isFinite(a) ? a : 0;
};

// Utility: simple atmospheric absorption (ISO 9613-ish, broadband approx)
const atmosphericAbsorptionDb = (freqHz, distanceM) => {
  const alphaDbPerM = 0.0001 * Math.pow(Math.max(freqHz, 50) / 1000, 1.7);
  return alphaDbPerM * Math.max(distanceM, 1);
};

// Efficiencies
const ETA_D = 0.97; // Diffuser
const ETA_F = 0.85; // Fan
const ETA_C = 0.85; // Compressor
const ETA_B = 1.0;  // Burner (Pressure loss handled in PrB)
const ETA_T = 0.90; // Turbine
const ETA_N = 0.98; // Nozzle

// Standard Atmosphere Model (up to 11km/36090ft)
const getAtmosphere = (altitudeFt, deltaIsa = 0) => {
  const h_m = altitudeFt * 0.3048;
  // Troposphere model
  const T0 = 288.15;
  const P0 = 101325;
  const L = 0.0065; // K/m lapse rate
  const g = 9.80665;
  const R = 287.05;

  let T_std = T0 - L * h_m;
  if (h_m > 11000) T_std = 216.65; // Stratosphere (simplified)
  
  const T = T_std + deltaIsa;
  
  // Pressure (simplified hydrostatic)
  let P = P0 * Math.pow((1 - L * h_m / T0), (g / (R * L)));
  if (h_m > 11000) {
      // Stratosphere pressure model
      const P_11km = 22632;
      P = P_11km * Math.exp(-g * (h_m - 11000) / (R * 216.65));
  }

  const rho = P / (R * T);
  const a = Math.sqrt(1.4 * R * T); // Speed of sound

  return { T, P, rho, a };
};

const DEFAULT_ENGINES = {
  'TFE731-2': {
    name: 'Honeywell TFE731-2',
    type: 'subsonic',
    designCruiseMach: 0.8,
    massFlowSl: 51.25, // kg/s (approx 113 lb/s)
    bpr: 2.8,
    prC: 14.0, // Compressor Pressure Ratio
    prF: 1.6,  // Fan Pressure Ratio
    t04_max: 1250, // Turbine Inlet Temp (K)
    fanDia: 1.0, // meters
    tsfc_ref: 0.5
  },
  'CFM56-7B': {
    name: 'CFM56-7B',
    type: 'subsonic',
    designCruiseMach: 0.78,
    massFlowSl: 350, // kg/s
    bpr: 5.3,
    prC: 32.0,
    prF: 1.7,
    t04_max: 1550,
    fanDia: 1.55,
    tsfc_ref: 0.38
  },
  'GE90-115B': {
    name: 'GE90-115B',
    type: 'subsonic',
    designCruiseMach: 0.84,
    massFlowSl: 1350, // kg/s
    bpr: 9.0,
    prC: 42.0,
    prF: 1.65,
    t04_max: 1750,
    fanDia: 3.25,
    tsfc_ref: 0.29
  },
  'Symphony': {
    name: 'Boom Symphony (dev)',
    type: 'supersonic',
    designCruiseMach: 0.95,
    designSupercruiseMach: 1.7,
    massFlowSl: 260,
    bpr: 3.0,
    prC: 24.0,
    prF: 1.8,
    t04_max: 1650,
    fanDia: 1.35,
    tsfc_ref: 0.6
  }
};

const AIRCRAFT_PROFILES = {
  'Symphony': [
    { id: 'single', name: 'Single Engine (dev rig)', engines: 1 },
    { id: 'overture', name: 'Overture (4 engines)', engines: 4 }
  ]
};

const getDefaultAircraft = (engineKey) => {
  const opts = AIRCRAFT_PROFILES[engineKey];
  if (opts && opts.length) return opts[0];
  return { id: 'single', name: 'Single Engine', engines: 1 };
};

// --- Core Calculation Function (Pure) ---
const calculatePerformance = (engineSpecs, flightCond, n1, observer, componentDesign = null) => {
    const { altitude, mach, deltaIsa } = flightCond;
    const { dist, angle } = observer;
    const atm = getAtmosphere(altitude, deltaIsa);
    const {
      inletType = 'subsonic',
      shockAngle = 12,
      supersonicDeflections = [],
      compressorStages = 8,
      turbineStages = 2,
      coolingBleed = 0
    } = componentDesign || {};
    const etaT_eff = Math.min(0.92, ETA_T + (Math.max(1, turbineStages) - 1) * 0.005);
    
    // 1. Flight Conditions
    const v_flight = mach * atm.a; // m/s
    const Ta = atm.T;
    const Pa = atm.P;
    const inletDetails = computeInletLosses(mach, inletType, shockAngle, supersonicDeflections);
    const inletRecoveryEffective = inletDetails.recovery * ETA_D;

    // 2. Thermodynamic Cycle Analysis (Parametric)
    
    // Throttle sets T04 (Turbine Inlet Temp)
    const throttle = Math.max(n1, 20) / 100;
    const T04 = Ta + (engineSpecs.t04_max - Ta) * Math.pow(throttle, 1.5); 

    // --- Diffuser (Inlet) ---
    const T02 = Ta * (1 + 0.5 * (GAMMA_C - 1) * mach * mach);
    const P0_free = Pa * Math.pow(1 + 0.5 * (GAMMA_C - 1) * mach * mach, GAMMA_C / (GAMMA_C - 1));
    const P02 = P0_free * inletRecoveryEffective;

    // --- Fan ---
    const P08 = P02 * engineSpecs.prF;
    const T08 = T02 * (1 + (1 / ETA_F) * (Math.pow(engineSpecs.prF, (GAMMA_F - 1) / GAMMA_F) - 1));

    // --- Compressor ---
    const etaC_eff = (() => {
        const stages = Math.max(1, compressorStages);
        const prPerStage = Math.pow(engineSpecs.prC, 1 / stages);
        const loadingPenalty = Math.max(0, prPerStage - 1.4) * 0.05;
        return Math.max(0.78, Math.min(0.88, ETA_C - loadingPenalty));
    })();
    const P03 = P02 * engineSpecs.prC;
    const T03 = T02 * (1 + (1 / etaC_eff) * (Math.pow(engineSpecs.prC, (GAMMA_C - 1) / GAMMA_C) - 1));

    // --- Burner ---
    const P04 = P03 * 0.96;

    // --- Turbine ---
    const work_comp = CP_C * (T03 - T02);
    const work_fan = engineSpecs.bpr * CP_F * (T08 - T02);
    const work_turb_req = work_comp + work_fan;
    
    const delta_T_turb = work_turb_req / CP_T;
    const T05 = T04 - delta_T_turb;

    let P05 = 0;
    if (T05 < T04) {
        const term = 1 - (1 / etaT_eff) * (1 - T05 / T04);
        if (term > 0) {
            P05 = P04 * Math.pow(term, GAMMA_T / (GAMMA_T - 1));
        }
    }

    // --- Nozzles (Core & Fan) ---
    let UeC = 0;
    if (P05 > Pa) {
        const expansion = Math.max(0, 1 - Math.pow(Pa / P05, (GAMMA_N - 1) / GAMMA_N));
        if (expansion > 0) {
            UeC = Math.sqrt(Math.max(0, 2 * ETA_N * CP_N * T05 * expansion));
        }
    }

    let UeF = 0;
    if (P08 > Pa) {
        const expansion = Math.max(0, 1 - Math.pow(Pa / P08, (GAMMA_F - 1) / GAMMA_F));
        if (expansion > 0) {
            UeF = Math.sqrt(Math.max(0, 2 * ETA_N * CP_F * T08 * expansion));
        }
    }

    // --- Thrust & Mass Flow ---
    const delta_inlet = P02 / 101325;
    const theta_inlet = T02 / 288.15;
    const m_dot_total = engineSpecs.massFlowSl * (delta_inlet / Math.sqrt(theta_inlet)) * throttle;
    
    const bleedFrac = Math.min(Math.max(coolingBleed / 100, 0), 0.2);
    const m_dot_core_raw = m_dot_total / (1 + engineSpecs.bpr);
    const m_dot_core = m_dot_core_raw * (1 - bleedFrac);
    const m_dot_fan = m_dot_total - m_dot_core_raw;

    // Gross Thrust components (mixed or separate)
    const isMixedFlow = engineSpecs.mixedFlow ?? engineSpecs.bpr <= 5;
    let Ue_mix = 0;
    let F_gross_N = 0;
    if (isMixedFlow) {
        const totalMdot = m_dot_core + m_dot_fan;
        const energyWeightedVel = Math.sqrt(
            Math.max(0, ((m_dot_core * UeC * UeC) + (m_dot_fan * UeF * UeF)) / Math.max(totalMdot, 1e-6))
        );
        Ue_mix = energyWeightedVel;
        F_gross_N = totalMdot * Ue_mix;
    } else {
        F_gross_N = (m_dot_core * UeC) + (m_dot_fan * UeF);
    }
    const Ram_Drag_N = m_dot_total * v_flight;
    
    // Net Thrust
    let F_net_N = F_gross_N - Ram_Drag_N;
    if (F_net_N < 0) F_net_N = 0;

    const F_net_lbf = F_net_N * 0.224809;
    const F_gross_lbf = F_gross_N * 0.224809;
    const Ram_Drag_lbf = Ram_Drag_N * 0.224809;

    // Fuel Flow
    const Q_R = 43e6; // J/kg
    const heat_input = m_dot_core * CP_T * (T04 - T03); 
    const fuel_flow_kg_s = heat_input / Q_R;
    const fuel_flow_lb_hr = fuel_flow_kg_s * 2.20462 * 3600;

    // TSFC (kg/(kN·s))
    const tsfc_curr = F_net_N > 10 ? fuel_flow_kg_s / (F_net_N / 1000) : 0;

    // --- Efficiencies & Work Terms ---
    // Thermal Efficiency: (Kinetic Energy Added) / (Heat Input)
    // Power Jet = 0.5 * m_core * (UeC^2 - V^2) + 0.5 * m_fan * (UeF^2 - V^2)
    const power_jet_core = 0.5 * m_dot_core * (UeC * UeC - v_flight * v_flight);
    const power_jet_fan = 0.5 * m_dot_fan * (UeF * UeF - v_flight * v_flight);
    const power_jet_total = power_jet_core + power_jet_fan;
    
    const heat_power = fuel_flow_kg_s * Q_R; // Watts
    const eta_thermal = heat_power > 0 ? power_jet_total / heat_power : 0;

    // Propulsive Efficiency: (Thrust Power) / (Jet Power)
    // Thrust Power = F_net * V_flight
    const power_thrust = F_net_N * v_flight;
    const eta_propulsive = power_jet_total > 0 ? power_thrust / power_jet_total : 0;

    const eta_overall = eta_thermal * eta_propulsive;

    // Back Work Ratio (Compressor Work / Turbine Work)
    // Note: Turbine drives both Fan and Compressor. 
    // BWR usually refers to Core Compressor Work / Total Turbine Work
    const bwr = work_turb_req > 0 ? work_comp / work_turb_req : 0;

    // --- Acoustics (Lighthill + A-weighting + absorption) ---
    const dist_attn = 20 * Math.log10(dist);
    const v_jet_eff = isMixedFlow ? Ue_mix : UeC; 
    
    // Source Levels (at 1m, no directivity)
    let spl_jet_source = 135 + 80 * Math.log10(Math.max(v_jet_eff, 10) / 340);
    
    const fan_rpm = (n1 / 100) * (engineSpecs.name.includes('TFE') ? 11000 : engineSpecs.name.includes('CFM') ? 5175 : 2550);
    const v_tip = Math.PI * engineSpecs.fanDia * (fan_rpm / 60);
    
    let spl_fan_source = 130 + 60 * Math.log10(Math.max(v_tip, 10) / 340);

    // Representative frequencies for weighting and absorption
    const jet_freq = Math.min(800, Math.max(80, v_jet_eff / 2)); // crude proxy
    const bladeCount = 24;
    const fan_freq = Math.max(50, (bladeCount * fan_rpm) / 60); // BPF estimate

    // Supplemental velocity/area acoustic model
    const a0 = Math.sqrt(GAMMA_AIR * R_GAS * Ta);
    const rho_exit = P05 > 0 && T05 > 0 ? P05 / (R_GAS * T05) : atm.rho;
    const Ae_core = Math.max(0.01, m_dot_core / (Math.max(rho_exit, 1e-6) * Math.max(UeC, 1)));
    const Ae_fan = Math.max(0.01, Math.PI * Math.pow(engineSpecs.fanDia / 2, 2));
    const intensityFromVelocity = (Ue, Ae) => {
        if (!isFinite(Ue) || Ue <= 0 || !isFinite(Ae) || Ae <= 0 || !isFinite(dist) || dist <= 0) return null;
        const Me = Ue / Math.max(a0, 1e-3);
        let acousticPower;
        if (Me < 2) {
            acousticPower = 1e-4 * atm.rho * Math.pow(Ue, 8) * Ae / Math.pow(a0, 5);
        } else {
            acousticPower = 0.003 * atm.rho * Math.pow(Me, 3) * Ae * Math.pow(a0, 3);
        }
        const I = acousticPower / (4 * Math.PI * Math.pow(dist, 2));
        if (!isFinite(I) || I <= 0) return null;
        return 10 * Math.log10(I / 1e-12);
    };
    const spl_jet_model = intensityFromVelocity(UeC, Ae_core);
    const spl_fan_model = intensityFromVelocity(UeF, Ae_fan);
    if (isFinite(spl_jet_model)) spl_jet_source = spl_jet_model + dist_attn;
    if (isFinite(spl_fan_model)) spl_fan_source = spl_fan_model + dist_attn;

    // Observer SPL with directivity
    let spl_jet = spl_jet_source - dist_attn;
    const angle_rad = angle * (Math.PI / 180);
    spl_jet += 10 * Math.log10(Math.pow(Math.sin(angle_rad/2), 4) + 0.1);

    let spl_fan = spl_fan_source - dist_attn;
    spl_fan += 5 * Math.cos(2 * angle_rad);

    // Apply atmospheric absorption and A-weighting
    const absorbJet = atmosphericAbsorptionDb(jet_freq, dist);
    const absorbFan = atmosphericAbsorptionDb(fan_freq, dist);
    const spl_jet_a = spl_jet + aWeightDb(jet_freq) - absorbJet;
    const spl_fan_a = spl_fan + aWeightDb(fan_freq) - absorbFan;

    const spl_total = 10 * Math.log10(Math.max(1e-12, Math.pow(10, spl_jet/10) + Math.pow(10, spl_fan/10)));
    const spl_total_a = 10 * Math.log10(Math.max(1e-12, Math.pow(10, spl_jet_a/10) + Math.pow(10, spl_fan_a/10)));

    return {
      atm,
      v_flight,
      F_net: F_net_N,
      F_gross: F_gross_N,
      Ram_Drag: Ram_Drag_N,
      F_net_lbf,
      F_gross_lbf,
      Ram_Drag_lbf,
      fuel_flow: fuel_flow_kg_s,
      fuel_flow_lb_hr,
      m_dot_total: m_dot_total, // kg/s
      spl_total,
      spl_total_a,
      spl_jet,
      spl_fan,
      spl_jet_a,
      spl_fan_a,
      v_jet: isMixedFlow ? Ue_mix : UeC,
      tsfc_curr,
      inlet: {
        type: inletType,
        shockAngle,
        betaDeg: inletDetails.betaDeg,
        recovery: inletRecoveryEffective,
        machExit: inletDetails.machExit,
        P0_free,
        P02
      },
      metrics: {
          eta_thermal,
          eta_propulsive,
          eta_overall,
          bwr,
          opr: engineSpecs.prC * engineSpecs.prF, // Overall Pressure Ratio approx
          etaC_eff,
          etaT_eff
      },
      stations: [
          { id: '0', name: 'Freestream', T: Ta, P: Pa },
          { id: '2', name: 'Inlet', T: T02, P: P02 },
          { id: '3', name: 'Compressor', T: T03, P: P03 },
          { id: '4', name: 'Burner', T: T04, P: P04 },
          { id: '5', name: 'Turbine', T: T05, P: P05 },
          { id: '8', name: 'Nozzle', T: T08, P: P08 }
      ],
      acoustics: {
          jet_source: spl_jet_source,
          fan_source: spl_fan_source,
          jet_source_a: spl_jet_source + aWeightDb(jet_freq),
          fan_source_a: spl_fan_source + aWeightDb(fan_freq),
          jet_freq,
          fan_freq,
          absorb_jet: absorbJet,
          absorb_fan: absorbFan,
          isMixedFlow
      }
    };
};

// --- 2. Components ---

const FlightProfileCharts = ({ designSpecs, componentDesign, altitude, mach, deltaIsa, n1, flightPhase, observerDist, observerAngle, engineCount }) => {
    const observer = useMemo(() => ({ dist: 100, angle: 135 }), []);
    const machRange = useMemo(() => [0.4, 0.6, 0.7, 0.78, 0.85, 0.9], []);
    const altRange = useMemo(() => [0, 10000, 20000, 30000, 40000], []);
    const machSuperRange = useMemo(() => [1.0, 1.2, 1.4, 1.6, 1.8], []);
    const noiseDistRange = useMemo(() => [50, 100, 200, 400, 800], []);
    const noiseAngleRange = useMemo(() => [0, 45, 90, 135, 180], []);

    const tsfcMachCruise = useMemo(() => machRange.map(m => {
        const res = calculatePerformance(designSpecs, { altitude, mach: m, deltaIsa }, n1, observer, componentDesign);
        return { x: m, y: res.tsfc_curr };
    }), [machRange, designSpecs, altitude, deltaIsa, n1, observer, componentDesign]);

    const tsfcPoints = useMemo(() => altRange.map(alt => {
        const res = calculatePerformance(designSpecs, { altitude: alt, mach, deltaIsa }, n1, observer, componentDesign);
        return { x: alt, y: res.tsfc_curr };
    }), [altRange, designSpecs, mach, deltaIsa, n1, observer, componentDesign]);

    const tsfcMachSuper = useMemo(() => machSuperRange.map(m => {
        const res = calculatePerformance(designSpecs, { altitude, mach: m, deltaIsa }, n1, observer, componentDesign);
        return { x: m, y: res.tsfc_curr };
    }), [machSuperRange, designSpecs, altitude, deltaIsa, n1, observer, componentDesign]);

    const thrustMachSuper = useMemo(() => machSuperRange.map(m => {
        const res = calculatePerformance(designSpecs, { altitude, mach: m, deltaIsa }, n1, observer, componentDesign);
        return { x: m, y: (res.F_net * engineCount) / 1000 };
    }), [machSuperRange, designSpecs, altitude, deltaIsa, n1, observer, componentDesign, engineCount]);

    const noiseDistPoints = useMemo(() => noiseDistRange.map(d => {
        const res = calculatePerformance(designSpecs, { altitude, mach, deltaIsa }, n1, { dist: d, angle: observerAngle }, componentDesign);
        const val = res.spl_total_a ?? res.spl_total;
        return { x: d, y: engineCount > 1 ? logSum(val, engineCount) : val };
    }), [noiseDistRange, designSpecs, altitude, mach, deltaIsa, n1, observerAngle, componentDesign, engineCount]);

    const noiseAnglePoints = useMemo(() => noiseAngleRange.map(a => {
        const res = calculatePerformance(designSpecs, { altitude, mach, deltaIsa }, n1, { dist: observerDist, angle: a }, componentDesign);
        const val = res.spl_total_a ?? res.spl_total;
        return { x: a, y: engineCount > 1 ? logSum(val, engineCount) : val };
    }), [noiseAngleRange, designSpecs, altitude, mach, deltaIsa, n1, observerDist, componentDesign, engineCount]);

    const renderLine = (points, { xLabel, yLabel }) => {
        if (!points.length) return null;
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs); const maxX = Math.max(...xs);
        const minY = Math.min(...ys); const maxY = Math.max(...ys);
        const xRange = Math.max(maxX - minX, 1e-6);
        const yRange = Math.max(maxY - minY, 1e-6);
        const toX = (v) => 10 + ((v - minX) / xRange) * 80;
        const toY = (v) => 80 - ((v - minY) / yRange) * 60;
        return (
            <svg viewBox="0 0 100 90" className="w-full h-full">
                <rect x="8" y="10" width="84" height="68" fill="white" stroke="#e5e7eb" strokeWidth="0.5" rx="2" />
                <polyline fill="none" stroke="#2563eb" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
                    points={points.map(p => `${toX(p.x)},${toY(p.y)}`).join(' ')} />
                {points.map((p, idx) => (
                    <circle key={idx} cx={toX(p.x)} cy={toY(p.y)} r="1.2" fill="white" stroke="#2563eb" strokeWidth="0.6" />
                ))}
                <text x="50" y="86" textAnchor="middle" fontSize="4" fill="#374151" fontWeight="600">{xLabel}</text>
                <text x="-45" y="14" textAnchor="middle" fontSize="4" fill="#374151" fontWeight="600" transform="rotate(-90)">{yLabel}</text>
            </svg>
        );
    };

    if (flightPhase === 'takeoff' || flightPhase === 'landing') {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Volume2 size={14} /> Noise vs Distance</h3>
                        <span className="text-xs text-gray-500">Angle {observerAngle}°</span>
                    </div>
                    <div className="h-48">
                        {renderLine(noiseDistPoints, { xLabel: 'Distance (m)', yLabel: 'SPL (dBA)' })}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Volume2 size={14} /> Noise vs Angle</h3>
                        <span className="text-xs text-gray-500">Dist {observerDist} m</span>
                    </div>
                    <div className="h-48">
                        {renderLine(noiseAnglePoints, { xLabel: 'Angle (deg)', yLabel: 'SPL (dBA)' })}
                    </div>
                </div>
            </div>
        );
    }

    if (flightPhase === 'supercruise') {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Activity size={14} /> TSFC vs Mach (Supercruise)</h3>
                        <span className="text-xs text-gray-500">Alt {altitude.toLocaleString()} ft</span>
                    </div>
                    <div className="h-48">
                        {renderLine(tsfcMachSuper, { xLabel: 'Mach', yLabel: 'TSFC (kg/(kN·s))' })}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Gauge size={14} /> Thrust vs Mach (Supercruise)</h3>
                        <span className="text-xs text-gray-500">Alt {altitude.toLocaleString()} ft</span>
                    </div>
                    <div className="h-48">
                        {renderLine(thrustMachSuper, { xLabel: 'Mach', yLabel: 'Net Thrust (kN)' })}
                    </div>
                </div>
            </div>
        );
    }

    // Cruise/default
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Activity size={14} /> TSFC vs Mach</h3>
                    <span className="text-xs text-gray-500">Alt {altitude.toLocaleString()} ft</span>
                </div>
                <div className="h-48">
                    {renderLine(tsfcMachCruise, { xLabel: 'Mach', yLabel: 'TSFC (kg/(kN·s))' })}
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Activity size={14} /> TSFC vs Altitude</h3>
                    <span className="text-xs text-gray-500">Mach {mach.toFixed(2)}</span>
                </div>
                <div className="h-48">
                    {renderLine(tsfcPoints, { xLabel: 'Altitude (ft)', yLabel: 'TSFC (kg/(kN·s))' })}
                </div>
            </div>
        </div>
    );
};

const StationAnalysis = ({ stations, formatValue, unitSystem }) => {
    const maxP = Math.max(...stations.map(s => s.P));
    const maxT = Math.max(...stations.map(s => s.T));

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Thermometer size={16} /> Thermodynamic Cycle (Brayton)
            </h3>
            <div className="h-64 flex items-end justify-between gap-4 px-4">
                {stations.map(s => (
                    <div key={s.id} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                        <div className="w-full flex gap-1 items-end h-full relative">
                            {/* Pressure Bar */}
                            <div 
                                className="flex-1 bg-blue-500 rounded-t opacity-80 group-hover:opacity-100 transition-all relative"
                                style={{ height: `${(s.P / maxP) * 100}%` }}
                            >
                            </div>
                            {/* Temperature Bar */}
                            <div 
                                className="flex-1 bg-red-500 rounded-t opacity-80 group-hover:opacity-100 transition-all relative"
                                style={{ height: `${(s.T / maxT) * 100}%` }}
                            >
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 font-medium text-center mt-2 h-8">{s.name}</div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-20 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded z-10 whitespace-nowrap shadow-xl">
                            <div className="font-bold mb-1">{s.name} (Stn {s.id})</div>
                            <div className="text-blue-200">P: {formatValue(s.P, 'pressure')}</div>
                            <div className="text-red-200">T: {formatValue(s.T, 'temp')}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-center gap-6 mt-6 text-xs font-medium border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div> Total Pressure ({unitSystem === 'SI' ? 'kPa' : 'psi'})
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div> Total Temperature ({unitSystem === 'SI' ? 'K' : '°F'})
                </div>
            </div>
        </div>
    );
};

const NoiseContourMap = ({ acoustics }) => {
    const canvasRef = React.useRef(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const scale = 4; // pixels per meter

        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = (x - cx) / scale; // meters
                const dy = (y - cy) / scale; // meters
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 2) continue; // Skip center

                // Angle calculation
                // Engine points Right (+x). 
                // Inlet is Left (-x).
                // Angle 0 is Inlet. Angle 180 is Exhaust.
                // Vector (dx, dy). Inlet vector (-1, 0).
                // cos(theta) = (dx*-1 + dy*0) / dist = -dx/dist
                const cosTheta = -dx / dist;
                const theta = Math.acos(cosTheta); // 0 to PI
                
                // Calculate SPL at this point
                const dist_attn = 20 * Math.log10(dist);
                const jetFreq = acoustics.jet_freq || 200;
                const fanFreq = acoustics.fan_freq || 800;
                
                // Jet Noise
                let spl_jet = (acoustics.jet_source_a ?? acoustics.jet_source) - dist_attn;
                // Directivity: 10*log10(sin(theta/2)^4 + 0.1)
                // theta is 0 at inlet, PI at exhaust.
                // sin(theta/2) is 0 at inlet, 1 at exhaust.
                // So jet noise peaks at exhaust. Correct.
                spl_jet += 10 * Math.log10(Math.pow(Math.sin(theta/2), 4) + 0.1);
                spl_jet -= atmosphericAbsorptionDb(jetFreq, dist);

                // Fan Noise
                let spl_fan = (acoustics.fan_source_a ?? acoustics.fan_source) - dist_attn;
                // Directivity: 5*cos(2*theta)
                // Peaks at 0 (inlet) and PI (exhaust). Dips at 90.
                spl_fan += 5 * Math.cos(2 * theta);
                spl_fan -= atmosphericAbsorptionDb(fanFreq, dist);

                const spl_total = 10 * Math.log10(Math.pow(10, spl_jet/10) + Math.pow(10, spl_fan/10));

                // Color Map
                // < 80: Green (0, 255, 0)
                // 80-100: Yellow (255, 255, 0)
                // 100-120: Orange (255, 165, 0)
                // > 120: Red (255, 0, 0)
                
                let r, g, b, a;
                
                if (spl_total < 80) {
                    // Fade out below 60
                    const t = Math.max(0, (spl_total - 60) / 20);
                    r = 0; g = 255; b = 0; a = t * 50;
                } else if (spl_total < 100) {
                    const t = (spl_total - 80) / 20;
                    r = 255 * t; g = 255; b = 0; a = 100 + t * 50;
                } else if (spl_total < 120) {
                    const t = (spl_total - 100) / 20;
                    r = 255; g = 255 * (1-t); b = 0; a = 150 + t * 50;
                } else {
                    r = 255; g = 0; b = 0; a = 200;
                }

                const idx = (y * width + x) * 4;
                data[idx] = r;
                data[idx+1] = g;
                data[idx+2] = b;
                data[idx+3] = a;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        
        // Draw Engine Icon
        ctx.save();
        ctx.translate(cx, cy);
        // Engine pointing right
        ctx.fillStyle = '#1F2937';
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.lineTo(15, -8);
        ctx.lineTo(15, 8);
        ctx.lineTo(-15, 10);
        ctx.fill();
        // Exhaust
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(15, -5);
        ctx.lineTo(25, -8);
        ctx.lineTo(25, 8);
        ctx.lineTo(15, 5);
        ctx.fill();
        ctx.restore();

        // Draw Scale
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.fillText('10m', cx + 10*scale, cy + 10);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 10*scale, cy);
        ctx.stroke();

    }, [acoustics]);

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Volume2 size={16} /> Acoustic Field Contour
            </h3>
            <div className="flex-1 relative bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                <canvas ref={canvasRef} width={400} height={300} className="w-full h-full object-contain" />
                <div className="absolute bottom-2 right-2 bg-white/90 p-2 rounded text-xs shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-green-500 rounded-full opacity-50"></div> &lt; 80 dB</div>
                    <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-yellow-400 rounded-full opacity-50"></div> 80-100 dB</div>
                    <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-orange-500 rounded-full opacity-50"></div> 100-120 dB</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full opacity-50"></div> &gt; 120 dB</div>
                </div>
            </div>
        </div>
    );
}

// Parameters configuration
const TRADE_PARAMS = {
    bpr: { label: 'Bypass Ratio', min: 0, max: 12, step: 0.5 },
    prC: { label: 'Compressor PR', min: 5, max: 50, step: 2 },
    prF: { label: 'Fan PR', min: 1.1, max: 2.0, step: 0.05 },
    n1: { label: 'Throttle (N1%)', min: 50, max: 105, step: 2 },
    mach: { label: 'Mach Number', min: 0, max: 0.95, step: 0.05 },
    altitude: { label: 'Altitude (ft)', min: 0, max: 45000, step: 2000 }
};

const TRADE_METRICS = {
    F_net: { label: 'Net Thrust (kN)', color: '#2563eb' },
    tsfc_curr: { label: 'TSFC (kg/(kN·s))', color: '#16a34a' },
    eta_overall: { label: 'Overall Efficiency', color: '#9333ea' },
    spl_total: { label: 'Noise Level (dBA)', color: '#dc2626' },
    bwr: { label: 'Back Work Ratio', color: '#ea580c' }
};

const TradeStudy = ({ baseSpecs, flightCond, n1, observer, componentDesign }) => {
    const [paramX, setParamX] = useState('bpr');
    const [paramY, setParamY] = useState('tsfc_curr');
    const [hoveredPoint, setHoveredPoint] = useState(null);

    const dataPoints = useMemo(() => {
        // Generate Data
        const config = TRADE_PARAMS[paramX];
        const points = [];
        
        for (let val = config.min; val <= config.max; val += config.step) {
            // Create modified inputs
            let testSpecs = { ...baseSpecs };
            let testFlight = { ...flightCond };
            let testN1 = n1;

            if (['bpr', 'prC', 'prF'].includes(paramX)) {
                testSpecs[paramX] = val;
            } else if (['mach', 'altitude'].includes(paramX)) {
                testFlight[paramX] = val;
            } else if (paramX === 'n1') {
                testN1 = val;
            }

            const res = calculatePerformance(testSpecs, testFlight, testN1, observer, componentDesign);
            
            // Extract Y value
            let yVal = 0;
            if (['eta_overall', 'bwr'].includes(paramY)) {
                yVal = res.metrics[paramY];
            } else if (paramY === 'spl_total') {
                yVal = res.spl_total_a ?? res.spl_total;
            } else if (paramY === 'F_net') {
                yVal = res.F_net / 1000; // convert to kN for plotting
            } else {
                yVal = res[paramY];
            }

            points.push({ x: val, y: yVal });
        }
        return points;
    }, [paramX, paramY, baseSpecs, flightCond, n1, observer, componentDesign]);

    // Chart Scaling with proper margins
    const xVals = dataPoints.map(p => p.x);
    const yVals = dataPoints.map(p => p.y);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    
    // Add 5% padding to ranges for better visualization
    const rawXRange = maxX - minX;
    const rawYRange = maxY - minY;
    const xRange = rawXRange === 0 ? 1e-6 : rawXRange;
    const yRange = rawYRange === 0 ? 1e-6 : rawYRange;

    const chartWidth = 100; // Use percentage-based viewBox
    const chartHeight = 60;
    const normalizeX = (val) => ((val - minX) / xRange) * chartWidth;
    const normalizeY = (val) => chartHeight - ((val - minY) / yRange) * chartHeight;

    // Generate tick marks
    const xTicks = 5;
    const yTicks = 5;
    const xTickValues = Array.from({ length: xTicks }, (_, i) => minX + (xRange * i) / (xTicks - 1));
    const yTickValues = Array.from({ length: yTicks }, (_, i) => minY + (yRange * i) / (yTicks - 1));

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Activity size={16} className="text-blue-600" /> Parametric Trade Study
                </h3>
                <div className="flex gap-2 flex-wrap">
                    <select 
                        value={paramX} 
                        onChange={(e) => setParamX(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                        {Object.keys(TRADE_PARAMS).map(k => 
                            <option key={k} value={k}>X: {TRADE_PARAMS[k].label}</option>
                        )}
                    </select>
                    <select 
                        value={paramY} 
                        onChange={(e) => setParamY(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                        {Object.keys(TRADE_METRICS).map(k => 
                            <option key={k} value={k}>Y: {TRADE_METRICS[k].label}</option>
                        )}
                    </select>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-white rounded-lg p-8 min-h-0">
                <svg 
                    className="w-full h-full" 
                    viewBox="0 0 120 80" 
                    preserveAspectRatio="xMidYMid meet"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        {/* Gradient for area under curve */}
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: TRADE_METRICS[paramY].color, stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: TRADE_METRICS[paramY].color, stopOpacity: 0.05 }} />
                        </linearGradient>
                    </defs>

                    {/* Chart area background */}
                    <rect x="10" y="5" width={chartWidth} height={chartHeight} fill="white" stroke="#e5e7eb" strokeWidth="0.3" rx="1" />

                    {/* Grid Lines */}
                    {yTickValues.map((tick, i) => {
                        const y = normalizeY(tick) + 5;
                        return (
                            <g key={`y-grid-${i}`}>
                                <line 
                                    x1="10" 
                                    y1={y} 
                                    x2={10 + chartWidth} 
                                    y2={y} 
                                    stroke="#f3f4f6" 
                                    strokeWidth="0.3" 
                                    strokeDasharray="1,1"
                                />
                            </g>
                        );
                    })}
                    
                    {xTickValues.map((tick, i) => {
                        const x = normalizeX(tick) + 10;
                        return (
                            <g key={`x-grid-${i}`}>
                                <line 
                                    x1={x} 
                                    y1="5" 
                                    x2={x} 
                                    y2={5 + chartHeight} 
                                    stroke="#f3f4f6" 
                                    strokeWidth="0.3" 
                                    strokeDasharray="1,1"
                                />
                            </g>
                        );
                    })}

                    {/* Area under curve */}
                    <path
                        d={`M 10,${5 + chartHeight} L ${dataPoints.map(p => `${normalizeX(p.x) + 10},${normalizeY(p.y) + 5}`).join(' L ')} L ${10 + chartWidth},${5 + chartHeight} Z`}
                        fill="url(#chartGradient)"
                    />
                    
                    {/* Data Path */}
                    <polyline 
                        fill="none" 
                        stroke={TRADE_METRICS[paramY].color} 
                        strokeWidth="0.6" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={dataPoints.map(p => `${normalizeX(p.x) + 10},${normalizeY(p.y) + 5}`).join(' ')}
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                    />

                    {/* Data Points */}
                    {dataPoints.map((p, i) => (
                        <circle 
                            key={i} 
                            cx={normalizeX(p.x) + 10} 
                            cy={normalizeY(p.y) + 5} 
                            r={hoveredPoint === i ? "1.2" : "0.8"} 
                            fill="white" 
                            stroke={TRADE_METRICS[paramY].color} 
                            strokeWidth="0.4"
                            className="cursor-pointer transition-all hover:r-2"
                            onMouseEnter={() => setHoveredPoint(i)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            style={{ filter: hoveredPoint === i ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}
                        />
                    ))}

                    {/* X-Axis Ticks and Labels */}
                    {xTickValues.map((tick, i) => {
                        const x = normalizeX(tick) + 10;
                        return (
                            <g key={`x-tick-${i}`}>
                                <line x1={x} y1={5 + chartHeight} x2={x} y2={5 + chartHeight + 1} stroke="#9ca3af" strokeWidth="0.3" />
                                <text 
                                    x={x} 
                                    y={5 + chartHeight + 4} 
                                    textAnchor="middle" 
                                    fontSize="2.5" 
                                    fill="#6b7280"
                                    fontFamily="monospace"
                                >
                                    {tick.toFixed(tick < 10 ? 1 : 0)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Y-Axis Ticks and Labels */}
                    {yTickValues.map((tick, i) => {
                        const y = normalizeY(tick) + 5;
                        return (
                            <g key={`y-tick-${i}`}>
                                <line x1="10" y1={y} x2="9" y2={y} stroke="#9ca3af" strokeWidth="0.3" />
                                <text 
                                    x="8" 
                                    y={y + 0.8} 
                                    textAnchor="end" 
                                    fontSize="2.5" 
                                    fill="#6b7280"
                                    fontFamily="monospace"
                                >
                                    {tick.toFixed(tick < 10 ? 2 : 0)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Axis Labels */}
                    <text 
                        x={10 + chartWidth / 2} 
                        y="78" 
                        textAnchor="middle" 
                        fontSize="3" 
                        fill="#374151"
                        fontWeight="600"
                    >
                        {TRADE_PARAMS[paramX].label}
                    </text>

                    <text 
                        x="-40" 
                        y="3" 
                        textAnchor="middle" 
                        fontSize="3" 
                        fill="#374151"
                        fontWeight="600"
                        transform="rotate(-90)"
                    >
                        {TRADE_METRICS[paramY].label}
                    </text>
                </svg>

                {/* Hover Tooltip */}
                {hoveredPoint !== null && (
                    <div 
                        className="absolute bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none"
                        style={{
                            left: '50%',
                            top: '10px',
                            transform: 'translateX(-50%)',
                            zIndex: 10
                        }}
                    >
                        <div className="font-semibold">{TRADE_PARAMS[paramX].label}: {dataPoints[hoveredPoint].x.toFixed(2)}</div>
                        <div className="text-gray-300">{TRADE_METRICS[paramY].label}: {dataPoints[hoveredPoint].y.toFixed(4)}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TurbofanAnalysis = ({ onClose }) => {
  // --- State ---
    const [engines, setEngines] = useState(() => {
        try {
            const saved = localStorage.getItem('custom_engines');
            if (saved) {
                const custom = JSON.parse(saved);
                return { ...DEFAULT_ENGINES, ...custom };
            }
        } catch (e) {
            console.error('Failed to load custom engines', e);
        }
        return DEFAULT_ENGINES;
    });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [engineKey, setEngineKey] = useState('TFE731-2');
  const [designSpecs, setDesignSpecs] = useState(DEFAULT_ENGINES['TFE731-2']);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [isNewEngineDesign, setIsNewEngineDesign] = useState(false); // Track if designing new engine
  const [unitSystem, setUnitSystem] = useState('SI'); // 'SI' or 'Imperial'
  const [flightPhase, setFlightPhase] = useState('cruise'); // 'takeoff', 'landing', 'cruise', 'supercruise'
  const [snapshots, setSnapshots] = useState([]);
  const [modeChoice, setModeChoice] = useState(null); // null => selector screen

  // Unit conversion helpers
  const convert = {
    // Length
    m_to_ft: (m) => m * 3.28084,
    ft_to_m: (ft) => ft / 3.28084,
    // Speed
    ms_to_kt: (ms) => ms * 1.94384,
    kt_to_ms: (kt) => kt / 1.94384,
    // Force
    N_to_lbf: (N) => N * 0.224809,
    lbf_to_N: (lbf) => lbf / 0.224809,
    // Mass flow
    kgs_to_lbms: (kgs) => kgs * 2.20462,
    lbms_to_kgs: (lbms) => lbms / 2.20462,
    // Fuel consumption
    kgkNs_to_lbmlbfh: (kgkNs) => kgkNs * 101972, // kg/(kN·s) to lbm/(lbf·hr)
    // Temperature (C to F)
    C_to_F: (C) => C * 9/5 + 32,
    F_to_C: (F) => (F - 32) * 5/9,
    // Pressure
    Pa_to_psi: (Pa) => Pa * 0.000145038,
    psi_to_Pa: (psi) => psi / 0.000145038,
  };

  const formatValue = (value, type) => {
    if (unitSystem === 'SI') {
      switch(type) {
        case 'thrust': return `${(value/1000).toFixed(1)} kN`;
        case 'massFlow': return `${value.toFixed(1)} kg/s`;
        case 'velocity': return `${value.toFixed(0)} m/s`;
        case 'tsfc': return `${value.toFixed(4)} kg/(kN·s)`;
        case 'altitude': return `${value.toLocaleString()} ft`; // Keep ft for now (standard aviation)
        case 'temp': return `${value.toFixed(0)} K`;
        case 'tempC': return `${value.toFixed(0)}°C`; // For delta ISA
        case 'pressure': return `${(value/1000).toFixed(1)} kPa`;
        case 'diameter': return `${value.toFixed(2)} m`;
        default: return value.toFixed(2);
      }
    } else {
      switch(type) {
        case 'thrust': return `${convert.N_to_lbf(value).toFixed(0)} lbf`;
        case 'massFlow': return `${convert.kgs_to_lbms(value).toFixed(1)} lbm/s`;
        case 'velocity': return `${convert.ms_to_kt(value).toFixed(0)} kt`;
        case 'tsfc': return `${convert.kgkNs_to_lbmlbfh(value).toFixed(4)} lbm/(lbf·hr)`;
        case 'altitude': return `${value.toLocaleString()} ft`; // Keep ft (standard)
        case 'temp': return `${convert.C_to_F(value).toFixed(0)}°F`; // Converts from Celsius input
        case 'tempC': return `${convert.C_to_F(value).toFixed(0)}°F`; // For delta ISA
        case 'pressure': return `${convert.Pa_to_psi(value).toFixed(2)} psi`;
        case 'diameter': return `${convert.m_to_ft(value).toFixed(2)} ft`;
        default: return value.toFixed(2);
      }
    }
  };

  const handleSaveEngine = (id, data) => {
    const newEngines = { ...engines, [id]: data };
    setEngines(newEngines);
    
    // Separate custom engines to save to localStorage
    const customEngines = {};
    Object.keys(newEngines).forEach(key => {
      if (!DEFAULT_ENGINES[key]) {
        customEngines[key] = newEngines[key];
      }
    });
    localStorage.setItem('custom_engines', JSON.stringify(customEngines));
    
        setEngineKey(id);
        setDesignSpecs(data);
        setIsNewEngineDesign(true); // Mark as new/custom design
    setShowBuilder(false);
  };

  const handleDeleteEngine = (key) => {
    if (DEFAULT_ENGINES[key]) return; // Cannot delete default
    
    const newEngines = { ...engines };
    delete newEngines[key];
    setEngines(newEngines);
    
    const customEngines = {};
    Object.keys(newEngines).forEach(k => {
      if (!DEFAULT_ENGINES[k]) {
        customEngines[k] = newEngines[k];
      }
    });
    localStorage.setItem('custom_engines', JSON.stringify(customEngines));
    
        setEngineKey('TFE731-2');
        setDesignSpecs(DEFAULT_ENGINES['TFE731-2']);
  };

  const [n1, setN1] = useState(85); // %
  const [altitude, setAltitude] = useState(0); // ft
  const [mach, setMach] = useState(0.0);
  const [deltaIsa, setDeltaIsa] = useState(0); // C
  const [componentDesign, setComponentDesign] = useState({
    inletType: 'subsonic',
    shockAngle: 12,
    supersonicDeflections: [6, 6],
    compressorStages: 8,
    turbineStages: 2,
    coolingBleed: 5
  });
  const [aircraftConfig, setAircraftConfig] = useState(getDefaultAircraft('TFE731-2'));
  
  // Acoustics State
  const [observerDist, setObserverDist] = useState(100); // m
  const [observerAngle, setObserverAngle] = useState(135); // deg
  const currentEngineType = (engines[engineKey]?.type) || DEFAULT_ENGINES[engineKey]?.type || 'subsonic';
  const designCruiseMach = engines[engineKey]?.designCruiseMach || 0.8;
  const designSupercruiseMach = engines[engineKey]?.designSupercruiseMach || 1.5;
  const allowedPhases = currentEngineType === 'supersonic'
    ? ['takeoff', 'landing', 'cruise', 'supercruise']
    : ['takeoff', 'landing', 'cruise'];

  const supersonicDesign = useMemo(() => {
      if (currentEngineType !== 'supersonic') return null;
      const deflections = [6, 6];
      const list = (componentDesign.supersonicDeflections && componentDesign.supersonicDeflections.length) ? componentDesign.supersonicDeflections : deflections;
      return designSupersonicInlet(Math.max(mach, 1.01), list);
  }, [currentEngineType, mach, componentDesign.supersonicDeflections]);

  // Flight phase presets
  const applyFlightPhase = (phase) => {
    if (!allowedPhases.includes(phase)) return;
    setFlightPhase(phase);
    switch(phase) {
      case 'takeoff':
        setAltitude(0);
        setMach(0.25);
        setN1(100);
        setDeltaIsa(15); // Hot day
        break;
      case 'landing':
        setAltitude(1500);
        setMach(0.20);
        setN1(30); // Idle descent
        setDeltaIsa(0);
        break;
      case 'cruise':
        setAltitude(35000);
        setMach(Math.min(designCruiseMach, 0.99));
        setN1(85);
        setDeltaIsa(0);
        break;
      case 'supercruise':
        setAltitude(50000);
        setMach(designSupercruiseMach);
        setN1(95);
        setDeltaIsa(-10);
        break;
      default:
        break;
    }
  };

  // Determine if noise analysis is relevant
  const isNoiseRelevant = flightPhase === 'takeoff' || flightPhase === 'landing' || flightPhase === 'supercruise';

  const handleSelectEngine = (key) => {
      setEngineKey(key);
      if (engines[key]) {
          setDesignSpecs(engines[key]);
          // Check if it's a custom engine (not in DEFAULT_ENGINES)
          setIsNewEngineDesign(!DEFAULT_ENGINES[key]);
      }
      const nextType = engines[key]?.type || DEFAULT_ENGINES[key]?.type || 'subsonic';
      const nextAllowed = nextType === 'supersonic' ? ['takeoff','landing','cruise','supercruise'] : ['takeoff','landing','cruise'];
      if (!nextAllowed.includes(flightPhase)) {
          applyFlightPhase('cruise');
      }
      setAircraftConfig(getDefaultAircraft(key));
  };

  const applyModeChoice = (mode) => {
      setModeChoice(mode);
      if (mode === 'performance') {
          setActiveTab('dashboard');
      } else if (mode === 'acoustics') {
          if (!isNoiseRelevant) setFlightPhase('takeoff');
          setActiveTab('noise');
      } else if (mode === 'components') {
          setActiveTab('thermo');
      } else if (mode === 'builder') {
          setShowBuilder(true);
      }
  };

  // --- Calculations ---
  const results = useMemo(() => {
    return calculatePerformance(
        designSpecs, 
        { altitude, mach, deltaIsa }, 
        n1, 
        { dist: observerDist, angle: observerAngle },
        componentDesign
    );
  }, [designSpecs, n1, altitude, mach, deltaIsa, observerDist, observerAngle, componentDesign]);
  const noiseDb = results.spl_total_a ?? results.spl_total;
  const noiseJetDb = results.spl_jet_a ?? results.spl_jet;
  const noiseFanDb = results.spl_fan_a ?? results.spl_fan;
  const engineCount = aircraftConfig?.engines ?? 1;
  const thrustTotal = results.F_net * engineCount;
  const grossTotal = results.F_gross * engineCount;
  const ramTotal = results.Ram_Drag * engineCount;
  const fuelTotal = results.fuel_flow * engineCount;
  const massFlowTotal = results.m_dot_total * engineCount;
  const noiseDbTotal = engineCount > 1 ? logSum(noiseDb, engineCount) : noiseDb;
  const noiseJetDbTotal = engineCount > 1 ? logSum(noiseJetDb, engineCount) : noiseJetDb;
  const noiseFanDbTotal = engineCount > 1 ? logSum(noiseFanDb, engineCount) : noiseFanDb;

  // --- Scenario Snapshots ---
  const saveSnapshot = () => {
    setSnapshots(prev => {
        const id = `snap-${Date.now()}`;
        const name = `Scenario ${prev.length + 1}`;
        const snapshot = {
            id,
            name,
            inputs: {
                engineKey,
                designSpecs: { ...designSpecs },
                n1,
                altitude,
                mach,
                deltaIsa,
                observerDist,
                observerAngle,
                unitSystem,
                aircraftConfig,
                componentDesign: { ...componentDesign }
            },
            results: {
                thrust_N: results.F_net,
                tsfc: results.tsfc_curr,
                noise_dba: results.spl_total_a ?? results.spl_total
            }
        };
        return [...prev, snapshot];
    });
  };

  const applySnapshot = (snapshot) => {
    const { inputs } = snapshot;
    if (inputs.engineKey && !engines[inputs.engineKey]) {
        setEngines(prev => ({ ...prev, [inputs.engineKey]: inputs.designSpecs }));
    }
    setEngineKey(inputs.engineKey || 'snapshot');
    setDesignSpecs(inputs.designSpecs);
    if (inputs.componentDesign) {
        setComponentDesign(inputs.componentDesign);
    }
    if (inputs.aircraftConfig) {
        setAircraftConfig(inputs.aircraftConfig);
    }
    setIsNewEngineDesign(!DEFAULT_ENGINES[inputs.engineKey]);
    setN1(inputs.n1);
    setAltitude(inputs.altitude);
    setMach(inputs.mach);
    setDeltaIsa(inputs.deltaIsa);
    setObserverDist(inputs.observerDist);
    setObserverAngle(inputs.observerAngle);
    if (inputs.unitSystem) setUnitSystem(inputs.unitSystem);
  };

  const deleteSnapshot = (id) => setSnapshots(prev => prev.filter(s => s.id !== id));

  // --- Optimization Logic ---
  
  // 1. Cycle Design Optimizer (Modifies Hardware)
  const runDesignOptimizer = (objective) => {
    setIsOptimizing(true);

    setTimeout(() => {
        let bestSpecs = { ...designSpecs };
        let bestScore = -Infinity;

        // Search Space (Hardware)
        const bprRange = [1, 3, 5, 8, 10, 12];
        const prcRange = [10, 20, 30, 40, 50];
        const prfRange = [1.4, 1.5, 1.6, 1.7, 1.8];

        // Fixed Mission Conditions for Design Point
        let missionCond = { altitude: 0, mach: 0, deltaIsa: 0 };
        let missionN1 = 100;

        if (objective === 'Quiet Takeoff') {
            missionCond = { altitude: 0, mach: 0.25, deltaIsa: 0 };
        } else if (objective === 'Eco Cruise') {
            missionCond = { altitude: 35000, mach: 0.8, deltaIsa: 0 };
            missionN1 = 90;
        } else if (objective === 'Supersonic') {
            missionCond = { altitude: 40000, mach: 1.5, deltaIsa: 0 };
            missionN1 = 100;
        }

        // Grid Search
        for (let bpr of bprRange) {
            for (let prc of prcRange) {
                for (let prf of prfRange) {
                    const testSpecs = { ...designSpecs, bpr, prC: prc, prF: prf };
                    const res = calculatePerformance(
                        testSpecs, 
                        missionCond, 
                        missionN1, 
                        { dist: 100, angle: 135 },
                        componentDesign
                    );

                    let score = -Infinity;

                    if (objective === 'Quiet Takeoff') {
                        // Maximize Thrust / Noise Penalty
                        const noiseScore = res.spl_total_a ?? res.spl_total;
                        if (res.F_net > 4450) score = res.F_net / Math.pow(noiseScore, 3);
                    } else if (objective === 'Eco Cruise') {
                        // Minimize TSFC
                        if (res.F_net > 2250) score = -res.tsfc_curr;
                    } else if (objective === 'Supersonic') {
                        // Maximize Specific Thrust (Thrust / MassFlow)
                        score = res.F_net / res.m_dot_total;
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestSpecs = testSpecs;
                    }
                }
            }
        }

        setDesignSpecs(bestSpecs);
        // Set simulator to design point so user sees result
        setAltitude(missionCond.altitude);
        setMach(missionCond.mach);
        setN1(missionN1);
        setTimeout(() => setIsOptimizing(false), 1000);
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-hidden flex flex-col">
      {modeChoice === null && (
        <div className="absolute inset-0 bg-white z-30 flex items-center justify-center">
          <div className="max-w-4xl w-full px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold mb-1">Select Mode</p>
                <h2 className="text-2xl font-bold text-gray-900">Turbofan Analysis</h2>
                <p className="text-sm text-gray-500">Choose what you want to do before entering the workspace.</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
                title="Back to resume"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'performance', title: 'Quick Performance', desc: 'Thrust, TSFC, mission sliders.', icon: <Gauge size={18} className="text-blue-600" /> },
                { id: 'acoustics', title: 'Acoustics Run', desc: 'Noise maps and observers.', icon: <Volume2 size={18} className="text-orange-600" /> },
                { id: 'components', title: 'Component Design', desc: 'Inlets, compressors, turbines.', icon: <Cpu size={18} className="text-purple-600" /> },
                { id: 'builder', title: 'Create Engine', desc: 'Spin up a custom engine.', icon: <Plus size={18} className="text-green-600" /> },
              ].map(card => (
                <button
                  key={card.id}
                  onClick={() => applyModeChoice(card.id)}
                  className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition flex gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    {card.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{card.title}</div>
                    <div className="text-sm text-gray-600">{card.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setModeChoice(null)}
              disabled={modeChoice === null}
              className={`p-2 rounded-full transition ${modeChoice === null ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Back to mode select"
            >
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600"
              title="Back to resume"
            >
              <ChevronsLeft size={20} />
            </button>
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-blue-600 hidden sm:block" />
              Turbofan Analysis
            </h1>
            <p className="text-[10px] lg:text-xs text-gray-500 hidden sm:block">Real-time cycle estimation • Standard Atmosphere • Lighthill Acoustics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
            {/* Unit System Toggle */}
            <button
              onClick={() => setUnitSystem(unitSystem === 'SI' ? 'Imperial' : 'SI')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition"
              title="Toggle Unit System"
            >
              <Settings size={14} />
              <span>{unitSystem === 'SI' ? 'SI' : 'Imperial'}</span>
            </button>
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
              {[
                { id: 'performance', label: 'Quick Performance' },
                { id: 'acoustics', label: 'Acoustics Run' },
                { id: 'components', label: 'Component Design' },
                { id: 'builder', label: 'Create Engine' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => applyModeChoice(mode.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                    modeChoice === mode.id ? 'bg-white shadow-sm text-blue-700' : 'text-gray-700 hover:bg-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {modeChoice !== null && (
              <button
                onClick={() => setModeChoice(null)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition"
              >
                <ArrowLeft size={14} className="text-gray-600" />
                Mode Select
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <select 
                  value={engineKey}
                  onChange={(e) => handleSelectEngine(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-xs lg:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 max-w-[150px] lg:max-w-xs"
              >
                  {Object.keys(engines).map(k => (
                      <option key={k} value={k}>{engines[k].name}</option>
                  ))}
              </select>
              <button 
                onClick={() => setShowBuilder(true)}
                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                title="Create Custom Engine"
              >
                <Plus size={18} />
              </button>
              {!DEFAULT_ENGINES[engineKey] && (
                <button 
                  onClick={() => handleDeleteEngine(engineKey)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  title="Delete Custom Engine"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
        
        {/* LEFT PANEL: Inputs */}
        {modeChoice !== null && (
        <div className={`
            absolute inset-0 z-30 bg-white lg:static lg:w-80 lg:block border-r border-gray-200 overflow-y-auto p-6 space-y-8 transition-transform duration-300 ease-in-out
            ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
            
            {/* 1. Cycle Design Solver - Only for New Engine Design */}
            {isNewEngineDesign && (
            <section className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Cpu size={14} /> Cycle Design Solver
                </h3>
                <p className="text-[10px] text-blue-600 mb-3 leading-tight">
                    Generates optimal hardware specs (BPR, PR) for a target design point.
                </p>
                <div className="space-y-2">
                    <button 
                        onClick={() => runDesignOptimizer('Quiet Takeoff')}
                        disabled={isOptimizing}
                        className="w-full py-2 px-3 bg-white border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition flex items-center justify-between"
                    >
                        <span>Design for Quiet Takeoff</span>
                        <Volume2 size={14} />
                    </button>
                    <button 
                        onClick={() => runDesignOptimizer('Eco Cruise')}
                        disabled={isOptimizing}
                        className="w-full py-2 px-3 bg-white border border-green-200 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition flex items-center justify-between"
                    >
                        <span>Design for Eco Cruise</span>
                        <Zap size={14} />
                    </button>
                    <button 
                        onClick={() => runDesignOptimizer('Supersonic')}
                        disabled={isOptimizing}
                        className="w-full py-2 px-3 bg-white border border-orange-200 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition flex items-center justify-between"
                    >
                        <span>Design for Supersonic</span>
                        <Wind size={14} />
                    </button>
                </div>
            </section>
            )}

            {/* Design Parameters (Editable for New Engines, Read-Only for Existing) */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings size={14} /> {isNewEngineDesign ? 'Cycle Design' : 'Engine Specs'}
                </h3>
                {!isNewEngineDesign && (
                    <p className="text-[10px] text-gray-500 mb-3 italic">
                        Fixed specs for existing engine. Create new engine to modify.
                    </p>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Bypass Ratio</span>
                            <span className={isNewEngineDesign ? "text-blue-600" : "text-gray-600"}>{designSpecs.bpr.toFixed(1)}</span>
                        </label>
                        <input 
                            type="range" min="0" max="15" step="0.1" 
                            value={designSpecs.bpr} 
                            onChange={(e) => setDesignSpecs({...designSpecs, bpr: Number(e.target.value)})} 
                            disabled={!isNewEngineDesign}
                            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none ${isNewEngineDesign ? 'cursor-pointer accent-blue-600' : 'cursor-not-allowed opacity-50'}`} 
                        />
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Compressor PR</span>
                            <span className={isNewEngineDesign ? "text-blue-600" : "text-gray-600"}>{designSpecs.prC.toFixed(1)}</span>
                        </label>
                        <input 
                            type="range" min="5" max="60" step="1" 
                            value={designSpecs.prC} 
                            onChange={(e) => setDesignSpecs({...designSpecs, prC: Number(e.target.value)})} 
                            disabled={!isNewEngineDesign}
                            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none ${isNewEngineDesign ? 'cursor-pointer accent-blue-600' : 'cursor-not-allowed opacity-50'}`} 
                        />
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Fan PR</span>
                            <span className={isNewEngineDesign ? "text-blue-600" : "text-gray-600"}>{designSpecs.prF.toFixed(2)}</span>
                        </label>
                        <input 
                            type="range" min="1.1" max="2.5" step="0.05" 
                            value={designSpecs.prF} 
                            onChange={(e) => setDesignSpecs({...designSpecs, prF: Number(e.target.value)})} 
                            disabled={!isNewEngineDesign}
                            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none ${isNewEngineDesign ? 'cursor-pointer accent-blue-600' : 'cursor-not-allowed opacity-50'}`} 
                        />
                    </div>
                </div>
            </section>

            {/* Flight Phase Selector */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Wind size={14} /> Flight Phase
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                        onClick={() => applyFlightPhase('takeoff')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition ${
                            flightPhase === 'takeoff'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        🛫 Takeoff
                    </button>
                    <button
                        onClick={() => applyFlightPhase('landing')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition ${
                            flightPhase === 'landing'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        🛬 Landing
                    </button>
                    <button
                        onClick={() => applyFlightPhase('cruise')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition ${
                            flightPhase === 'cruise'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        ✈️ Cruise
                    </button>
                    {currentEngineType === 'supersonic' && (
                      <button
                          onClick={() => applyFlightPhase('supercruise')}
                          className={`px-3 py-2 text-xs font-medium rounded-lg transition ${
                              flightPhase === 'supercruise'
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                          🚀 Supercruise
                      </button>
                    )}
                </div>
            </section>

            {/* Flight Conditions */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Wind size={14} /> Flight Conditions
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Altitude</span>
                            <span className="text-blue-600">{altitude.toLocaleString()} ft</span>
                        </label>
                        <input type="range" min="0" max="40000" step="100" value={altitude} onChange={(e) => setAltitude(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Mach Number</span>
                            <span className="text-blue-600">M {mach.toFixed(2)}</span>
                        </label>
                        <input 
                          type="range" 
                          min="0" 
                          max={currentEngineType === 'supersonic' ? 2 : 0.95} 
                          step="0.01" 
                          value={mach} 
                          onChange={(e) => setMach(Number(e.target.value))} 
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                        />
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>ISA Deviation</span>
                            <span className="text-blue-600">{deltaIsa > 0 ? '+' : ''}{deltaIsa}°C</span>
                        </label>
                        <input type="range" min="-30" max="30" step="1" value={deltaIsa} onChange={(e) => setDeltaIsa(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                </div>
            </section>

            {/* Engine Control */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings size={14} /> Engine Control
                </h3>
                <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                        <span>Throttle (N1)</span>
                        <span className="text-blue-600">{n1}%</span>
                    </label>
                    <input type="range" min="0" max="105" step="1" value={n1} onChange={(e) => setN1(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
            </section>

            {/* Aircraft Setup */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings size={14} /> Aircraft Setup
                </h3>
                {AIRCRAFT_PROFILES[engineKey] ? (
                    <div className="space-y-2">
                        <select
                            value={aircraftConfig?.id}
                            onChange={(e) => {
                                const opts = AIRCRAFT_PROFILES[engineKey] || [];
                                const sel = opts.find(o => o.id === e.target.value);
                                setAircraftConfig(sel || getDefaultAircraft(engineKey));
                            }}
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                        >
                            {(AIRCRAFT_PROFILES[engineKey] || []).map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                        <div className="text-xs text-gray-500">Engines: {aircraftConfig?.engines ?? 1}</div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-500">Engines: 1 (no aircraft profile)</div>
                )}
            </section>

            {/* Component Design */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Cpu size={14} /> Component Design
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setComponentDesign({ ...componentDesign, inletType: 'subsonic' })}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium ${componentDesign.inletType === 'subsonic' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-blue-200'}`}
                        >
                            Subsonic Inlet
                        </button>
                        <button 
                            onClick={() => setComponentDesign({ ...componentDesign, inletType: 'supersonic' })}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium ${componentDesign.inletType === 'supersonic' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-blue-200'}`}
                        >
                            Supersonic
                        </button>
                    </div>
                    {componentDesign.inletType === 'supersonic' && (
                        <div className="space-y-3">
                            <div>
                                <label className="flex justify-between text-gray-700">Ramp Angle <span className="text-blue-600">{componentDesign.shockAngle.toFixed(0)}°</span></label>
                                <input type="range" min="2" max="25" step="0.5" value={componentDesign.shockAngle} onChange={(e) => setComponentDesign({ ...componentDesign, shockAngle: Number(e.target.value) })} className="w-full accent-blue-600" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Ramp Schedule (deg, comma-separated)</label>
                                <input 
                                  type="text" 
                                  value={(componentDesign.supersonicDeflections || []).join(', ')}
                                  onChange={(e) => {
                                      const parts = e.target.value.split(',').map(p => Number(p.trim())).filter(v => !Number.isNaN(v) && v > 0);
                                      setComponentDesign({ ...componentDesign, supersonicDeflections: parts.length ? parts : [componentDesign.shockAngle] });
                                  }}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="e.g., 6, 6, 4"
                                />
                                <p className="text-xs text-gray-500 mt-1">Multi-ramp shock train drives recovery; blank defaults to dual 6° ramps.</p>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="flex justify_between text-gray-700">Compressor Stages <span className="text-blue-600">{componentDesign.compressorStages}</span></label>
                        <input type="range" min="4" max="20" step="1" value={componentDesign.compressorStages} onChange={(e) => setComponentDesign({ ...componentDesign, compressorStages: Number(e.target.value) })} className="w-full accent-blue-600" />
                    </div>
                    <div>
                        <label className="flex justify-between text-gray-700">Turbine Stages <span className="text-blue-600">{componentDesign.turbineStages}</span></label>
                        <input type="range" min="1" max="4" step="1" value={componentDesign.turbineStages} onChange={(e) => setComponentDesign({ ...componentDesign, turbineStages: Number(e.target.value) })} className="w-full accent-blue-600" />
                    </div>
                    <div>
                        <label className="flex justify-between text-gray-700">Cooling Bleed <span className="text-blue-600">{componentDesign.coolingBleed.toFixed(0)}%</span></label>
                        <input type="range" min="0" max="15" step="1" value={componentDesign.coolingBleed} onChange={(e) => setComponentDesign({ ...componentDesign, coolingBleed: Number(e.target.value) })} className="w-full accent-blue-600" />
                    </div>
                </div>
            </section>

            {/* Component Design Studies */}
            <section className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Cpu size={14} /> Component Design Studies
                </h3>
                <ul className="text-sm text-gray-700 space-y-2 list-disc pl-4">
                    <li>Inlet analysis: diffuser recovery (subsonic) vs oblique/normal shock trains (supersonic).</li>
                    <li>Multi-stage compression: map stage count to efficiency and surge margin.</li>
                    <li>Start problem: capture stall-free ramp-up with bleed/open-IGV strategies.</li>
                    <li>Turbine staging & cooling: stage count, bleed fraction, and T04 margin coupling.</li>
                    <li>Acoustics tie-in: inlet/jet noise fed through log-sum for multi-engine aircraft.</li>
                </ul>
            </section>

            {/* Acoustic Setup - Only show for relevant phases */}
            {isNoiseRelevant && (
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Volume2 size={14} /> Acoustic Setup
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Distance</span>
                            <span className="text-blue-600">{observerDist} m</span>
                        </label>
                        <input type="range" min="10" max="1000" step="10" value={observerDist} onChange={(e) => setObserverDist(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Angle (0=Inlet)</span>
                            <span className="text-blue-600">{observerAngle}°</span>
                        </label>
                        <input type="range" min="0" max="180" step="5" value={observerAngle} onChange={(e) => setObserverAngle(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                </div>
            </section>
            )}
        </div>
        )}

        {/* CENTER PANEL: Visuals & Dashboard */}
        <div className="flex-1 bg-gray-50 p-4 lg:p-6 overflow-y-auto w-full">
            
            {modeChoice === 'components' ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-sm uppercase tracking-[0.15em] text-gray-500 font-semibold">Component Design Workspace</div>
                    <div className="text-xl font-bold text-gray-900">Inlets • Compressors • Turbines</div>
                  </div>
                  <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1">
                    Engine: {designSpecs.name} • {componentDesign.inletType === 'supersonic' ? 'Supersonic Inlet' : 'Subsonic Inlet'}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Wind size={14} /> Inlet Analysis
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                      <div><div className="text-gray-500 text-xs uppercase">Type</div><div className="font-semibold capitalize">{results.inlet.type}</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">Recovery</div><div className="font-semibold">{(results.inlet.recovery*100).toFixed(1)}%</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">Exit Mach</div><div className="font-semibold">{results.inlet.machExit.toFixed(3)}</div></div>
                      {results.inlet.betaDeg && <div><div className="text-gray-500 text-xs uppercase">Shock Angle</div><div className="font-semibold">{results.inlet.betaDeg.toFixed(1)}°</div></div>}
                      <div><div className="text-gray-500 text-xs uppercase">P0 Free</div><div className="font-semibold">{formatValue(results.inlet.P0_free, 'pressure')}</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">P02</div><div className="font-semibold">{formatValue(results.inlet.P02, 'pressure')}</div></div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Recovery feeds mass flow and nozzle performance; supersonic inlets use oblique + normal shock loss model.</p>
                  </div>

                  {supersonicDesign && (
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Wind size={14} /> Supersonic Ramp Plan (Mach {Math.max(mach,1).toFixed(2)})
                    </h3>
                    <div className="text-sm text-gray-700 mb-3">
                      <div className="flex justify-between"><span>Total P₀ Ratio</span><span className="font-semibold">{supersonicDesign.totalP0Ratio.toFixed(3)}</span></div>
                      <div className="flex justify-between"><span>Exit Mach</span><span className="font-semibold">{supersonicDesign.machExit.toFixed(3)}</span></div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-700">
                      {supersonicDesign.shocks.map((s, idx) => (
                        <div key={idx} className="flex justify-between bg-gray-50 px-3 py-2 rounded">
                          <div>
                            <div className="text-gray-500 text-xs uppercase">{s.normal ? 'Normal Shock' : `Ramp ${idx+1}`}</div>
                            {!s.normal && <div className="font-semibold">{s.thetaDeg.toFixed(1)}° deflection</div>}
                            {s.normal && <div className="font-semibold">Throat-normal</div>}
                          </div>
                          <div className="text-right text-xs text-gray-600">
                            {!s.normal && <div>β {s.betaDeg.toFixed(1)}°</div>}
                            <div>Mn1 {s.Mn1.toFixed(2)}</div>
                            <div>Mn2 {s.Mn2.toFixed(2)}</div>
                            <div>Mout {s.M2.toFixed(3)}</div>
                            <div>P0↓ x{s.p0ratio ? s.p0ratio.toFixed(3) : '—'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Default plan uses two 6° ramps to keep shock strength mild before the normal shock. Adjust deflection schedule in inlet settings to explore pressure recovery.</p>
                  </div>
                  )}

                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Cpu size={14} /> Compressor Staging
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                      <div><div className="text-gray-500 text-xs uppercase">Stages</div><div className="font-semibold">{componentDesign.compressorStages}</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">Effective η</div><div className="font-semibold">{(results.metrics.etaC_eff*100).toFixed(1)}%</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">OPR</div><div className="font-semibold">{results.metrics.opr.toFixed(1)}</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">Stage Loading</div><div className="font-semibold">{(Math.pow(designSpecs.prC, 1/Math.max(1, componentDesign.compressorStages))).toFixed(2)} PR/stage</div></div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Higher stage loading reduces η; adjust stages to balance weight vs efficiency and surge margin.</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Thermometer size={14} /> Turbine & Cooling
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                      <div><div className="text-gray-500 text-xs uppercase">Stages</div><div className="font-semibold">{componentDesign.turbineStages}</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">Effective η</div><div className="font-semibold">{(results.metrics.etaT_eff*100).toFixed(1)}%</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">Cooling Bleed</div><div className="font-semibold">{componentDesign.coolingBleed.toFixed(0)}%</div></div>
                      <div><div className="text-gray-500 text-xs uppercase">T04 → T05 Δ</div><div className="font-semibold">{(results.stations[3].T - results.stations[4].T).toFixed(0)} K drop</div></div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Cooling bleed reduces core mass flow; stage count boosts η but adds weight and back-pressure.</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Activity size={14} /> Start & Surge Considerations
                    </h3>
                    <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
                      <li>Start sequencing: low N1 with IGVs open and bleeds on to avoid stall.</li>
                      <li>Ramp shock angle (supersonic) with schedule tied to Mach to hold recovery.</li>
                      <li>Monitor surge margin: reduce stage loading or bleed during transients.</li>
                      <li>Noise impact: inlet/jet SPL recomputed via velocity-area model; multi-engine totals use log-sum.</li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <>
            <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg border border-gray-200 w-full lg:w-fit shadow-sm overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('thermo')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'thermo' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Thermodynamics
                </button>
                {isNoiseRelevant && (
                    <button 
                        onClick={() => setActiveTab('noise')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'noise' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Noise Map
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('trade')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'trade' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Trade Study
                </button>
            </div>

            {/* Top Cards: Atmosphere */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-gray-800">Scenario Snapshots</div>
                        <p className="text-xs text-gray-500">Save the current setup, replay it later, or compare deltas.</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={saveSnapshot}
                            className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                        >
                            Save Current
                        </button>
                        {snapshots.length > 0 && (
                            <button 
                                onClick={() => setSnapshots([])}
                                className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
                {snapshots.length === 0 ? (
                    <div className="text-xs text-gray-500 mt-3">No snapshots yet.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {snapshots.map((snap) => (
                            <div key={snap.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                <div className="font-semibold text-sm text-gray-800">{snap.name}</div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => applySnapshot(snap)}
                                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                        >
                                            Apply
                                        </button>
                                        <button 
                                            onClick={() => deleteSnapshot(snap.id)}
                                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600">
                                    Thrust {snap.results?.thrust_N !== undefined ? formatValue(snap.results.thrust_N, 'thrust') : '--'} • TSFC {snap.results?.tsfc ? snap.results.tsfc.toFixed(4) : '--'} • Noise {(snap.results?.noise_dba ?? 0).toFixed(1)} dBA
                                </div>
                                <div className="text-[11px] text-gray-500">
                                    Alt {snap.inputs.altitude.toLocaleString()} ft • Mach {snap.inputs.mach.toFixed(2)} • N1 {snap.inputs.n1}%
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Static Temp</div>
                    <div className="text-lg font-mono font-semibold">{(results.atm.T - 273.15).toFixed(1)}°C</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Static Pressure</div>
                    <div className="text-lg font-mono font-semibold">{(results.atm.P / 1000).toFixed(1)} kPa</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Air Density</div>
                    <div className="text-lg font-mono font-semibold">{results.atm.rho.toFixed(3)} kg/m³</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">True Airspeed</div>
                    <div className="text-lg font-mono font-semibold">{results.v_flight.toFixed(0)} m/s</div>
                </div>
            </div>

            {/* Content based on Tab */}
            {activeTab === 'dashboard' && (
                <>
                    <div className="mb-6">
                        <FlightProfileCharts 
                          designSpecs={designSpecs}
                          componentDesign={componentDesign}
                          altitude={altitude}
                          mach={mach}
                          deltaIsa={deltaIsa}
                          n1={n1}
                          flightPhase={flightPhase}
                          observerDist={observerDist}
                          observerAngle={observerAngle}
                          engineCount={engineCount}
                        />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Performance Metrics */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Gauge size={16} /> Engine Performance
                                </h3>
                                {engineCount > 1 && (
                                  <span className="text-[11px] text-gray-500">Total for {engineCount} engines</span>
                                )}
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-sm text-gray-600">Net Thrust</span>
                                    <span className="text-2xl font-bold text-gray-900">{formatValue(thrustTotal, 'thrust')}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-2">
                                    <div>
                                        <span className="text-xs text-gray-500 block">Gross Thrust</span>
                                        <span className="text-sm font-semibold text-gray-700">{formatValue(grossTotal, 'thrust')}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 block">Ram Drag</span>
                                        <span className="text-sm font-semibold text-red-400">-{formatValue(ramTotal, 'thrust')}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-sm text-gray-600">Fuel Flow</span>
                                    <span className="text-xl font-semibold text-gray-900">{formatValue(fuelTotal, 'massFlow')}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-sm text-gray-600">TSFC</span>
                                    <span className="text-lg font-mono text-gray-900">{formatValue(results.tsfc_curr, 'tsfc')}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-gray-600">Mass Flow</span>
                                    <span className="text-lg font-mono text-gray-900">{formatValue(massFlowTotal, 'massFlow')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Acoustic Analysis */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Volume2 size={16} /> Acoustic Analysis
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${noiseDbTotal > 100 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {noiseDbTotal > 100 ? 'High Noise' : 'Nominal'}
                                </span>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-center mb-6">
                                    <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-4 border-gray-100">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-gray-900">{noiseDbTotal.toFixed(1)}</div>
                                            <div className="text-xs text-gray-500">dBA</div>
                                        </div>
                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                            <circle 
                                                cx="64" cy="64" r="60" 
                                                fill="none" stroke="#E5E7EB" strokeWidth="8" 
                                            />
                                            <circle 
                                                cx="64" cy="64" r="60" 
                                                fill="none" stroke={noiseDbTotal > 110 ? '#EF4444' : '#3B82F6'} strokeWidth="8"
                                                strokeDasharray="377"
                                                strokeDashoffset={377 - (Math.min(noiseDbTotal, 140) / 140) * 377}
                                                className="transition-all duration-500"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="text-gray-500">Jet Noise</div>
                                        <div className="font-semibold">{noiseJetDbTotal.toFixed(1)} dBA</div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="text-gray-500">Fan Noise</div>
                                        <div className="font-semibold">{noiseFanDbTotal.toFixed(1)} dBA</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'thermo' && (
                <StationAnalysis stations={results.stations} formatValue={formatValue} unitSystem={unitSystem} />
            )}

            {activeTab === 'noise' && (
                <div className="h-[500px]">
                    <NoiseContourMap acoustics={results.acoustics} />
                </div>
            )}

            {activeTab === 'trade' && (
                <div className="h-[500px]">
                    <TradeStudy 
                        baseSpecs={designSpecs} 
                        flightCond={{ altitude, mach, deltaIsa }} 
                        n1={n1} 
                        observer={{ dist: observerDist, angle: observerAngle }}
                        componentDesign={componentDesign}
                    />
                </div>
            )}
              </>
            )}
        </div>
      </div>

      {/* Engine Builder Modal */}
      {showBuilder && (
        <EngineBuilder 
          onSave={handleSaveEngine} 
          onCancel={() => setShowBuilder(false)} 
        />
      )}
    </div>
  );
};

export default TurbofanAnalysis;
