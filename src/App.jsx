import React, { useState } from 'react';
import { Linkedin, Mail, X } from 'lucide-react';
import UniversalModal from './components/UniversalModal';
import DigitalTwin from './components/DigitalTwin';

function App() {
  const [modalData, setModalData] = useState({ isOpen: false, url: '', title: '' });

  // If you host PDFs on GitHub, use the Raw Link. 
  // If you put them in the 'public' folder, use the relative path (e.g., window.location.origin + '/report.pdf')
  const openPdf = (e, filename, title) => {
    e.preventDefault();
    // Assuming files are in the public folder
    const fullUrl = `${window.location.origin}/${filename}`; 
    setModalData({ isOpen: true, url: fullUrl, title });
  };

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans text-gray-900">
      
      {/* HEADER */}
      <header className="mb-10 border-b border-gray-200 pb-6">
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
                <Linkedin size={18} />
              </a>
              <a 
                href="https://x.com/kushkoirala" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition"
                title="X"
              >
                <X size={18} />
              </a>
              <a 
                href="mailto:kush.koirala@gmail.com"
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                title="Email"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>
          <div className="text-left md:text-right mt-4 md:mt-0 text-gray-500">
             <span>📍 Wichita, KS</span>
          </div>
        </div>
        <p className="text-lg leading-relaxed text-gray-700 max-w-2xl">
          <strong>Digital Architect | Aerospace Engineering Specialist.</strong> Proven expertise in architecting digital twin solutions, integrating advanced aerospace engineering principles with cutting-edge technologies to drive innovation and efficiency.
        </p>
        <button onClick={() => window.print()} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition print:hidden">
          Print Resume
        </button>
      </header>

      {/* 3D SHOWCASE */}
      <section className="mb-12 print:hidden">
        <h2 className="text-2xl font-bold text-blue-700 border-b border-gray-200 pb-2 mb-6">Digital Twin Showcase</h2>
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="font-bold text-lg">Udaan - Concept Aircraft (CATIA V5)</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Interactive web-based visualization demonstrating Digital Continuity from Engineering Data (STEP) to Web Experience using WebAssembly.
          </p>
          <DigitalTwin />
        </div>
      </section>

      {/* EXPERIENCE */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-blue-700 border-b border-gray-200 pb-2 mb-6">Professional Experience</h2>

        {/* Dassault */}
        <div className="mb-8 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="font-bold text-lg">Global Architect <span className="font-normal text-gray-600 ml-1">@ Dassault Systèmes (NIAR-WSU)</span></h3>
            <span className="text-sm text-gray-500 italic">July 2018 – Present</span>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-gray-800">
            <li><strong>Enterprise Solution Architecture:</strong> Lead technical engagement for cross-industry clients (A&D, Transportation), architecting end-to-end digital twins (CATIA/DELMIA/SIMULIA) and defining "To-Be" solution dossiers.</li>
            <li><strong>Strategic Workflow Automation:</strong> Led a multi-year OEM engagement to revolutionize Materials & Processes workflows. Engineered an automated provisioning system that dramatically reduced cycle time.</li>
            <li><strong>Proprietary Framework Development:</strong> Developed a custom "Capability Assessment Layer" within UAF, institutionalized across major engagements to map client value streams directly to technical architecture.</li>
            <li><strong>Infrastructure & Scalability:</strong> Orchestrated scalable Linux-based 3DExperience and Teamwork Cloud architectures to prove real-time Systems Traceability and enable cross-industry collaboration.</li>
          </ul>
        </div>

        {/* Safran */}
        <div className="mb-8 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="font-bold text-lg">Lead Design Engineer & Architect <span className="font-normal text-gray-600 ml-1">@ SAFRAN (Zodiac Aerospace)</span></h3>
            <span className="text-sm text-gray-500 italic">Dec 2012 – July 2018</span>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-gray-800">
            <li><strong>Program Leadership:</strong> Directed migration to CATIA V5, establishing Model-Based Definition (MBD) baseline for native CATIA product development.</li>
            <li><strong>Knowledge-Based Engineering (KBE):</strong> Engineered parametric automation systems for structural design. Transformed manual processes into algorithmic workflows for intelligent geometry generation.</li>
            <li><strong>Validation & Certification:</strong> Modernized verification by establishing in-house simulation infrastructure. Managed certification lifecycle via finite element analysis and correlation.</li>
          </ul>
        </div>

        {/* Duncan */}
        <div className="mb-8 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="font-bold text-lg">Design Engineer (VIP Interiors) <span className="font-normal text-gray-600 ml-1">@ Duncan Aviation</span></h3>
            <span className="text-sm text-gray-500 italic">Aug 2012 – Nov 2012</span>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-gray-800">
            <li><strong>VIP Integration:</strong> Executed custom interior modifications for Dassault Falcon 7X (BMW Designworks package), leveraging SmarTeam to manage complex Engineering Change Orders (ECO) during final assembly.</li>
          </ul>
        </div>
      </section>

      {/* EDUCATION */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-blue-700 border-b border-gray-200 pb-2 mb-6">Education</h2>
        
        <div className="mb-4">
           <div className="flex justify-between items-baseline">
            <h3 className="font-bold">Ph.D. Candidate Aerospace Engineering (ABD / Coursework Completed)</h3>
            <span className="text-sm text-gray-500">2021 – 2025</span>
          </div>
          <p className="text-gray-600 italic">Wichita State University</p>
          <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
            <li>Focus: Advanced Flight Dynamics & Modern Control Theory (Neural Networks, Optimal Control).</li>
            <li>Key Research: <a href="#" onClick={(e) => openPdf(e, 'AIDA - Proposal _ v1.pdf', 'AIDA: Autonomous Intelligent Decision Architecture')} className="text-blue-600 hover:underline">AIDA: Autonomous Intelligent Decision Architecture</a></li>
            <li>Flight Control Research: <a href="#" onClick={(e) => openPdf(e, 'Flight Control Design.pdf', 'Flight Control System Design')} className="text-blue-600 hover:underline">Advanced Flight Control Systems</a></li>
            <li>Related Projects: <a href="#" onClick={(e) => openPdf(e, 'Mars Lander.pdf', 'Mars Exploration Initiative')} className="text-blue-600 hover:underline">Mars Exploration Project</a></li>
          </ul>
        </div>

        <div className="mb-4">
           <div className="flex justify-between items-baseline">
            <h3 className="font-bold">M.S. Aerospace Engineering</h3>
            <span className="text-sm text-gray-500">May 2024</span>
          </div>
          <p className="text-gray-600 italic">Wichita State University</p>
          <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
             <li>Specialization: Flight Dynamics and Control.</li>
             <li>Project Work: <a href="#" onClick={(e) => openPdf(e, 'AcousticsAnalysisTFE731.pdf', 'Acoustic Analysis')} className="text-blue-600 hover:underline">Acoustic Analysis and Vibration Control</a></li>
          </ul>
        </div>

         <div className="mb-4">
           <div className="flex justify-between items-baseline">
            <h3 className="font-bold">B.S. Aerospace Engineering</h3>
            <span className="text-sm text-gray-500">May 2012</span>
          </div>
          <p className="text-gray-600 italic">Wichita State University</p>
          <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
             <li>Capstone Project: <a href="#" onClick={(e) => openPdf(e, 'Final Report-PropShox.pdf', 'Udaan - The Dive Bomber')} className="text-blue-600 hover:underline">Udaan - The Dive Bomber</a></li>
          </ul>
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
  );
}

export default App;