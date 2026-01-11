import React, { useState, useEffect } from 'react';
import { Linkedin, Mail, X, FileText, Box, Activity, ArrowRight, Brain, Sun, Moon, CheckCircle2, ClipboardCheck, Plane, Cpu } from 'lucide-react';
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
          <strong>Aerospace Engineer | Solutions Architect.</strong> Building digital twins, physics-informed models, and GPU-accelerated flight dynamics.
        </p>
        <button onClick={() => window.print()} className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition print:hidden">
          Print Resume
        </button>
      </header>

      {/* TECHNICAL SKILLS */}
      <section className="mb-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">PyTorch</span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">CUDA / CuPy</span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">Python</span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">C++</span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-medium">6-DOF Dynamics</span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-medium">CFD / FEA</span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-medium">Flight Control</span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-medium">Reinforcement Learning</span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-medium">Digital Twins</span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-medium">MBSE / SysML</span>
        </div>
      </section>

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
            <li><strong>Tesla — Enterprise Architecture:</strong> Architecting unified simulation pipeline across design, manufacturing, and validation. Enabling end-end design and manufacturing leveraging physics-based digital twin workflows at enterprise scale.</li>
            <li><strong>Boeing — Global Architecture :</strong> 3 years embedded with engineering teams building automated Design, Manufacturing and simulation workflows.</li>
            <li><strong>Fasteners definition and deplyment :</strong> Defining Solution Architectures for Automotive and A&D customers for end-end fasteners design.</li>
            <li><strong>Integrations :</strong> Helping customers integrat their 3DExperience paltforms to third party applications ( SAP,Requirements Management(doors) etc.)</li>
            <li><strong>Systems Modeling:</strong> Requirements decomposition, V&V traceability, and architecture definition using SysML/UAF for aerospace certification programs.</li>
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
            <li><strong>AIDA — Neural Flight Control:</strong> Reinforcement learning for 6-DOF aircraft control. PyTorch policy networks trained in GPU-accelerated physics simulation (CUDA/CuPy). <a href="#" onClick={(e) => openPdf(e, 'AIDA - Proposal _ v1.pdf', 'AIDA')} className="text-primary-600 dark:text-primary-400 hover:underline">Proposal</a></li>
            <li><strong>Optimal Control:</strong> Convex optimization for powered descent guidance (Mars lander). Successive convexification with glide-slope and thrust constraints. <a href="#" onClick={(e) => openPdf(e, 'Mars Lander.pdf', 'Starship Mars Landing')} className="text-primary-600 dark:text-primary-400 hover:underline">Paper</a></li>
            <li><strong>Coursework:</strong> Nonlinear dynamics, optimal control theory, estimation & filtering, neural network fundamentals.</li>
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

        <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">High School (CBSE) <span className="font-normal text-slate-600 dark:text-slate-400 ml-2 text-sm">— La Chatelaine Jr. College, Chennai, India</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">2003</span>
          </div>
          <ul className="list-disc pl-4 mt-1 text-sm text-slate-800 dark:text-slate-300 space-y-1">
             <li><strong>Gold Medal</strong> for Academic Proficiency</li>
          </ul>
        </div>
      </section>

      {/* INTERACTIVE PORTFOLIO */}
      <section className="mb-12 print:hidden">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-3">Interactive Engineering Portfolio</h2>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl">
            Live demonstrations of aerospace engineering capabilities — from FAA certification requirements to physics-based simulations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Requirements - Featured */}
          <div
            className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-6 border border-blue-200 dark:border-slate-700 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 cursor-pointer md:col-span-2"
            onClick={() => setFullScreen('reqif')}
          >
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <ClipboardCheck size={32} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">14 CFR Part 25 Requirements</h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">Airworthiness Standards</span>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-400 mb-4">
                  Full FAA airworthiness standards with derived requirements across 8 subparts. Powerplant section (Subpart E) fully decomposed with official CFR regulatory text. Features V&V tracking with verification methods, compliance status, and traceability.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    <CheckCircle2 size={12} className="text-green-500" /> V&V Tracking
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    <FileText size={12} className="text-blue-500" /> ReqIF Standard
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    <Plane size={12} className="text-indigo-500" /> Subparts A-H
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Stack: ReqIF/XML, React, Vite, Tailwind</p>
                  <div className="flex items-center text-blue-600 dark:text-blue-400 text-base font-medium group-hover:translate-x-2 transition-transform duration-300">
                    Explore Requirements <ArrowRight size={18} className="ml-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Digital Twin */}
          <div
            className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 cursor-pointer flex flex-col"
            onClick={() => setFullScreen('twin')}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="h-14 w-14 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                <Box size={28} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">Digital Twin</h3>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">6-DOF Flight Simulation</span>
              </div>
            </div>
            <p className="text-base text-slate-600 dark:text-slate-400 mb-4 flex-1">
              Real-time 3D visualization with CFD pressure coefficients, quaternion-based flight dynamics, and STEP file import via WebAssembly.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Three.js, OpenCASCADE, WebAssembly</p>
              <div className="flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Launch <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* Card 3: Turbofan Analysis */}
          <div
            className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-300 cursor-pointer flex flex-col"
            onClick={() => setFullScreen('acoustic')}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="h-14 w-14 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
                <Cpu size={28} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">Turbofan Analysis</h3>
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Cycle + Acoustics</span>
              </div>
            </div>
            <p className="text-base text-slate-600 dark:text-slate-400 mb-4 flex-1">
              Engine cycle analysis with real-time parameter updates. Includes takeoff noise prediction based on Lighthill acoustic analogy from thesis research.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">JS Cycle Solver, Lighthill Model</p>
              <div className="flex items-center text-orange-600 dark:text-orange-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Simulate <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* Card 4: AIDA Research */}
          <a
            className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-300 cursor-pointer flex flex-col md:col-span-2"
            href="https://github.com/kushkoirala/AIDA"
            target="_blank"
            rel="noreferrer"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-shrink-0">
                <div className="h-14 w-14 bg-teal-100 dark:bg-teal-900/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
                  <Brain size={28} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">AIDA — AI Flight Control</h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full">Research</span>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-400 mb-4">
                  Autonomous fixed-wing aircraft control using reinforcement learning and neural networks. Integrates LLMs for adaptive flight behavior with GPU-accelerated physics simulation.
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Python, PyTorch, Gymnasium, CUDA, CuPy</p>
                  <div className="flex items-center text-teal-600 dark:text-teal-400 text-sm font-medium group-hover:translate-x-2 transition-transform duration-300">
                    View on GitHub <ArrowRight size={16} className="ml-2" />
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* PRINTABLE PORTFOLIO - Page 3 */}
      <section className="hidden print:block print-portfolio">
        <h2 className="text-2xl font-bold text-primary-600 border-b border-slate-200 pb-2 mb-4">Interactive Engineering Portfolio</h2>
        <p className="text-sm text-slate-600 mb-4">Live demonstrations available at <strong>kushkoirala.github.io</strong></p>

        <div className="print-portfolio-grid">
          {/* Requirements */}
          <div className="print-portfolio-card featured">
            <h3>14 CFR Part 25 Requirements <span className="badge">Airworthiness Standards</span></h3>
            <p>Full FAA airworthiness standards with derived requirements across 8 subparts (A-H). Powerplant section (Subpart E) fully decomposed with official CFR regulatory text. Features V&V tracking with verification methods, compliance status, and traceability.</p>
            <p className="tech">Stack: ReqIF/XML, React, Vite, Tailwind</p>
          </div>

          {/* Digital Twin */}
          <div className="print-portfolio-card">
            <h3>Digital Twin <span className="badge">6-DOF Simulation</span></h3>
            <p>Real-time 3D visualization with CFD pressure coefficients, quaternion-based flight dynamics, and STEP file import via WebAssembly.</p>
            <p className="tech">Three.js, OpenCASCADE, WebAssembly</p>
          </div>

          {/* Turbofan */}
          <div className="print-portfolio-card">
            <h3>Turbofan Analysis <span className="badge">Cycle + Acoustics</span></h3>
            <p>Engine cycle analysis with real-time parameter updates. Takeoff noise prediction based on Lighthill acoustic analogy from thesis research.</p>
            <p className="tech">JS Cycle Solver, Lighthill Model</p>
          </div>

          {/* AIDA */}
          <div className="print-portfolio-card featured">
            <h3>AIDA — AI Flight Control <span className="badge">Research</span></h3>
            <p>Autonomous fixed-wing aircraft control using reinforcement learning and neural networks. Integrates LLMs for adaptive flight behavior with GPU-accelerated physics simulation. GitHub: github.com/kushkoirala/AIDA</p>
            <p className="tech">Python, PyTorch, Gymnasium, CUDA, CuPy</p>
          </div>
        </div>

        <div className="print-portfolio-url">
          View interactive demos: <a href="https://kushkoirala.github.io">kushkoirala.github.io</a>
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
            {fullScreen === 'reqif' ? <ReqIFViewer reqifFile="part25-certification.reqif" /> : <DigitalTwin />}
          </div>
        </div>
      )}
  </div>
  );
}

export default App;
