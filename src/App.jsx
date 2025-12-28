import React, { useState, useEffect } from 'react';
import { Linkedin, Mail, X, FileText, Box, Activity, ArrowRight, Brain, Sun, Moon } from 'lucide-react';
import UniversalModal from './components/UniversalModal';
import DigitalTwin from './components/DigitalTwin';
import ReqIFViewer from './components/ReqIFViewer';
import TurbofanAnalysis from './components/TurbofanAnalysis';

function App() {
  const [modalData, setModalData] = useState({ isOpen: false, url: '', title: '' });
  const [fullScreen, setFullScreen] = useState(null); // 'reqif' | 'twin' | 'acoustic' | null
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // If you host PDFs on GitHub, use the Raw Link.
  // If you put them in the 'public' folder, use the relative path (e.g., window.location.origin + '/report.pdf')
  const openPdf = (e, filename, title) => {
    e.preventDefault();
    // Assuming files are in the public folder
    const fullUrl = `${window.location.origin}/${filename}`;
    setModalData({ isOpen: true, url: fullUrl, title });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300">
      <div className="max-w-4xl mx-auto px-8 py-6 font-sans resume-shell text-base print:max-w-5xl print:px-8 print:pt-8">

      {/* HEADER */}
      <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
          <div>
            <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">Kushal Koirala</h1>
            {/* Social Media Icons */}
            <div className="flex gap-3 mt-2">
              <a
                href="https://linkedin.com/in/kushal-koirala-250125341"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition"
                title="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
              <a
                href="https://x.com/kushkoirala"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="X"
              >
                <X size={16} />
              </a>
              <a
                href="mailto:kush.koirala@gmail.com"
                className="px-3 py-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition text-sm font-medium"
                title="Email"
              >
                kush.koirala@gmail.com
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3 text-left md:text-right mt-4 md:mt-0 text-slate-500 dark:text-slate-400 text-sm">
             <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition print:hidden">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
             <span>📍 Wichita, KS</span>
          </div>
        </div>
        <p className="text-base leading-relaxed text-slate-700 dark:text-slate-400 max-w-2xl">
          <strong>Aerospace Engineer × Solutions Architect.</strong> Building production-grade digital twins and simulation engines. Physics-based modeling, CAD and enterprise systems from concept to deployment.
        </p>
        <button onClick={() => window.print()} className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition print:hidden">
          Print Resume
        </button>
      </header>

      {/* EXPERIENCE */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 border-b border-slate-200 dark:border-slate-700 pb-1 mb-4">Professional Experience</h2>

        {/* Dassault */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Global Architect <span className="font-normal text-slate-600 dark:text-slate-400 ml-1">@ Dassault Systèmes (NIAR-WSU)</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 italic">July 2018 – Present</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-800 dark:text-slate-300 text-sm">
            <li><strong>Global Architect Tesla Inc.:</strong>Unifying engineering(Design,Simulation & Manufacturing) across the Tesla Enterprise</li>
            <li><strong>Boeing MBD/MBSE Transformation:</strong> Spent 3 years embedded with Boeing Design Engineering, Manufacturing, and M&P teams to move product structure/EBOM and engineering processes to an MBD/MBSE framework.</li>
            <li><strong>Real-Time Traceability Infrastructure:</strong> Built a Linux-based 3DExperience + Cameo Systems Modeler stack with live OSLC federation, enabling bidirectional sync between CAD, PLM, and SysML.</li>
            <li><strong>MBSE + UAF Architecture:</strong> Two-year focus on requirements management, architecture definition, standards rollout, and UAF-based reference architectures (MagicGrid/SysML) for multi-industry products-as-systems.</li>
            <li><strong>Custom Framework (Technical Support):</strong> Provide technical consulting to elite engineering corporations on enhancing their engineering capabilities.</li>
            <li><strong>Daily Toolchain:</strong> C++, VBScript, EKL, and shell scripting across Cameo, CATIA/3DEXPERIENCE, and SIMULIA to automate and harden engineering workflows.</li>
          </ul>
        </div>

        {/* Safran */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Lead Design Engineer & Architect <span className="font-normal text-slate-600 dark:text-slate-400 ml-1">@ SAFRAN (Zodiac Aerospace)</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 italic">Dec 2012 – July 2018</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-800 dark:text-slate-300 text-sm">
            <li><strong>Parametric CAD Automation (KBE):</strong> Built CATIA V5 automation framework using VBA/CATScript—algorithmically generated structural components at scale. Reduced design cycle from weeks to days per aircraft program.</li>
            <li><strong>FEA Workflow & Certification:</strong> Established in-house Abaqus/Nastran pipeline for FAA Part 25 compliance. Automated mesh generation + post-processing using Python scripts.</li>
            <li><strong>Model-Based Definition (MBD):</strong> Led company-wide transition to 3D PMI + GD&T in CATIA V5, eliminating 2D drawings for most assemblies. Trained engineering team, now org-wide standard.</li>
            <li><strong>Z300 Certification:</strong> Drove the Z300 aircraft seat through full certification—requirements, design, analysis/test coordination, and compliance documentation—until approved.</li>
          </ul>
        </div>

        {/* Duncan */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Design Engineer <span className="font-normal text-slate-600 dark:text-slate-400 ml-1">@ Duncan Aviation</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 italic">Aug 2012 – Nov 2012</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-800 dark:text-slate-300 text-sm">
            <li><strong>VIP Cabin Integration:</strong> Designed custom Falcon 7X interior mods (BMW Designworks collab). Managed ECOs in SmarTeam PLM—delivered on-time for high-profile client delivery.</li>
          </ul>
        </div>
      </section>

      {/* EDUCATION */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 border-b border-slate-200 dark:border-slate-700 pb-1 mb-4">Education</h2>
        
        <div className="mb-4">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Ph.D. Aerospace Engineering (Coursework)</h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">2021 – Present</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 italic text-sm">Wichita State University — Wichita, KS</p>
          <ul className="list-disc pl-4 mt-1 text-sm text-slate-800 dark:text-slate-300 space-y-1">
            <li><strong>Research Focus:</strong> Optimal Control, Neural Network-based Flight Control, Reinforcement Learning for autonomous systems. <a href="#" onClick={(e) => openPdf(e, 'AIDA - Proposal _ v1.pdf', 'AIDA')} className="text-primary-600 dark:text-primary-400 hover:underline">AIDA Proposal</a> | <a href="#" onClick={(e) => openPdf(e, 'Flight Control Design.pdf', 'Flight Control')} className="text-primary-600 dark:text-primary-400 hover:underline">Control Design</a> | <a href="#" onClick={(e) => openPdf(e, 'Mars Lander.pdf', 'Starship Mars Landing')} className="text-primary-600 dark:text-primary-400 hover:underline">Starship Mars Landing</a></li>
          </ul>
        </div>

        <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">M.S. Aerospace Engineering <span className="font-normal text-slate-600 dark:text-slate-400 ml-2 text-sm">— Wichita State University, Wichita KS</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">May 2024</span>
          </div>
          <ul className="list-disc pl-4 mt-1 text-sm text-slate-800 dark:text-slate-300 space-y-1">
             <li><strong>Project:</strong> <a href="#" onClick={(e) => openPdf(e, 'AcousticsAnalysisTFE731.pdf', 'Acoustic Analysis')} className="text-primary-600 dark:text-primary-400 hover:underline">Turbofan Takeoff Acoustics Modeling</a> (Python/MATLAB) aligning jet/fan noise predictions to lab data.</li>
             <li><strong>Focus:</strong> Flight control with propulsion integration; mission-level design and acoustic trade studies.</li>
          </ul>
        </div>

        <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">M.Eng. Aerospace Engineering <span className="font-normal text-slate-600 dark:text-slate-400 ml-2 text-sm">— University of Texas at Arlington, Arlington TX</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">2016 – 2019</span>
          </div>
          <ul className="list-disc pl-4 mt-1 text-sm text-slate-800 dark:text-slate-300 space-y-1">
            <li><strong>Emphasis:</strong> Advanced composites with supporting GNC coursework.</li>
          </ul>
        </div>

         <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">B.S. Aerospace Engineering <span className="font-normal text-slate-600 dark:text-slate-400 ml-2 text-sm">— Wichita State University, Wichita KS</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">May 2012</span>
          </div>
          <ul className="list-disc pl-4 mt-1 text-sm text-slate-800 dark:text-slate-300 space-y-1">
             <li><strong>Capstone:</strong> <a href="#" onClick={(e) => openPdf(e, 'Final Report-PropShox.pdf', 'Udaan Aircraft')} className="text-primary-600 dark:text-primary-400 hover:underline">Udaan Dive Bomber</a> — Full aircraft design, wind tunnel testing, propulsion integration.</li>
          </ul>
        </div>
      </section>

      {/* INTERACTIVE PORTFOLIO */}
      <section className="mb-12 print:hidden">
        <h2 className="text-3xl font-bold text-primary-600 dark:text-primary-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-6">Interactive Engineering Portfolio</h2>
        <p className="text-slate-600 dark:text-slate-400 text-base mb-8">
          Explore interactive demonstrations of my engineering capabilities, from requirements management to physics-based simulations.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Requirements */}
          <div 
            className="group bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition cursor-pointer flex flex-col" 
            onClick={() => setFullScreen('reqif')}
          >
             <div className="h-12 w-12 bg-primary-50 dark:bg-primary-900/50 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 group-hover:bg-primary-100 dark:group-hover:bg-primary-900 transition">
                <FileText size={24} />
             </div>
             <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">Requirements (ReqIF)</h3>
             <p className="text-base text-slate-600 dark:text-slate-400 mb-4 flex-1">
               View the Udaan aircraft requirements in native ReqIF format. Demonstrates traceability and model-based systems engineering (MBSE) data structures.
             </p>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Stack: ReqIF/Cameo, OSLC, React/Vite.</p>
             <div className="flex items-center text-primary-600 dark:text-primary-400 text-base font-medium group-hover:translate-x-1 transition-transform">
                View Requirements <ArrowRight size={16} className="ml-1" />
             </div>
          </div>

          {/* Card 2: Digital Twin */}
          <div 
            className="group bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 transition cursor-pointer flex flex-col" 
            onClick={() => setFullScreen('twin')}
          >
             <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition">
                <Box size={24} />
             </div>
             <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">Digital Twin (STEP)</h3>
             <p className="text-base text-slate-600 dark:text-slate-400 mb-4 flex-1">
               Interactive 3D visualization of the Udaan aircraft. Showcases digital continuity from engineering CAD data (STEP) to web-based experiences.
             </p>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Stack: React, Three.js, WebAssembly (OCCT), STEP/CAD.</p>
             <div className="flex items-center text-purple-600 dark:text-purple-400 text-base font-medium group-hover:translate-x-1 transition-transform">
                Launch Viewer <ArrowRight size={16} className="ml-1" />
             </div>
          </div>

          {/* Card 3: Turbofan Analysis */}
          <div 
            className="group bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600 transition cursor-pointer flex flex-col" 
            onClick={() => setFullScreen('acoustic')}
          >
             <div className="h-12 w-12 bg-orange-50 dark:bg-orange-900/50 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 group-hover:bg-orange-100 dark:group-hover:bg-orange-900 transition">
                <Activity size={24} />
             </div>
             <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">Turbofan Analysis</h3>
             <p className="text-base text-slate-600 dark:text-slate-400 mb-4 flex-1">
               Real-time physics simulation of turbofan engine performance and acoustics. Includes standard atmosphere modeling and Lighthill noise estimation.
             </p>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Stack: React, JS cycle solver, Lighthill acoustics, Tailwind UI.</p>
             <div className="flex items-center text-orange-600 dark:text-orange-400 text-base font-medium group-hover:translate-x-1 transition-transform">
                Run Simulation <ArrowRight size={16} className="ml-1" />
             </div>
          </div>

          {/* Card 4: AIDA Research */}
          <a 
            className="group bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-teal-300 dark:hover:border-teal-600 transition cursor-pointer flex flex-col" 
            href="https://github.com/kushkoirala/AIDA"
            target="_blank"
            rel="noreferrer"
          >
             <div className="h-12 w-12 bg-teal-50 dark:bg-teal-900/50 rounded-lg flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 group-hover:bg-teal-100 dark:group-hover:bg-teal-900 transition">
                <Brain size={24} />
             </div>
             <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">AIDA Flight Control</h3>
             <p className="text-base text-slate-600 dark:text-slate-400 mb-4 flex-1">
               Integration of reinforcement learning and neural networks for autonomous fixed-wing aircraft control powered by LLMs.
             </p>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Stack: Python, PyTorch, Gymnasium, CUDA, CuPy, NumPy, SciPy, WSL.</p>
             <div className="flex items-center text-teal-600 dark:text-teal-400 text-base font-medium group-hover:translate-x-1 transition-transform">
                View Repository <ArrowRight size={16} className="ml-1" />
             </div>
          </a>
        </div>
      </section>

      {/* PRINTABLE PORTFOLIO SNAPSHOT */}
      <section className="mb-8 hidden print:block">
        <h2 className="text-2xl font-bold text-primary-600 border-b border-slate-200 pb-2 mb-4">Interactive Engineering Portfolio</h2>
        <img 
          src={`${window.location.origin}/logos/portfolio-preview.png`} 
          alt="Interactive Engineering Portfolio snapshot" 
          className="w-full rounded-lg border border-slate-200"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </section>

      {/* MODAL */}
      <UniversalModal 
        isOpen={modalData.isOpen} 
        url={modalData.url} 
        title={modalData.title}
        onClose={() => setModalData({ ...modalData, isOpen: false })} 
      />
    </div>

      {/* Acoustic Simulator Overlay */}
      {fullScreen === 'acoustic' && (
        <TurbofanAnalysis onClose={() => setFullScreen(null)} />
      )}

      {/* Full-screen overlay for viewers */}
      {fullScreen && fullScreen !== 'acoustic' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {fullScreen === 'reqif' ? 'Requirements (Full Screen)' : 'Digital Twin (Full Screen)'}
            </div>
            <button
              type="button"
              onClick={() => setFullScreen(null)}
              className="flex items-center gap-2 text-base text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
            {fullScreen === 'reqif' ? <ReqIFViewer reqifFile="udaan.reqif" /> : <DigitalTwin />}
          </div>
        </div>
      )}
  </div>
  );
}

export default App;
