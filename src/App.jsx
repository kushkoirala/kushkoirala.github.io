import { useState, useEffect } from 'react';
import { Linkedin, X, ArrowRight, Brain, Sun, Moon, Play } from 'lucide-react';
import UniversalModal from './components/UniversalModal';

function App() {
  const [modalData, setModalData] = useState({ isOpen: false, url: '', title: '' });
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
          <strong>Aerospace Engineer &amp; Global Solution Architect at Dassault Systèmes.</strong> 15+ years across aerospace, automotive, defense, and advanced manufacturing. Now focused on agentic AI for engineering: engineering agents, digital twins, and simulation-driven workflows, grounded in design, certification, and large-scale enterprise systems.
        </p>
        <button onClick={() => window.print()} className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition print:hidden">
          Print Resume
        </button>
      </header>

      {/* TECHNICAL SKILLS */}
      <section className="mb-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">LLM Agents</span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">RAG / Hybrid Search</span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">Edge / Local LLMs</span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">PyTorch</span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">Python</span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-medium">CUDA / CuPy</span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-medium">CFD / FEA</span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full font-medium">Flight Control</span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-medium">Digital Twins</span>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 border-b border-slate-200 dark:border-slate-700 pb-1 mb-4">Professional Experience</h2>

        {/* Dassault */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Global Solution Architect <span className="font-normal text-slate-600 dark:text-slate-400 ml-1">@ Dassault Systèmes</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 italic">July 2018 – Present</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-800 dark:text-slate-300 text-sm">
            <li><strong>Agentic AI for engineering:</strong> Driving agentic-readiness and the dev/test of engineering agents that plan, execute, and verify engineering and simulation tasks on the 3DEXPERIENCE platform.</li>
            <li><strong>NVIDIA DSX AI Factory (MBSE):</strong> Global Architect for the virtual twin of next-generation AI-factory data centers leveraging MBSE (CatiaMAGIC).</li>
            <li><strong>Boeing (3 yrs, embedded):</strong> Supported digital transformation through engineering-process modernization, automation, and platform adoption.Compliance and Certification.</li>
            <li><strong>Strategic customers:</strong> Solution architecture across simulation, systems modeling, and enterprise integration for Tesla, Rivian, Textron Aviation, and the U.S. Air Force.</li>
          </ul>
        </div>

        {/* Safran */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Engineering Drafter → Lead Engineer → Solution Architect <span className="font-normal text-slate-600 dark:text-slate-400 ml-1">@ SAFRAN (Zodiac Aerospace)</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 italic">Dec 2012 – July 2018</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-800 dark:text-slate-300 text-sm">
            <li><strong>Z300 seats, Lead Engineer:</strong> Started on the Pro/E → CATIA V5 transformation, then led the Zodiac Z300 aircraft seat to engineering release and FAA certification readiness.</li>
            <li><strong>CAD &amp; process automation:</strong> Drove Model-Based Definition (3D PMI + GD&T) and SmarTeam data/process standardization across engineering, advancing to Solution Architect.</li>
          </ul>
        </div>

        {/* Duncan */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Contract Design Engineer <span className="font-normal text-slate-600 dark:text-slate-400 ml-1">@ Duncan Aviation</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 italic">Aug 2012 – Nov 2012</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-800 dark:text-slate-300 text-sm">
            <li><strong>VIP cabin design:</strong> Designed Dassault Falcon Jet VIP interior modifications in CATIA V5, managing ECOs and cabin-integration release in SmarTeam.</li>
          </ul>
        </div>

        {/* Early career: Robtronix + Etezazi */}
        <div className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">Co-Founder &amp; IT / Manufacturing Systems <span className="font-normal text-slate-600 dark:text-slate-400 ml-1">@ Robtronix &amp; Etezazi Industries</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 italic">2008 – 2012</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-800 dark:text-slate-300 text-sm">
            <li>Co-founded <strong>Robtronix</strong> (laptop refurb and IT retail/repair) and ran shop-floor IT at <strong>Etezazi Industries</strong> (networking, JobBOSS ERP, CNC code-loading Wi-Fi, FARO metrology) while completing my B.S.</li>
          </ul>
        </div>
      </section>

      {/* EDUCATION */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 border-b border-slate-200 dark:border-slate-700 pb-1 mb-4">Education</h2>
        
        <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">M.S. Aerospace Engineering <span className="font-normal text-slate-600 dark:text-slate-400 ml-2 text-sm">Wichita State University, Wichita KS</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">May 2024</span>
          </div>
          <ul className="list-disc pl-4 mt-1 text-sm text-slate-800 dark:text-slate-300 space-y-1">
             <li><strong>Project:</strong> <a href="#" onClick={(e) => openPdf(e, 'AcousticsAnalysisTFE731.pdf', 'Acoustic Analysis')} className="text-primary-600 dark:text-primary-400 hover:underline">Jet noise prediction model</a> (Python/MATLAB) for turbofan takeoff acoustics, validated against lab data.</li>
             <li><strong>Graduate coursework:</strong> Flight dynamics &amp; control, incl. nonlinear dynamics and control.</li>
          </ul>
        </div>

         <div className="mb-3">
           <div className="flex justify-between items-baseline mb-1">
            <div>
              <h3 className="font-bold text-lg">B.S. Aerospace Engineering <span className="font-normal text-slate-600 dark:text-slate-400 ml-2 text-sm">Wichita State University, Wichita KS</span></h3>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">May 2012</span>
          </div>
          <ul className="list-disc pl-4 mt-1 text-sm text-slate-800 dark:text-slate-300 space-y-1">
             <li><strong>Capstone:</strong> <a href="#" onClick={(e) => openPdf(e, 'Final Report-PropShox.pdf', 'Udaan Aircraft')} className="text-primary-600 dark:text-primary-400 hover:underline">Udaan</a>: designed, built, and flew the aircraft, with wind-tunnel testing and propulsion integration.</li>
          </ul>
        </div>
      </section>

      {/* INTERACTIVE PORTFOLIO */}
      <section className="mb-12 print:hidden">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-3">Personal Research</h2>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl">
            A live demonstration of AI-guided flight: an LLM-flown Cessna 172 in a physics-based simulator.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {/* AIDA */}
          <div className="group relative bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-6 border border-teal-200 dark:border-slate-700 hover:shadow-xl hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 bg-teal-100 dark:bg-teal-900/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
                  <Brain size={32} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">AIDA: LLM-Guided Flight</h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full">Personal Research</span>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-400 mb-4">
                  In simulation, a Cessna 172 completed the full 31&nbsp;nm SN65→KHUT cross-country under natural-language command. A quantized model (Salesforce xLAM-2-8B) acts as a function-calling copilot, translating pilot intent into heading, altitude, and landing commands over WebSocket. The flight stack runs a CUDA 6-DOF model (RK4, ~577M steps/s), a 17-phase finite-state autopilot with residual-PPO corrections, entropy-modulated Control Barrier Functions for flight-envelope safety, and Bayesian intent inference.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Python, CUDA C++, llama.cpp, PyTorch, Three.js, WebSocket</p>
                <div className="flex flex-wrap items-center gap-5">
                  <a href="https://www.youtube.com/watch?v=NKPKqAlc9Z4" target="_blank" rel="noreferrer" className="flex items-center text-teal-600 dark:text-teal-400 text-base font-medium hover:translate-x-1 transition-transform">
                    <Play size={16} className="mr-2" /> Watch the flight
                  </a>
                  <a href="https://github.com/kushkoirala/AIDA" target="_blank" rel="noreferrer" className="flex items-center text-slate-600 dark:text-slate-300 text-base font-medium hover:translate-x-1 transition-transform">
                    View on GitHub <ArrowRight size={16} className="ml-2" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRINTABLE PORTFOLIO */}
      <section className="hidden print:block print-portfolio">
        <h2 className="text-2xl font-bold text-primary-600 border-b border-slate-200 pb-2 mb-4">Personal Research</h2>

        <div className="print-portfolio-grid">
          {/* AIDA */}
          <div className="print-portfolio-card featured">
            <h3>AIDA: LLM-Guided Flight <span className="badge">Personal Research</span></h3>
            <p>An LLM flew a simulated Cessna 172 through a full cross-country (SN65→KHUT) by natural-language command, over a CUDA 6-DOF model with PPO-augmented control, Control Barrier Functions, and Bayesian intent inference.</p>
            <p className="tech">Python, CUDA C++, llama.cpp, PyTorch, Three.js</p>
          </div>
        </div>

        <div className="print-portfolio-url">
          Flight demo: <a href="https://www.youtube.com/watch?v=NKPKqAlc9Z4">youtube.com/watch?v=NKPKqAlc9Z4</a>
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
  </div>
  );
}

export default App;
