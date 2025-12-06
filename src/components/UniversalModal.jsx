import React, { useState, useEffect } from 'react';
import { X, Download, Box, FileText, ExternalLink, Loader } from 'lucide-react';
import StepViewer from './StepViewer';

const UniversalModal = ({ isOpen, onClose, url, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // Detect File Type based on extension
  const isStepFile = url.toLowerCase().endsWith('.stp') || url.toLowerCase().endsWith('.step');
  const isPdf = url.toLowerCase().endsWith('.pdf');
  
  // Reset loading state when URL changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setLoadError(false);
  }, [url]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-8" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 overflow-hidden">
             {/* Icon based on file type */}
             {isStepFile ? (
               <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Box size={20} /></div>
             ) : (
               <div className="p-2 bg-red-100 rounded-lg text-red-600"><FileText size={20} /></div>
             )}
             
             <div className="flex flex-col">
                <h3 className="font-bold text-gray-800 truncate text-lg">{title}</h3>
                {isStepFile && <span className="text-xs text-blue-600 font-medium">Live WASM Rendering</span>}
             </div>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Download Button */}
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition shadow-sm"
              title="Download Original File"
            >
              <Download size={16} /> <span className="hidden sm:inline">Download</span>
            </a>

            {/* Close Button */}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500 hover:text-gray-800">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* --- VIEWER BODY --- */}
        <div className="flex-1 w-full bg-gray-100 relative overflow-hidden">
          
          {isStepFile ? (
            /* CASE A: 3D STEP VIEWER */
            <StepViewer url={url} />
          ) : isPdf ? (
            /* CASE B: NATIVE BROWSER PDF VIEWER (with loading state) */
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader size={40} className="text-blue-600 animate-spin" />
                    <p className="text-gray-600 font-medium">Loading PDF...</p>
                  </div>
                </div>
              )}
              {loadError && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
                  <FileText size={64} className="text-gray-300 mb-4" />
                  <h4 className="text-xl font-semibold text-gray-700 mb-2">Failed to Load PDF</h4>
                  <p className="text-gray-500 mb-6 max-w-md">
                    The PDF could not be loaded inline. Try opening it in a new tab or downloading it.
                  </p>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    <ExternalLink size={18} /> Open PDF
                  </a>
                </div>
              )}
              <object
                data={url}
                type="application/pdf"
                className="w-full h-full"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setLoadError(true);
                }}
              >
                {/* FALLBACK: If the browser cannot render the PDF inline */}
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
                  <FileText size={64} className="text-gray-300 mb-4" />
                  <h4 className="text-xl font-semibold text-gray-700 mb-2">Preview Not Supported</h4>
                  <p className="text-gray-500 mb-6 max-w-md">
                    Your browser cannot embed this PDF inline. Open it in a new tab or download it to view.
                  </p>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    <ExternalLink size={18} /> Open PDF
                  </a>
                </div>
              </object>
            </>
          ) : (
            /* CASE C: UNKNOWN FILE TYPE */
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
              <FileText size={64} className="text-gray-300 mb-4" />
              <h4 className="text-xl font-semibold text-gray-700 mb-2">File Type Not Supported</h4>
              <p className="text-gray-500 mb-6 max-w-md">
                This file type cannot be previewed inline.
              </p>
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                <ExternalLink size={18} /> Open File
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UniversalModal;