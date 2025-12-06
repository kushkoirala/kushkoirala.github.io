import React, { useState, useEffect } from 'react';
import { Volume2, Wind, Gauge, ArrowLeft } from 'lucide-react';

// Engine Data
const ENGINES = {
  'TFE731-2': {
    name: 'Honeywell TFE731-2',
    maxThrustLbf: 3500,
    massFlowLbs: 113,
    fanDiaIn: 39.4,
    maxRpm: 11000,
    bypassRatio: 2.8
  },
  'CFM56-7B': {
    name: 'CFM International CFM56-7B',
    maxThrustLbf: 24200,
    massFlowLbs: 770,
    fanDiaIn: 61.0,
    maxRpm: 5175,
    bypassRatio: 5.3
  },
  'GE90-115B': {
    name: 'General Electric GE90-115B',
    maxThrustLbf: 115300,
    massFlowLbs: 3000, // Approx
    fanDiaIn: 128.0,
    maxRpm: 2550, // Approx N1
    bypassRatio: 9.0
  }
};

const AcousticSimulator = ({ onClose }) => {
  const [selectedEngine, setSelectedEngine] = useState('TFE731-2');
  const [n1, setN1] = useState(60); // %
  const [distance, setDistance] = useState(100); // meters
  const [angle, setAngle] = useState(135); // degrees
  const [results, setResults] = useState(null);

  const calculateNoise = () => {
    const specs = ENGINES[selectedEngine];
    const speedOfSound = 343; // m/s

    // 1. Estimate Current Parameters
    const throttle = n1 / 100;
    // Thrust approx N1^3.5
    const currentThrust = specs.maxThrustLbf * Math.pow(throttle, 3.5);
    
    // Mass flow approx linear with throttle for simple model
    const currentMassFlow = specs.massFlowLbs * throttle;
    
    // V_jet (ft/s) = Thrust(lbf) * 32.174 / MassFlow(lb/s)
    // Convert to m/s: ft/s * 0.3048
    let v_jet = 0;
    if (currentMassFlow > 0.1) {
        v_jet = (currentThrust * 32.174 / currentMassFlow) * 0.3048;
    }

    // Fan Tip Speed
    const currentRpm = specs.maxRpm * throttle;
    const dia_m = specs.fanDiaIn * 0.0254;
    const v_tip = Math.PI * dia_m * (currentRpm / 60);

    // 2. Calculate SPL (Simplified Lighthill & Fan correlations)
    
    // Jet Noise Component
    // Avoid log(0)
    const v_jet_safe = Math.max(v_jet, 10);
    let spl_jet = 130 + 80 * Math.log10(v_jet_safe / speedOfSound) 
                      - 20 * Math.log10(distance);
    
    // Directivity: Louder at 135-150 degrees (rear)
    const angle_rad = angle * (Math.PI / 180);
    // Simple rear-bias shape
    const jet_dir = 10 * Math.log10(Math.pow(Math.sin(angle_rad/2), 4) + 0.1); 
    spl_jet += jet_dir;

    // Fan Noise Component
    const v_tip_safe = Math.max(v_tip, 10);
    let spl_fan = 125 + 50 * Math.log10(v_tip_safe / speedOfSound) 
                      - 20 * Math.log10(distance);
    
    // Directivity: Louder at front (0) and rear (180), quiet at side (90)
    const fan_dir = 5 * Math.cos(2 * angle_rad); 
    spl_fan += fan_dir;

    // 3. Total Noise (Logarithmic Sum)
    const total_spl = 10 * Math.log10(Math.pow(10, spl_jet/10) + Math.pow(10, spl_fan/10));

    setResults({
      thrust: currentThrust,
      fuelFlow: currentThrust * 0.5, // Rough TSFC estimate
      splTotal: total_spl,
      splJet: spl_jet,
      splFan: spl_fan,
      vJet: v_jet,
      vTip: v_tip
    });
  };

  useEffect(() => {
    calculateNoise();
  }, [selectedEngine, n1, distance, angle]);

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Turbofan Acoustic Simulator</h1>
          </div>
          <div className="text-sm text-gray-500">
            Based on simplified Lighthill & Fan noise correlations
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Engine Model</label>
              <select 
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.keys(ENGINES).map(key => (
                  <option key={key} value={key}>{ENGINES[key].name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Throttle (N1): {n1}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={n1} 
                onChange={(e) => setN1(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observer Distance: {distance} m
              </label>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10"
                value={distance} 
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observer Angle: {angle}°
              </label>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Inlet (0°)</span>
                <span>Exhaust (180°)</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="180" 
                value={angle} 
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Visualization & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Display */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
              {/* Simple Visual Representation */}
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Engine Icon */}
                <div className="absolute z-10 text-gray-800">
                    <Wind size={64} className="animate-pulse" style={{ animationDuration: `${3000/Math.max(n1, 1)}ms` }} />
                </div>
                
                {/* Noise Waves */}
                <div 
                    className="absolute rounded-full border-4 border-red-500 opacity-20"
                    style={{ 
                        width: `${Math.max(results?.splTotal || 0, 50) * 2}px`, 
                        height: `${Math.max(results?.splTotal || 0, 50) * 2}px`,
                        transition: 'all 0.3s ease'
                    }}
                />
                <div 
                    className="absolute rounded-full border-4 border-orange-500 opacity-30"
                    style={{ 
                        width: `${Math.max(results?.splTotal || 0, 50) * 1.5}px`, 
                        height: `${Math.max(results?.splTotal || 0, 50) * 1.5}px`,
                        transition: 'all 0.3s ease'
                    }}
                />
              </div>

              <div className="mt-8 text-center">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {results?.splTotal.toFixed(1)} <span className="text-2xl text-gray-500">dB</span>
                </div>
                <div className="text-gray-500">Estimated Sound Pressure Level</div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Gauge size={16} />
                  <span className="text-sm font-semibold">Thrust</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {results?.thrust.toFixed(0)} <span className="text-sm font-normal text-gray-500">lbf</span>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <Volume2 size={16} />
                  <span className="text-sm font-semibold">Jet Noise</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {results?.splJet.toFixed(1)} <span className="text-sm font-normal text-gray-500">dB</span>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                  <Volume2 size={16} />
                  <span className="text-sm font-semibold">Fan Noise</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {results?.splFan.toFixed(1)} <span className="text-sm font-normal text-gray-500">dB</span>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <div className="flex items-center gap-2 text-orange-700 mb-1">
                  <Wind size={16} />
                  <span className="text-sm font-semibold">Jet Velocity</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {results?.vJet.toFixed(0)} <span className="text-sm font-normal text-gray-500">m/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcousticSimulator;
