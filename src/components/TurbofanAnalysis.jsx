import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gauge, Wind, Thermometer, Activity, 
  ArrowLeft, Settings, Volume2, Info, Cpu, Zap, Menu, X, Plus
} from 'lucide-react';
import EngineBuilder from './EngineBuilder';

// --- 1. Physics & Math Models ---

// Constants
const R_GAS = 287;
const GAMMA_C = 1.37; // Compressor
const GAMMA_F = 1.4;  // Fan
const GAMMA_T = 1.33; // Turbine
const GAMMA_N = 1.36; // Nozzle

const CP_C = (GAMMA_C * R_GAS) / (GAMMA_C - 1);
const CP_F = (GAMMA_F * R_GAS) / (GAMMA_F - 1);
const CP_T = (GAMMA_T * R_GAS) / (GAMMA_T - 1);
const CP_N = (GAMMA_N * R_GAS) / (GAMMA_N - 1);

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
    massFlowSl: 1350, // kg/s
    bpr: 9.0,
    prC: 42.0,
    prF: 1.65,
    t04_max: 1750,
    fanDia: 3.25,
    tsfc_ref: 0.29
  }
};

// --- Core Calculation Function (Pure) ---
const calculatePerformance = (engineSpecs, flightCond, n1, observer) => {
    const { altitude, mach, deltaIsa } = flightCond;
    const { dist, angle } = observer;
    const atm = getAtmosphere(altitude, deltaIsa);
    
    // 1. Flight Conditions
    const v_flight = mach * atm.a; // m/s
    const Ta = atm.T;
    const Pa = atm.P;

    // 2. Thermodynamic Cycle Analysis (Parametric)
    
    // Throttle sets T04 (Turbine Inlet Temp)
    const throttle = Math.max(n1, 20) / 100;
    const T04 = Ta + (engineSpecs.t04_max - Ta) * Math.pow(throttle, 1.5); 

    // --- Diffuser (Inlet) ---
    const T02 = Ta * (1 + 0.5 * (GAMMA_C - 1) * mach * mach);
    const P02 = Pa * Math.pow(1 + ETA_D * (T02 / Ta - 1), GAMMA_C / (GAMMA_C - 1));

    // --- Fan ---
    const P08 = P02 * engineSpecs.prF;
    const T08 = T02 * (1 + (1 / ETA_F) * (Math.pow(engineSpecs.prF, (GAMMA_F - 1) / GAMMA_F) - 1));

    // --- Compressor ---
    const P03 = P02 * engineSpecs.prC;
    const T03 = T02 * (1 + (1 / ETA_C) * (Math.pow(engineSpecs.prC, (GAMMA_C - 1) / GAMMA_C) - 1));

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
        const term = 1 - (1 / ETA_T) * (1 - T05 / T04);
        if (term > 0) {
            P05 = P04 * Math.pow(term, GAMMA_T / (GAMMA_T - 1));
        }
    }

    // --- Nozzles (Core & Fan) ---
    let UeC = 0;
    if (P05 > Pa) {
        const expansion = 1 - Math.pow(Pa / P05, (GAMMA_N - 1) / GAMMA_N);
        if (expansion > 0) {
            UeC = Math.sqrt(2 * ETA_N * CP_N * T05 * expansion);
        }
    }

    let UeF = 0;
    if (P08 > Pa) {
        const expansion = 1 - Math.pow(Pa / P08, (GAMMA_F - 1) / GAMMA_F);
        if (expansion > 0) {
            UeF = Math.sqrt(2 * ETA_N * CP_F * T08 * expansion);
        }
    }

    // --- Thrust & Mass Flow ---
    const delta_inlet = P02 / 101325;
    const theta_inlet = T02 / 288.15;
    const m_dot_total = engineSpecs.massFlowSl * (delta_inlet / Math.sqrt(theta_inlet)) * throttle;
    
    const m_dot_core = m_dot_total / (1 + engineSpecs.bpr);
    const m_dot_fan = m_dot_total - m_dot_core;

    // Gross Thrust components
    const F_gross_N = (m_dot_core * UeC) + (m_dot_fan * UeF);
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

    // TSFC
    const tsfc_curr = F_net_lbf > 10 ? fuel_flow_lb_hr / F_net_lbf : 0;

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

    // --- Acoustics (Lighthill) ---
    const dist_attn = 20 * Math.log10(dist);
    const v_jet_eff = UeC; 
    
    // Source Levels (at 1m, no directivity)
    const spl_jet_source = 135 + 80 * Math.log10(Math.max(v_jet_eff, 10) / 340);
    
    const fan_rpm = (n1 / 100) * (engineSpecs.name.includes('TFE') ? 11000 : engineSpecs.name.includes('CFM') ? 5175 : 2550);
    const v_tip = Math.PI * engineSpecs.fanDia * (fan_rpm / 60);
    
    const spl_fan_source = 130 + 60 * Math.log10(Math.max(v_tip, 10) / 340);

    // Observer SPL
    let spl_jet = spl_jet_source - dist_attn;
    const angle_rad = angle * (Math.PI / 180);
    spl_jet += 10 * Math.log10(Math.pow(Math.sin(angle_rad/2), 4) + 0.1);

    let spl_fan = spl_fan_source - dist_attn;
    spl_fan += 5 * Math.cos(2 * angle_rad);

    const spl_total = 10 * Math.log10(Math.pow(10, spl_jet/10) + Math.pow(10, spl_fan/10));

    return {
      atm,
      v_flight,
      F_net: F_net_lbf,
      F_gross: F_gross_lbf,
      Ram_Drag: Ram_Drag_lbf,
      fuel_flow: fuel_flow_lb_hr,
      m_dot_total: m_dot_total * 2.20462, // lb/s
      spl_total,
      spl_jet,
      spl_fan,
      v_jet: UeC,
      tsfc_curr,
      metrics: {
          eta_thermal,
          eta_propulsive,
          eta_overall,
          bwr,
          opr: engineSpecs.prC * engineSpecs.prF // Overall Pressure Ratio approx
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
          fan_source: spl_fan_source
      }
    };
};

