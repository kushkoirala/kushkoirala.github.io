import React from 'react';
import { X, Download, Box, FileText, ExternalLink } from 'lucide-react';
import StepViewer from './StepViewer';

const UniversalModal = ({ isOpen, onClose, url, title }) => {
  if (!isOpen) return null;

  // Detect File Type based on extension
  const isStepFile = url.toLowerCase().endsWith('.stp') || url.toLowerCase().endsWith('.step');

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
          ) : (
            /* CASE B: NATIVE BROWSER PDF VIEWER */
            /* We use the <object> tag which invokes the browser's internal PDF engine */
            <object
              data={url}
              type="application/pdf"
              className="w-full h-full"
            >
              {/* FALLBACK: If the browser (e.g. some mobile devices) cannot render the PDF inline */}
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
                <FileText size={64} className="text-gray-300 mb-4" />
                <h4 className="text-xl font-semibold text-gray-700 mb-2">Preview Not Supported Inline</h4>
                <p className="text-gray-500 mb-6 max-w-md">
                  Your browser (likely on mobile) prefers not to embed PDFs directly. 
                  You can view the file by opening it in a new tab.
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
          )}
        </div>

      </div>
    </div>
  );
};

export default UniversalModal;