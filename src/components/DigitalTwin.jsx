import React, { useState } from 'react';
import StepViewer from './StepViewer';
import { Play, Box, Upload } from 'lucide-react';

const DigitalTwin = () => {
  const [isRendering, setIsRendering] = useState(false);
  const [customUrl, setCustomUrl] = useState(null);
  const stepFileUrl = customUrl || `${window.location.origin}/Udaan.stp`;

  const handleRender = () => {
    setIsRendering(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomUrl(url);
      setIsRendering(true);
    }
  };

  return (
    <div className="w-full h-96 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 relative mb-6">
      {!isRendering ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center p-8">
            <div className="mb-4 flex justify-center">
              <div className="p-4 bg-blue-100 rounded-full">
                <Box size={48} className="text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Udaan - Concept Aircraft</h3>
            <p className="text-gray-600 text-sm mb-6 max-w-md">
              Interactive STEP file rendering using WebAssembly. Click below to load and visualize the 3D model.
            </p>
            <button
              onClick={handleRender}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md mx-auto"
            >
              <Play size={20} />
              Load & Render STEP File
            </button>
            <div className="mt-4 flex items-center gap-2 justify-center">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition cursor-pointer">
                <Upload size={18} />
                Upload STEP File
                <input
                  type="file"
                  accept=".stp,.step,.STEP,.STP"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Note: Initial load may take a moment as the WASM kernel processes the geometry
            </p>
          </div>
        </div>
      ) : (
        <StepViewer url={stepFileUrl} />
      )}
      
      {isRendering && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-xs text-gray-600 border border-gray-200 shadow-sm">
          Live STEP Rendering • CATIA V5 Source • WASM
        </div>
      )}
    </div>
  );
};

export default DigitalTwin;