// --- 2. Components ---

const EngineDiagram = ({ n1, mach }) => {
  // Simple SVG visualization of a turbofan
  
  return (
    <div className="relative w-full h-64 bg-gray-900 rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center">
      {/* Background Airflow Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="cyan" stopOpacity="0" />
            <stop offset="50%" stopColor="cyan" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Streamlines */}
        {[...Array(10)].map((_, i) => (
          <line 
            key={i}
            x1="-10%" y1={10 + i * 8 + "%"} 
            x2="110%" y2={10 + i * 8 + "%"} 
            stroke="url(#flowGrad)" 
            strokeWidth="2"
            strokeDasharray="20, 10"
            className="animate-flow"
            style={{ 
                animation: `flowMove ${2 / (1 + mach)}s linear infinite`,
                animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </svg>

      {/* Engine Cutaway SVG */}
      <svg viewBox="0 0 400 200" className="w-full h-full max-w-2xl z-10 drop-shadow-2xl">
        {/* Nacelle / Cowling */}
        <path d="M 50,40 Q 120,35 180,45 L 350,55 L 350,145 L 180,155 Q 120,165 50,160 Z" fill="#374151" stroke="#4B5563" strokeWidth="2" />
        <path d="M 50,40 Q 120,35 180,45 L 180,155 Q 120,165 50,160 Z" fill="#1F2937" /> {/* Inlet */}

        {/* Core Cowling */}
        <path d="M 120,70 L 320,80 L 320,120 L 120,130 Z" fill="#4B5563" />

        {/* Fan Blades (Animated) */}
        <g transform="translate(80, 100)">
           <circle r="38" fill="#111" stroke="#555" strokeWidth="2" />
           <g className={n1 > 0 ? "animate-spin" : ""} style={{ animationDuration: `${3000 / Math.max(n1, 1)}ms` }}>
             {[...Array(12)].map((_, i) => (
               <path 
                 key={i}
                 d="M 0,0 L 35,-5 L 35,5 Z" 
                 fill="#AAA" 
                 transform={`rotate(${i * 30})`}
               />
             ))}
           </g>
           <circle r="10" fill="#333" /> {/* Spinner */}
        </g>

        {/* Exhaust Plume (Dynamic) */}
        {n1 > 10 && (
            <g transform="translate(350, 100)" opacity={n1/100}>
                <path d="M 0,-45 L 100,-60 L 100,60 L 0,45 Z" fill="url(#bypassGrad)" opacity="0.3" />
                <path d="M 0,-20 L 150,-30 L 150,30 L 0,20 Z" fill="url(#coreGrad)" opacity="0.6" />
            </g>
        )}

        <defs>
            <linearGradient id="bypassGrad">
                <stop offset="0%" stopColor="#88CCFF" />
                <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="coreGrad">
                <stop offset="0%" stopColor="#FF8800" />
                <stop offset="100%" stopColor="transparent" />
            </linearGradient>
        </defs>
      </svg>
      
      <style>{`
        @keyframes flowMove {
            from { stroke-dashoffset: 100; }
            to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};

const StationAnalysis = ({ stations }) => {
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
                            <div className="text-blue-200">P: {(s.P/1000).toFixed(1)} kPa</div>
                            <div className="text-red-200">T: {(s.T - 273.15).toFixed(1)} °C</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-center gap-6 mt-6 text-xs font-medium border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div> Total Pressure (kPa)
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div> Total Temperature (°C)
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
                
                // Jet Noise
                let spl_jet = acoustics.jet_source - dist_attn;
                // Directivity: 10*log10(sin(theta/2)^4 + 0.1)
                // theta is 0 at inlet, PI at exhaust.
                // sin(theta/2) is 0 at inlet, 1 at exhaust.
                // So jet noise peaks at exhaust. Correct.
                spl_jet += 10 * Math.log10(Math.pow(Math.sin(theta/2), 4) + 0.1);

                // Fan Noise
                let spl_fan = acoustics.fan_source - dist_attn;
                // Directivity: 5*cos(2*theta)
                // Peaks at 0 (inlet) and PI (exhaust). Dips at 90.
                spl_fan += 5 * Math.cos(2 * theta);

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
    F_net: { label: 'Net Thrust (lbf)', color: '#2563eb' },
    tsfc_curr: { label: 'TSFC (lb/lbf-hr)', color: '#16a34a' },
    eta_overall: { label: 'Overall Efficiency', color: '#9333ea' },
    spl_total: { label: 'Noise Level (dB)', color: '#dc2626' },
    bwr: { label: 'Back Work Ratio', color: '#ea580c' }
};

const TradeStudy = ({ baseSpecs, flightCond, n1, observer }) => {
    const [paramX, setParamX] = useState('bpr');
    const [paramY, setParamY] = useState('tsfc_curr');

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

            const res = calculatePerformance(testSpecs, testFlight, testN1, observer);
            
            // Extract Y value
            let yVal = 0;
            if (['eta_overall', 'bwr'].includes(paramY)) {
                yVal = res.metrics[paramY];
            } else {
                yVal = res[paramY];
            }

            points.push({ x: val, y: yVal });
        }
        return points;
    }, [paramX, paramY, baseSpecs, flightCond, n1, observer]);

    // Chart Scaling
    const xVals = dataPoints.map(p => p.x);
    const yVals = dataPoints.map(p => p.y);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);

    const normalizeX = (val) => (val - minX) / (maxX - minX) * 350; // Width 350
    const normalizeY = (val) => 200 - (val - minY) / (maxY - minY) * 200; // Height 200

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Activity size={16} /> Parametric Trade Study
                </h3>
                <div className="flex gap-2">
                    <select 
                        value={paramX} 
                        onChange={(e) => setParamX(e.target.value)}
                        className="text-xs border border-gray-300 rounded p-1 bg-gray-50"
                    >
                        {Object.keys(TRADE_PARAMS).map(k => <option key={k} value={k}>X: {TRADE_PARAMS[k].label}</option>)}
                    </select>
                    <select 
                        value={paramY} 
                        onChange={(e) => setParamY(e.target.value)}
                        className="text-xs border border-gray-300 rounded p-1 bg-gray-50"
                    >
                        {Object.keys(TRADE_METRICS).map(k => <option key={k} value={k}>Y: {TRADE_METRICS[k].label}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 relative border-l border-b border-gray-200 m-4">
                {/* Chart Area */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 350 200">
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(t => (
                        <line key={t} x1="0" y1={t*200} x2="350" y2={t*200} stroke="#f3f4f6" strokeWidth="1" />
                    ))}
                    
                    {/* Data Path */}
                    <polyline 
                        fill="none" 
                        stroke={TRADE_METRICS[paramY].color} 
                        strokeWidth="3" 
                        points={dataPoints.map(p => `${normalizeX(p.x)},${normalizeY(p.y)}`).join(' ')}
                    />

                    {/* Points */}
                    {dataPoints.map((p, i) => (
                        <circle 
                            key={i} 
                            cx={normalizeX(p.x)} 
                            cy={normalizeY(p.y)} 
                            r="3" 
                            fill="white" 
                            stroke={TRADE_METRICS[paramY].color} 
                            strokeWidth="2"
                            className="hover:r-4 transition-all"
                        >
                            <title>{`X: ${p.x.toFixed(2)}\nY: ${p.y.toFixed(4)}`}</title>
                        </circle>
                    ))}
                </svg>
                
                {/* Labels */}
                <div className="absolute -bottom-6 left-0 text-xs text-gray-500">{minX.toFixed(1)}</div>
                <div className="absolute -bottom-6 right-0 text-xs text-gray-500">{maxX.toFixed(1)}</div>
                <div className="absolute bottom-[-25px] w-full text-center text-xs font-medium text-gray-600">{TRADE_PARAMS[paramX].label}</div>

                <div className="absolute -left-8 bottom-0 text-xs text-gray-500">{minY.toFixed(1)}</div>
                <div className="absolute -left-8 top-0 text-xs text-gray-500">{maxY.toFixed(1)}</div>
                <div className="absolute top-[50%] -left-12 -rotate-90 text-xs font-medium text-gray-600 whitespace-nowrap">{TRADE_METRICS[paramY].label}</div>
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
  const [optimizationStatus, setOptimizationStatus] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

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
  
  // Acoustics State
  const [observerDist, setObserverDist] = useState(100); // m
  const [observerAngle, setObserverAngle] = useState(135); // deg

    const handleSelectEngine = (key) => {
        setEngineKey(key);
        if (engines[key]) {
            setDesignSpecs(engines[key]);
        }
    };

  // --- Calculations ---
  const results = useMemo(() => {
    return calculatePerformance(
        designSpecs, 
        { altitude, mach, deltaIsa }, 
        n1, 
        { dist: observerDist, angle: observerAngle }
    );
  }, [designSpecs, n1, altitude, mach, deltaIsa, observerDist, observerAngle]);

  // --- Optimization Logic ---
  
  // 1. Cycle Design Optimizer (Modifies Hardware)
  const runDesignOptimizer = (objective) => {
    setIsOptimizing(true);
    setOptimizationStatus(`Designing Engine for ${objective}...`);

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
                        { dist: 100, angle: 135 }
                    );

                    let score = -Infinity;

                    if (objective === 'Quiet Takeoff') {
                        // Maximize Thrust / Noise Penalty
                        if (res.F_net > 1000) score = res.F_net / Math.pow(res.spl_total, 3);
                    } else if (objective === 'Eco Cruise') {
                        // Minimize TSFC
                        if (res.F_net > 500) score = -res.tsfc_curr;
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
        
        setOptimizationStatus('Design Complete');
        setTimeout(() => setIsOptimizing(false), 1000);
    }, 100);
  };

  // 2. Flight Profile Optimizer (Modifies Operations only)
  const runFlightOptimizer = (objective) => {
      setIsOptimizing(true);
      setOptimizationStatus(`Finding Best Flight Profile for ${objective}...`);

      setTimeout(() => {
          let bestFlight = { altitude, mach, n1 };
          let bestScore = -Infinity;

          // Search Space (Operations)
          // Altitude: 0 to 50k
          // Mach: 0.3 to 0.95
          // N1: Fixed or Optimized? Let's optimize N1 for Cruise, fix for Max Power.

          const altRange = [0, 10000, 20000, 30000, 35000, 40000, 45000];
          const machRange = [0.3, 0.5, 0.7, 0.75, 0.8, 0.85, 0.9];
          
          for (let alt of altRange) {
              for (let m of machRange) {
                  let testN1 = n1;
                  if (objective === 'Best Range') testN1 = 90; // Cruise power
                  if (objective === 'Max Thrust') testN1 = 100; // Max power

                  const res = calculatePerformance(
                      designSpecs, // KEEP ENGINE FIXED
                      { altitude: alt, mach: m, deltaIsa },
                      testN1,
                      { dist: 100, angle: 135 }
                  );

                  let score = -Infinity;

                  if (objective === 'Best Range') {
                      // Maximize Specific Range ~ Velocity / FuelFlow
                      // (Miles per Gallon equivalent)
                      if (res.F_net > 500) { // Min thrust to maintain flight
                          score = res.v_flight / res.fuel_flow;
                      }
                  } else if (objective === 'Max Thrust') {
                      // Maximize Net Thrust (e.g. for climb/intercept)
                      score = res.F_net;
                  } else if (objective === 'Loiter') {
                      // Maximize Endurance ~ 1 / FuelFlow
                      if (res.F_net > 500) {
                          score = -res.fuel_flow;
                      }
                  }

                  if (score > bestScore) {
                      bestScore = score;
                      bestFlight = { altitude: alt, mach: m, n1: testN1 };
                  }
              }
          }

          setAltitude(bestFlight.altitude);
          setMach(bestFlight.mach);
          setN1(bestFlight.n1);

          setOptimizationStatus('Flight Profile Found');
          setTimeout(() => setIsOptimizing(false), 1000);
      }, 100);
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 lg:gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-blue-600 hidden sm:block" />
              Turbofan Analysis
            </h1>
            <p className="text-[10px] lg:text-xs text-gray-500 hidden sm:block">Real-time cycle estimation • Standard Atmosphere • Lighthill Acoustics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
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
        <div className={`
            absolute inset-0 z-30 bg-white lg:static lg:w-80 lg:block border-r border-gray-200 overflow-y-auto p-6 space-y-8 transition-transform duration-300 ease-in-out
            ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
            
            {/* 1. Cycle Design Solver */}
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

            {/* 2. Flight Profile Optimizer */}
            <section className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <h3 className="text-xs font-semibold text-purple-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Activity size={14} /> Flight Profile Optimizer
                </h3>
                <p className="text-[10px] text-purple-600 mb-3 leading-tight">
                    Finds best Altitude & Mach for the current engine configuration.
                </p>
                <div className="space-y-2">
                    <button 
                        onClick={() => runFlightOptimizer('Best Range')}
                        disabled={isOptimizing}
                        className="w-full py-2 px-3 bg-white border border-purple-200 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition flex items-center justify-between"
                    >
                        <span>Best Range (Cruise)</span>
                        <Gauge size={14} />
                    </button>
                    <button 
                        onClick={() => runFlightOptimizer('Loiter')}
                        disabled={isOptimizing}
                        className="w-full py-2 px-3 bg-white border border-purple-200 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition flex items-center justify-between"
                    >
                        <span>Max Endurance (Loiter)</span>
                        <Activity size={14} />
                    </button>
                </div>
                {isOptimizing && (
                    <div className="mt-2 text-xs text-blue-600 animate-pulse text-center font-medium">
                        {optimizationStatus}
                    </div>
                )}
            </section>

            {/* Design Parameters (Editable) */}
            <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings size={14} /> Cycle Design
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Bypass Ratio</span>
                            <span className="text-blue-600">{designSpecs.bpr.toFixed(1)}</span>
                        </label>
                        <input 
                            type="range" min="0" max="15" step="0.1" 
                            value={designSpecs.bpr} 
                            onChange={(e) => setDesignSpecs({...designSpecs, bpr: Number(e.target.value)})} 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                        />
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Compressor PR</span>
                            <span className="text-blue-600">{designSpecs.prC.toFixed(1)}</span>
                        </label>
                        <input 
                            type="range" min="5" max="60" step="1" 
                            value={designSpecs.prC} 
                            onChange={(e) => setDesignSpecs({...designSpecs, prC: Number(e.target.value)})} 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                        />
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Fan PR</span>
                            <span className="text-blue-600">{designSpecs.prF.toFixed(2)}</span>
                        </label>
                        <input 
                            type="range" min="1.1" max="2.5" step="0.05" 
                            value={designSpecs.prF} 
                            onChange={(e) => setDesignSpecs({...designSpecs, prF: Number(e.target.value)})} 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                        />
                    </div>
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
                        <input type="range" min="0" max="0.95" step="0.01" value={mach} onChange={(e) => setMach(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
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

            {/* Acoustic Setup */}
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
        </div>

        {/* CENTER PANEL: Visuals & Dashboard */}
        <div className="flex-1 bg-gray-50 p-4 lg:p-6 overflow-y-auto w-full">
            
            {/* Tab Navigation */}
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
                <button 
                    onClick={() => setActiveTab('noise')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'noise' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Noise Map
                </button>
                <button 
                    onClick={() => setActiveTab('trade')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'trade' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Trade Study
                </button>
            </div>

            {/* Top Cards: Atmosphere */}
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
                        <EngineDiagram n1={n1} mach={mach} engineType={engineKey} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Performance Metrics */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Gauge size={16} /> Engine Performance
                                </h3>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-sm text-gray-600">Net Thrust</span>
                                    <span className="text-2xl font-bold text-gray-900">{results.F_net.toFixed(0)} <span className="text-sm font-normal text-gray-500">lbf</span></span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-2">
                                    <div>
                                        <span className="text-xs text-gray-500 block">Gross Thrust</span>
                                        <span className="text-sm font-semibold text-gray-700">{results.F_gross.toFixed(0)} lbf</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 block">Ram Drag</span>
                                        <span className="text-sm font-semibold text-red-400">-{results.Ram_Drag.toFixed(0)} lbf</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-sm text-gray-600">Fuel Flow</span>
                                    <span className="text-xl font-semibold text-gray-900">{results.fuel_flow.toFixed(0)} <span className="text-sm font-normal text-gray-500">lb/hr</span></span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-sm text-gray-600">TSFC</span>
                                    <span className="text-lg font-mono text-gray-900">{results.tsfc_curr.toFixed(3)}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-gray-600">Mass Flow</span>
                                    <span className="text-lg font-mono text-gray-900">{results.m_dot_total.toFixed(1)} <span className="text-sm font-normal text-gray-500">lb/s</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Acoustic Analysis */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Volume2 size={16} /> Acoustic Analysis
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${results.spl_total > 100 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {results.spl_total > 100 ? 'High Noise' : 'Nominal'}
                                </span>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-center mb-6">
                                    <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-4 border-gray-100">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-gray-900">{results.spl_total.toFixed(1)}</div>
                                            <div className="text-xs text-gray-500">dB SPL</div>
                                        </div>
                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                            <circle 
                                                cx="64" cy="64" r="60" 
                                                fill="none" stroke="#E5E7EB" strokeWidth="8" 
                                            />
                                            <circle 
                                                cx="64" cy="64" r="60" 
                                                fill="none" stroke={results.spl_total > 110 ? '#EF4444' : '#3B82F6'} strokeWidth="8"
                                                strokeDasharray="377"
                                                strokeDashoffset={377 - (Math.min(results.spl_total, 140) / 140) * 377}
                                                className="transition-all duration-500"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="text-gray-500">Jet Noise</div>
                                        <div className="font-semibold">{results.spl_jet.toFixed(1)} dB</div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="text-gray-500">Fan Noise</div>
                                        <div className="font-semibold">{results.spl_fan.toFixed(1)} dB</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'thermo' && (
                <StationAnalysis stations={results.stations} />
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
                    />
                </div>
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
