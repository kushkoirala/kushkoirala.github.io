import { useState, useEffect } from 'react';
import { X, Download, FileText, ExternalLink, Loader } from 'lucide-react';

const UniversalModal = ({ isOpen, onClose, url, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setLoadError(false);
  }, [url]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-8" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 w-full max-w-6xl h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-600 dark:text-red-400"><FileText size={20} /></div>
            <h3 className="font-bold text-slate-800 dark:text-white truncate text-lg">{title}</h3>
          </div>

          <div className="flex gap-3 items-center">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-black text-white text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-950 transition shadow-sm"
              title="Download Original File"
            >
              <Download size={16} /> <span className="hidden sm:inline">Download</span>
            </a>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition text-slate-500 hover:text-slate-800 dark:hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader size={40} className="text-primary-600 dark:text-primary-400 animate-spin" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">Loading PDF...</p>
              </div>
            </div>
          )}
          {loadError && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50 dark:bg-slate-800">
              <FileText size={64} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h4 className="text-xl font-semibold text-slate-700 dark:text-white mb-2">Failed to Load PDF</h4>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                The PDF could not be loaded inline. Try opening it in a new tab or downloading it.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition shadow-md"
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
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50 dark:bg-slate-800">
              <FileText size={64} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h4 className="text-xl font-semibold text-slate-700 dark:text-white mb-2">Preview Not Supported</h4>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                Your browser cannot embed this PDF inline. Open it in a new tab or download it to view.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition shadow-md"
              >
                <ExternalLink size={18} /> Open File
              </a>
            </div>
          </object>
        </div>

      </div>
    </div>
  );
};

export default UniversalModal;
