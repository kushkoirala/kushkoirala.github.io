import React, { useState } from 'react';
import { Linkedin, Mail, X, FileText, Box, Activity, ArrowRight, Brain } from 'lucide-react';
import UniversalModal from './components/UniversalModal';
import DigitalTwin from './components/DigitalTwin';
import ReqIFViewer from './components/ReqIFViewer';
import TurbofanAnalysis from './components/TurbofanAnalysis';

function App() {
  const [modalData, setModalData] = useState({ isOpen: false, url: '', title: '' });
  const [fullScreen, setFullScreen] = useState(null); // 'reqif' | 'twin' | 'acoustic' | null

  // If you host PDFs on GitHub, use the Raw Link. 
  // If you put them in the 'public' folder, use the relative path (e.g., window.location.origin + '/report.pdf')
  const openPdf = (e, filename, title) => {
    e.preventDefault();
    // Assuming files are in the public folder
    const fullUrl = `${window.location.origin}/${filename}`; 
    setModalData({ isOpen: true, url: fullUrl, title });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-8 py-6 font-sans resume-shell text-base">
      
      {/* HEADER */}
      <header className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
          <div>
            <h1 className="text-4xl font-bold text-blue-700 mb-2">Kushal Koirala</h1>
            {/* Social Media Icons */}
            <div className="flex gap-3 mt-2">
              <a 
                href="https://linkedin.com/in/kushal-koirala-250125341" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                title="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
              <a 
                href="https://x.com/kushkoirala" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition"
                title="X"
              >
                <X size={16} />
              </a>
              <a 
                href="mailto:kush.koirala@gmail.com"
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                title="Email"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>
          <div className="text-left md:text-right mt-4 md:mt-0 text-gray-500 text-sm">
             <span>📍 Wichita, KS</span>
          </div>
        </div>
        <p className="text-base leading-relaxed text-gray-700 max-w-2xl">
          <strong>Aerospace Engineer × Software Architect.</strong> Building production-grade digital twins and simulation engines. Expert in CAD automation, physics-based modeling, and cloud infrastructure. Proven track record shipping enterprise systems from concept to deployment.
        </p>
        <button onClick={() => window.print()} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition print:hidden">
          Print Resume
        </button>
      </header>

      {/* EXPERIENCE */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-blue-700 border-b border-gray-200 pb-1 mb-4">Professional Experience</h2>

        {/* Dassault */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Global Architect <span className="font-normal text-gray-600 ml-1">@ Dassault Systèmes (NIAR-WSU)</span></h3>
            </div>
            <span className="text-sm text-gray-500 italic">July 2018 – Present</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-gray-800 text-sm">
            <li><strong>Automated Workflow Orchestration:</strong> Architected auto-provisioning pipeline for Materials & Processes (EnoviaSLS/CAA), reducing deployment time from weeks to days. Deployed across multiple major OEMs.</li>
            <li><strong>Real-Time Traceability Infrastructure:</strong> Built Linux-based 3DExperience + Cameo Systems Modeler stack with live OSLC federation. Enabled bidirectional sync between CAD, PLM, and SysML.</li>
            <li><strong>Custom Framework (UAF Extension):</strong> Developed proprietary Capability Assessment Layer in DoDAF/UAF using Python + Neo4j graph DB. Now standard tooling across enterprise engagements.</li>
            <li><strong>Technical Leadership:</strong> Led cross-functional proof-of-concepts for Aerospace/Defense clients. Direct technical advisor to C-suite on digital transformation roadmaps.</li>
          </ul>
        </div>

        {/* Safran */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Lead Design Engineer & Architect <span className="font-normal text-gray-600 ml-1">@ SAFRAN (Zodiac Aerospace)</span></h3>
            </div>
            <span className="text-sm text-gray-500 italic">Dec 2012 – July 2018</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-gray-800 text-sm">
            <li><strong>Parametric CAD Automation (KBE):</strong> Built CATIA V5 automation framework using VBA/CATScript—algorithmically generated structural components at scale. Reduced design cycle from weeks to days per aircraft program.</li>
            <li><strong>FEA Workflow & Certification:</strong> Established in-house Abaqus/Nastran pipeline for FAA Part 25 compliance. Automated mesh generation + post-processing using Python scripts.</li>
            <li><strong>Model-Based Definition (MBD):</strong> Led company-wide transition to 3D PMI + GD&T in CATIA V5, eliminating 2D drawings for most assemblies. Trained engineering team, now org-wide standard.</li>
          </ul>
        </div>

        {/* Duncan */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Design Engineer <span className="font-normal text-gray-600 ml-1">@ Duncan Aviation</span></h3>
            </div>
            <span className="text-sm text-gray-500 italic">Aug 2012 – Nov 2012</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-gray-800 text-sm">
            <li><strong>VIP Cabin Integration:</strong> Designed custom Falcon 7X interior mods (BMW Designworks collab). Managed ECOs in SmarTeam PLM—delivered on-time for high-profile client delivery.</li>
          </ul>
        </div>
      </section>

      {/* EDUCATION */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="text-2xl font-bold text-blue-700 border-b border-gray-200 pb-1 mb-4">Education</h2>
        
        <div className="mb-4">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Ph.D. Aerospace Engineering (Coursework)</h3>
            </div>
            <span className="text-sm text-gray-500">2021 – Present</span>
          </div>
          <p className="text-gray-600 italic text-sm">Wichita State University</p>
          <ul className="list-disc pl-4 mt-1 text-sm text-gray-800 space-y-1">
            <li><strong>Research Focus:</strong> Optimal Control, Neural Network-based Flight Control, Reinforcement Learning for autonomous systems. <a href="#" onClick={(e) => openPdf(e, 'AIDA - Proposal _ v1.pdf', 'AIDA')} className="text-blue-600 hover:underline">AIDA Proposal</a> | <a href="#" onClick={(e) => openPdf(e, 'Flight Control Design.pdf', 'Flight Control')} className="text-blue-600 hover:underline">Control Design</a></li>
          </ul>
        </div>

        <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">M.S. Aerospace Engineering <span className="font-normal text-gray-600 ml-2 text-sm">— WSU (Flight Dynamics & Control)</span></h3>
            </div>
            <span className="text-sm text-gray-500">May 2024</span>
          </div>
          <ul className="list-disc pl-4 mt-1 text-sm text-gray-800 space-y-1">
             <li><strong>Thesis:</strong> <a href="#" onClick={(e) => openPdf(e, 'AcousticsAnalysisTFE731.pdf', 'Acoustic Analysis')} className="text-blue-600 hover:underline">Turbofan Acoustic Modeling & Active Vibration Suppression</a> (Python/MATLAB)</li>
          </ul>
        </div>

        <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">M.Eng. Aerospace Engineering <span className="font-normal text-gray-600 ml-2 text-sm">— UTA</span></h3>
            </div>
            <span className="text-sm text-gray-500">2016 – 2019</span>
          </div>
        </div>

         <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">B.S. Aerospace Engineering <span className="font-normal text-gray-600 ml-2 text-sm">— WSU</span></h3>
            </div>
            <span className="text-sm text-gray-500">May 2012</span>
          </div>
          <ul className="list-disc pl-4 mt-1 text-sm text-gray-800 space-y-1">
             <li><strong>Capstone:</strong> <a href="#" onClick={(e) => openPdf(e, 'Final Report-PropShox.pdf', 'Udaan Aircraft')} className="text-blue-600 hover:underline">Udaan Dive Bomber</a> — Full aircraft design, wind tunnel testing, propulsion integration.</li>
          </ul>
        </div>
      </section>

      {/* INTERACTIVE PORTFOLIO */}
      <section className="mb-12 print:hidden">
        <h2 className="text-3xl font-bold text-blue-700 border-b border-gray-200 pb-2 mb-6">Interactive Engineering Portfolio</h2>
        <p className="text-gray-600 text-base mb-8">
          Explore interactive demonstrations of my engineering capabilities, from requirements management to physics-based simulations.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Requirements */}
          <div 
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition cursor-pointer flex flex-col" 
            onClick={() => setFullScreen('reqif')}
          >
             <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
                <FileText size={24} />
             </div>
             <h3 className="font-bold text-xl text-gray-900 mb-2">Requirements (ReqIF)</h3>
             <p className="text-base text-gray-600 mb-4 flex-1">
               View the Udaan aircraft requirements in native ReqIF format. Demonstrates traceability and model-based systems engineering (MBSE) data structures.
             </p>
             <div className="flex items-center text-blue-600 text-base font-medium group-hover:translate-x-1 transition-transform">
                View Requirements <ArrowRight size={16} className="ml-1" />
             </div>
          </div>

          {/* Card 2: Digital Twin */}
          <div 
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-purple-300 transition cursor-pointer flex flex-col" 
            onClick={() => setFullScreen('twin')}
          >
             <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:bg-purple-600 group-hover:text-white transition">
                <Box size={24} />
             </div>
             <h3 className="font-bold text-xl text-gray-900 mb-2">Digital Twin (STEP)</h3>
             <p className="text-base text-gray-600 mb-4 flex-1">
               Interactive 3D visualization of the Udaan aircraft. Showcases digital continuity from engineering CAD data (STEP) to web-based experiences.
             </p>
             <div className="flex items-center text-purple-600 text-base font-medium group-hover:translate-x-1 transition-transform">
                Launch Viewer <ArrowRight size={16} className="ml-1" />
             </div>
          </div>

          {/* Card 3: Turbofan Analysis */}
          <div 
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-orange-300 transition cursor-pointer flex flex-col" 
            onClick={() => setFullScreen('acoustic')}
          >
             <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 mb-4 group-hover:bg-orange-600 group-hover:text-white transition">
                <Activity size={24} />
             </div>
             <h3 className="font-bold text-xl text-gray-900 mb-2">Turbofan Analysis</h3>
             <p className="text-base text-gray-600 mb-4 flex-1">
               Real-time physics simulation of turbofan engine performance and acoustics. Includes standard atmosphere modeling and Lighthill noise estimation.
             </p>
             <div className="flex items-center text-orange-600 text-base font-medium group-hover:translate-x-1 transition-transform">
                Run Simulation <ArrowRight size={16} className="ml-1" />
             </div>
          </div>

          {/* Card 4: AIDA Research */}
          <a 
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-teal-300 transition cursor-pointer flex flex-col" 
            href="https://github.com/kushkoirala/AIDA"
            target="_blank"
            rel="noreferrer"
          >
             <div className="h-12 w-12 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 mb-4 group-hover:bg-teal-600 group-hover:text-white transition">
                <Brain size={24} />
             </div>
             <h3 className="font-bold text-xl text-gray-900 mb-2">AIDA Flight Control</h3>
             <p className="text-base text-gray-600 mb-4 flex-1">
               Reinforcement-learning based adaptive flight control research. Explore the source, proposal, and control design artifacts.
             </p>
             <div className="flex items-center text-teal-600 text-base font-medium group-hover:translate-x-1 transition-transform">
                View Repository <ArrowRight size={16} className="ml-1" />
             </div>
          </a>
        </div>
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
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="text-base font-semibold text-gray-900">
              {fullScreen === 'reqif' ? 'Requirements (Full Screen)' : 'Digital Twin (Full Screen)'}
            </div>
            <button
              type="button"
              onClick={() => setFullScreen(null)}
              className="flex items-center gap-2 text-base text-gray-600 hover:text-gray-900"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-gray-100 relative">
            {fullScreen === 'reqif' ? <ReqIFViewer reqifFile="udaan.reqif" /> : <DigitalTwin />}
          </div>
        </div>
      )}
  </div>
  );
}

export default App;
