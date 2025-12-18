import React, { useState } from 'react';
import { Save, Upload, Download, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const EngineBuilder = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: 'My Custom Engine',
    massFlowSl: 100, // kg/s
    bpr: 5.0,
    prC: 20.0,
    prF: 1.5,
    t04_max: 1400, // K
    fanDia: 1.2, // m
    tsfc_ref: 0.4
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' ? value : Number(value)
    }));
    
    // Simple validation
    if (name !== 'name' && Number(value) <= 0) {
      setErrors(prev => ({ ...prev, [name]: 'Must be positive' }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;
    
    // Generate a unique ID
    const id = `custom-${Date.now()}`;
    onSave(id, formData);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${formData.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        // Validate keys
        const requiredKeys = ['name', 'massFlowSl', 'bpr', 'prC', 'prF', 't04_max', 'fanDia'];
        const missing = requiredKeys.filter(k => !(k in importedData));
        if (missing.length > 0) {
          alert(`Invalid file. Missing: ${missing.join(', ')}`);
          return;
        }
        setFormData(prev => ({ ...prev, ...importedData }));
      } catch {
        alert('Failed to parse JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="text-primary-600 dark:text-primary-400" /> Create Custom Engine
          </h2>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 dark:hover:text-white">
            <Trash2 size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">General Info</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Engine Name</label>
              <input 
                type="text" name="name" 
                value={formData.name} onChange={handleChange}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {/* Cycle Parameters */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cycle Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bypass Ratio (BPR)</label>
                <input 
                  type="number" name="bpr" step="0.1" min="0"
                  value={formData.bpr} onChange={handleChange}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ratio of bypass air to core air (0-15)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Compressor PR</label>
                <input 
                  type="number" name="prC" step="1" min="1"
                  value={formData.prC} onChange={handleChange}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Core pressure ratio (10-60)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fan PR</label>
                <input 
                  type="number" name="prF" step="0.05" min="1"
                  value={formData.prF} onChange={handleChange}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fan pressure ratio (1.1-2.0)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Turbine Inlet Temp (K)</label>
                <input 
                  type="number" name="t04_max" step="10" min="500"
                  value={formData.t04_max} onChange={handleChange}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Max temperature at burner exit (1200-1800K)</p>
              </div>
            </div>
          </div>

          {/* Geometry & Sizing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sizing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mass Flow (SL) [kg/s]</label>
                <input 
                  type="number" name="massFlowSl" step="10" min="1"
                  value={formData.massFlowSl} onChange={handleChange}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total airflow at Sea Level Static</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fan Diameter [m]</label>
                <input 
                  type="number" name="fanDia" step="0.1" min="0.1"
                  value={formData.fanDia} onChange={handleChange}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-2">
               <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer text-sm font-medium">
                 <Upload size={16} /> Import JSON
                 <input type="file" accept=".json" onChange={handleImport} className="hidden" />
               </label>
               <button 
                 type="button" 
                 onClick={handleExport}
                 className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium"
               >
                 <Download size={16} /> Export JSON
               </button>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={onCancel}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2"
              >
                <Save size={18} /> Save Engine
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EngineBuilder;
