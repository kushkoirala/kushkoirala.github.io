import React, { useState } from 'react';
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
            <a href="https://linkedin.com/in/kushal-koirala-250125341" target="_blank" className="text-sm text-blue-600 hover:underline">LinkedIn Profile</a>
          </div>
          <div className="text-left md:text-right mt-2 md:mt-0 text-gray-500">
             <a href="mailto:kush.koirala@gmail.com" className="hover:text-blue-600">kush.koirala@gmail.com</a>
             <span className="mx-2">|</span>
             <span>Wichita, KS</span>
          </div>
        </div>
        <p className="text-lg leading-relaxed text-gray-700 max-w-2xl">
          <strong>Digital Architect | Aerospace Engineering Specialist.</strong> Global Solution Architect with 12+ years optimizing engineering ecosystems for A&D and High-Tech OEMs. Expert in MBSE, PLM Strategy, and Digital Thread realization.
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
            <li><strong>Strategic Workflow Automation:</strong> Directed a team of 6 Senior Architects in a multi-year OEM engagement to revolutionize Materials & Processes workflows. Engineered an automated provisioning system that reduced cycle time by 99%.</li>
            <li><strong>Proprietary Framework Development:</strong> Developed a custom "Capability Assessment Layer" within UAF, now institutionalized across 5+ major engagements to map client value streams directly to technical architecture.</li>
            <li><strong>Infrastructure & Scalability:</strong> Orchestrated scalable Linux-based 3DExperience and Teamwork Cloud (Cassandra) architectures, deploying 50+ virtual instances to prove real-time Systems Traceability where no OOTB methodology existed.</li>
          </ul>
        </div>

        {/* Safran */}
        <div className="mb-8 break-inside-avoid">
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="font-bold text-lg">Lead Design Engineer & Architect <span className="font-normal text-gray-600 ml-1">@ SAFRAN (Zodiac Aerospace)</span></h3>
            <span className="text-sm text-gray-500 italic">Dec 2012 – July 2018</span>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-gray-800">
            <li><strong>Program Leadership (Z300):</strong> Directed the migration from PTC Wildfire to CATIA V5, establishing the MBD (Model-Based Definition) baseline for the company's first native CATIA product (Boeing 777/A350 seats).</li>
            <li><strong>Knowledge-Based Engineering (KBE):</strong> Engineered a parametric automation system for chassis structures. Transformed manual processes into an algorithmic workflow, auto-generating complex 3D geometry and drilling vectors.</li>
            <li><strong>Validation & Certification:</strong> Modernized verification by establishing the department's first HPC cluster for in-house simulation. Managed full certification lifecycle (16g sled/drop testing) via FEA correlation.</li>
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
            <li>Key Research: <a href="#" onClick={(e) => openPdf(e, 'AIDA_Proposal.pdf', 'AIDA Architecture')} className="text-blue-600 hover:underline">AIDA: Autonomous Intelligent Decision Architecture</a></li>
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
          </ul>
        </div>

         <div className="mb-4">
           <div className="flex justify-between items-baseline">
            <h3 className="font-bold">B.S. Aerospace Engineering</h3>
            <span className="text-sm text-gray-500">May 2012</span>
          </div>
          <p className="text-gray-600 italic">Wichita State University</p>
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