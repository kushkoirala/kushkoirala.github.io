import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const StepViewer = ({ url }) => {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('Initializing CAD Kernel...');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    let scene, camera, renderer, controls, requestID;

    const initViewer = async () => {
      try {
        // 1. Setup Three.js Scene
        if (!containerRef.current) {
          throw new Error('Container ref not available');
        }

        const width = containerRef.current.clientWidth || 800;
        const height = containerRef.current.clientHeight || 600;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f2f5);

        // Lighting (Key for CAD visibility)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 10, 10);
        scene.add(dirLight);

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
        camera.position.set(1000, 1000, 1000); // Far out start

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        containerRef.current.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // 2. Initialize OpenCascade (WASM)
        setStatus('Initializing WASM Kernel...');
        
        // Load the library via script tag and wrap it to expose to window
        if (!window.occtimportjs) {
          // First, fetch the library code
          const libraryCode = await fetch('/occt-import-js.js').then(r => r.text());
          
          // Create a CommonJS-like environment and execute the library
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // Wrap the library code to expose it to window
            script.textContent = `
              (function() {
                const module = { exports: {} };
                const exports = module.exports;
                ${libraryCode}
                window.occtimportjs = module.exports;
              })();
            `;
            script.onerror = () => reject(new Error('Failed to execute occt-import-js'));
            document.head.appendChild(script);
            // Give it a moment to execute
            setTimeout(() => {
              if (window.occtimportjs && typeof window.occtimportjs === 'function') {
                resolve();
              } else {
                reject(new Error('occtimportjs not exposed to window or not a function'));
              }
            }, 200);
          });
        }
        
        const occtimportjs = window.occtimportjs;
        
        if (typeof occtimportjs !== 'function') {
          throw new Error('occtimportjs is not a function');
        }
        
        // Initialize the WASM kernel first
        // The locateFile function tells the library where to find the WASM file
        // occtimportjs is a function that returns a Promise
        const occt = await occtimportjs({
          locateFile: (path) => {
            console.log('Locating WASM file - requested:', path);
            console.log('Current location:', window.location.href);
            
            // The library looks for the WASM file - use absolute URL to ensure it's found
            if (path.endsWith('.wasm') || path.includes('occt-import-js') || path.includes('.wasm')) {
              // Use absolute URL from current origin
              const wasmPath = new URL('/occt-import-js.wasm', window.location.origin).href;
              console.log('Returning WASM absolute URL:', wasmPath);
              
              // Test if file is accessible
              fetch(wasmPath, { method: 'HEAD' })
                .then(response => {
                  console.log('WASM file fetch test:', response.status, response.statusText);
                })
                .catch(err => {
                  console.error('WASM file fetch test failed:', err);
                });
              
              return wasmPath;
            }
            
            // For other files, return as-is
            console.log('Returning path as-is:', path);
            return path;
          }
        });

        setStatus('Downloading STEP File...');
        
        // Fetch the raw STEP file
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch STEP file: ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        console.log('STEP file loaded, size:', buffer.byteLength, 'bytes');

        setStatus('Processing Geometry (Tessellating)...');

        // 3. Convert STEP to Mesh
        console.log('Calling ReadStepFile...');
        const result = occt.ReadStepFile(new Uint8Array(buffer), null);
        console.log('ReadStepFile result:', result);
        
        if (!result) {
          throw new Error('ReadStepFile returned null or undefined');
        }

        if (!result.success) {
          throw new Error('STEP file import was not successful. The file may be corrupted or unsupported.');
        }

        if (!result.meshes || !Array.isArray(result.meshes) || result.meshes.length === 0) {
          throw new Error('No meshes found in STEP file result');
        }

        console.log('Found', result.meshes.length, 'meshes to render');

        // 4. Render Meshes
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x0366d6, 
            metalness: 0.3, 
            roughness: 0.4 
        });

        const group = new THREE.Group();

        // Process each mesh from the result
        for (const meshData of result.meshes) {
          try {
            // Check if mesh has required data
            if (!meshData.attributes || !meshData.attributes.position || !meshData.index) {
              console.warn('Skipping mesh - missing required attributes:', meshData.name || 'unnamed');
              continue;
            }

            const geometry = new THREE.BufferGeometry();
            
            // Set position attributes
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.attributes.position.array, 3));
            
            // Set normal attributes if available
            if (meshData.attributes.normal) {
              geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.attributes.normal.array, 3));
            }
            
            // Set index
            geometry.setIndex(new THREE.Uint16BufferAttribute(meshData.index.array, 1));

            // Use mesh color if available
            let meshMaterial = material;
            if (meshData.color && Array.isArray(meshData.color) && meshData.color.length >= 3) {
              meshMaterial = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color(meshData.color[0] / 255, meshData.color[1] / 255, meshData.color[2] / 255),
                metalness: 0.3, 
                roughness: 0.4 
              });
            }

            const mesh = new THREE.Mesh(geometry, meshMaterial);
            if (meshData.name) {
              mesh.name = meshData.name;
            }
            group.add(mesh);
          } catch (meshErr) {
            console.error('Error processing mesh:', meshErr, meshData);
          }
        }

        if (group.children.length === 0) {
          throw new Error('No valid meshes could be created from STEP file');
        }

        // Center the model
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.position.sub(center); // Center at 0,0,0
        scene.add(group);

        // Adjust Camera to fit object
        const size = box.getSize(new THREE.Vector3()).length();
        if (size > 0) {
          camera.position.set(size, size, size);
          camera.lookAt(0, 0, 0);
        }
        
        setStatus(null); // Clear loading state

        // Animation Loop
        const animate = () => {
          requestID = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

      } catch (err) {
        console.error('StepViewer error:', err);
        setError(err.message || 'Unknown error occurred');
        setStatus(null);
      }
    };

    initViewer();

    // Cleanup
    return () => {
      if (requestID) {
        cancelAnimationFrame(requestID);
      }
      if (renderer && containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [url]);

  return (
    <div className="relative w-full h-full bg-gray-100" style={{ minHeight: '384px' }}>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '384px' }} />
      
      {/* Loading Overlay */}
      {status && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-blue-800 font-semibold">{status}</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10 p-4 text-center">
          <p className="text-red-600 font-bold">Error: {error}</p>
        </div>
      )}
    </div>
  );
};

export default StepViewer;
