import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Gauge, Activity, Wind, Plane, RotateCw, ArrowUpFromLine, RotateCcw, Maximize, Minimize, Pause, Play } from 'lucide-react';

const StepViewer = ({ url }) => {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('Initializing CAD Kernel...');
  const [error, setError] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [meshList, setMeshList] = useState([]);
  const [showTree, setShowTree] = useState(false);
  
  // Flight Simulation State
  const [flightMode, setFlightMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const flightModeRef = useRef(false); // Ref for access inside animation loop
  const isPausedRef = useRef(false);
  const aircraftRef = useRef(null);
  
  // Camera & Controls Refs
  const cameraRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const initialCameraPosRef = useRef(null);
  const [resetKey, setResetKey] = useState(0); // To force re-render of inputs

  // Control inputs (Refs for performance in animation loop)
  const controlsRef = useRef({ pitch: 0, roll: 0, yaw: 0, throttle: 0.6 });

  // Sync state with ref
  useEffect(() => {
    flightModeRef.current = flightMode;
    isPausedRef.current = isPaused;
    if (flightMode) {
      // Reset camera or controls if needed when entering flight mode
    } else {
      // Reset aircraft position when exiting flight mode
      if (aircraftRef.current) {
        aircraftRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [flightMode, isPaused]);

  const handleControlChange = (axis, value) => {
    controlsRef.current[axis] = parseFloat(value);
  };

  const handleResetView = () => {
    // Reset Camera
    if (cameraRef.current && initialCameraPosRef.current) {
      cameraRef.current.position.copy(initialCameraPosRef.current);
      cameraRef.current.lookAt(0, 0, 0);
    }
    
    // Reset Orbit Controls
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.set(0, 0, 0);
      orbitControlsRef.current.update();
    }

    // Reset Flight Controls
    controlsRef.current = { pitch: 0, roll: 0, yaw: 0, throttle: 0.6 };
    
    // Reset Aircraft Rotation
    if (aircraftRef.current) {
      aircraftRef.current.rotation.set(0, 0, 0);
    }

    // Force re-render of inputs
    setResetKey(prev => prev + 1);
  };

  const setSteadyState = (state) => {
      switch(state) {
          case 'cruise':
              controlsRef.current = { pitch: 0, roll: 0, yaw: 0, throttle: 0.6 };
              break;
          case 'climb':
              controlsRef.current = { pitch: 10 * (Math.PI/180), roll: 0, yaw: 0, throttle: 0.8 };
              break;
          case 'descent':
              controlsRef.current = { pitch: -5 * (Math.PI/180), roll: 0, yaw: 0, throttle: 0.4 };
              break;
          case 'turnLeft':
              controlsRef.current = { pitch: 0, roll: -20 * (Math.PI/180), yaw: 0, throttle: 0.6 };
              break;
          case 'turnRight':
              controlsRef.current = { pitch: 0, roll: 20 * (Math.PI/180), yaw: 0, throttle: 0.6 };
              break;
      }
      setResetKey(prev => prev + 1);
  };

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!url || !containerEl) return;

    let scene, camera, renderer, controls, requestID, gridHelper;

    const initViewer = async () => {
      try {
        // 1. Setup Three.js Scene
        if (!containerEl) {
          throw new Error('Container ref not available');
        }

        const width = containerEl.clientWidth || 800;
        const height = containerEl.clientHeight || 600;

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
        cameraRef.current = camera;

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        containerEl.appendChild(renderer.domElement);

        // Handle Resize
        const handleResize = () => {
            if (!containerEl) return;
            const newWidth = containerEl.clientWidth;
            const newHeight = containerEl.clientHeight;
            
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };
        
        // Attach resize observer to container
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerEl);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        orbitControlsRef.current = controls;

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
        const defaultMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xc19a6b, // wood tone
          metalness: 0.05, 
          roughness: 0.7 
        });

        const group = new THREE.Group();

        // Process each mesh from the result
        const meshNames = [];
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

            // Apply color overrides: wood default; green for balls/spheres; dark gray for rods/struts
            let meshMaterial = defaultMaterial;
            const nameLower = (meshData.name || '').toLowerCase();
            if (nameLower.includes('ball') || nameLower.includes('sphere')) {
              meshMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57, metalness: 0.1, roughness: 0.4 });
            } else if (nameLower.includes('rod') || nameLower.includes('strut') || nameLower.includes('tube')) {
              meshMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.2, roughness: 0.5 });
            } else if (meshData.color && Array.isArray(meshData.color) && meshData.color.length >= 3) {
              meshMaterial = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color(meshData.color[0] / 255, meshData.color[1] / 255, meshData.color[2] / 255),
                metalness: 0.1, 
                roughness: 0.6 
              });
            }

            const mesh = new THREE.Mesh(geometry, meshMaterial);
            const mName = meshData.name || `mesh-${meshNames.length}`;
            mesh.name = mName;
            meshNames.push(mName);
            group.add(mesh);
          } catch (meshErr) {
            console.error('Error processing mesh:', meshErr, meshData);
          }
        }

        if (group.children.length === 0) {
          throw new Error('No valid meshes could be created from STEP file');
        }

        setMeshList(meshNames);

        // Center the model
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.position.sub(center); // Center at 0,0,0
        
        // Create a container for the aircraft to handle physics/flight dynamics
        const aircraftGroup = new THREE.Group();
        
        // Create an inner container for model alignment (fixing CAD orientation)
        const modelAlignmentGroup = new THREE.Group();
        modelAlignmentGroup.add(group);

        // Explicit alignment: assume CAD +X = forward, +Y = right, +Z = up
        // Map to sim axes: forward -> -Z, right -> +X, up -> +Y
        const xAxis = new THREE.Vector3(0, 0, -1); // model +X to world -Z
        const yAxis = new THREE.Vector3(1, 0, 0);  // model +Y to world +X
        const zAxis = new THREE.Vector3(0, 1, 0);  // model +Z to world +Y
        const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
        const quat = new THREE.Quaternion().setFromRotationMatrix(basis);
        modelAlignmentGroup.setRotationFromQuaternion(quat);

        // Rotate 180° about forward axis to correct inversion
        const forwardAxis = new THREE.Vector3(0, 0, -1);
        modelAlignmentGroup.rotateOnAxis(forwardAxis, Math.PI);

        aircraftGroup.add(modelAlignmentGroup);
        scene.add(aircraftGroup);
        
        // Store reference for flight simulation
        aircraftRef.current = aircraftGroup;
        const initialY = aircraftGroup.position.y;

        // Adjust Camera to fit object
        const size = box.getSize(new THREE.Vector3()).length();
        
        // Initialize Grid Helper for Flight Reference
        const gridSize = size * 50;
        const gridDivisions = 100;
        gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x333333, 0xdddddd);
        gridHelper.position.y = -size * 0.5; // Place below the aircraft
        gridHelper.visible = false; // Hidden by default
        scene.add(gridHelper);

        if (size > 0) {
          camera.position.set(size, size, size);
          camera.lookAt(0, 0, 0);
          initialCameraPosRef.current = camera.position.clone();
        }
        
        setStatus(null); // Clear loading state

        // Animation Loop
        const animate = () => {
          requestID = requestAnimationFrame(animate);
          
          if (flightModeRef.current && aircraftRef.current && !isPausedRef.current) {
            // Show Grid
            if (gridHelper) {
                gridHelper.visible = true;
                // Move grid to simulate forward speed
                // Scale down speed as requested
                const speed = (size * 0.02) * (controlsRef.current.throttle || 0.6);
                gridHelper.position.z += speed;
                const gridSize = size * 50;
                const cellUnit = gridSize / 100;
                if (gridHelper.position.z > cellUnit) {
                    gridHelper.position.z %= cellUnit;
                }
            }

            // Apply flight controls
            // Smooth interpolation could be added here
            const { pitch, roll, yaw } = controlsRef.current;
            
            // Update rotation based on controls
            // Note: Order of rotation matters (Euler angles)
            // Roskam Body Frame to Three.js World Frame Mapping:
            // Pitch (Theta): Rotation about Body Y-axis -> Three.js X-axis
            aircraftRef.current.rotation.x = pitch; 
            
            // Roll (Phi): Rotation about Body X-axis -> Three.js Z-axis (Negative)
            aircraftRef.current.rotation.z = -roll;  
            
            // Yaw (Psi): Rotation about Body Z-axis -> Three.js Y-axis (Negative)
            // Coordinated Turn: Roll induces Yaw rate
            // In a steady turn, Rate of Turn = (g * tan(BankAngle)) / Velocity
            // Note: Yaw is accumulative (rate), Pitch/Roll are state (angle)
            aircraftRef.current.rotation.y -= (yaw * 0.01) + (roll * 0.005); 
            
            // Simulate subtle vibration/movement
            const time = Date.now() * 0.001;
            aircraftRef.current.position.y = initialY + Math.sin(time * 2) * (size * 0.005);
          } else {
             if (gridHelper && !flightModeRef.current) gridHelper.visible = false;
          }

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
      if (renderer && containerEl && renderer.domElement.parentNode === containerEl) {
        containerEl.removeChild(renderer.domElement);
        renderer.dispose();
      }
      // Note: ResizeObserver cleanup is handled by garbage collection when element is removed, 
      // but explicit disconnect is good practice if we had the observer instance here.
    };
  }, [url]);

  return (
    <div 
        className={`relative bg-gray-100 transition-all duration-300 ${
            isFullScreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'w-full h-full'
        }`} 
        style={{ minHeight: isFullScreen ? '100vh' : '384px' }}
    >
      <div ref={containerRef} className="w-full h-full" />
      
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

      {/* Flight Test Controls Overlay */}
      {!status && !error && (
        <>
          {/* Mesh tree toggle */}
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setShowTree(!showTree)}
              className="px-3 py-2 rounded-full font-bold shadow-lg transition-all bg-white text-gray-700 hover:bg-gray-50 border"
            >
              {showTree ? 'Hide Mesh Tree' : 'Show Mesh Tree'}
            </button>
          </div>

          {showTree && meshList.length > 0 && (
            <div className="absolute top-16 left-4 z-20 bg-white/90 backdrop-blur px-3 py-2 rounded text-xs text-gray-700 border border-gray-200 shadow-sm max-h-64 overflow-auto w-60">
              <div className="font-semibold mb-1">Meshes ({meshList.length})</div>
              <ul className="space-y-1">
                {meshList.map((name, idx) => (
                  <li key={idx} className="truncate" title={name}>• {name}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Toggle Switch */}
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            {flightMode && (
                <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold shadow-lg transition-all ${
                    isPaused ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={isPaused ? "Resume Simulation" : "Pause Simulation"}
                >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
                </button>
            )}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="flex items-center gap-2 px-3 py-2 rounded-full font-bold shadow-lg transition-all bg-white text-gray-700 hover:bg-gray-50"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button
              onClick={handleResetView}
              className="flex items-center gap-2 px-3 py-2 rounded-full font-bold shadow-lg transition-all bg-white text-gray-700 hover:bg-gray-50"
              title="Reset View"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => setFlightMode(!flightMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all ${
                flightMode 
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Plane size={18} />
              {flightMode ? 'Flight Test Active' : 'Enable Flight Test'}
            </button>
          </div>

          {/* Flight Controls & Telemetry */}
          {flightMode && (
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col md:flex-row gap-4 items-end justify-between pointer-events-none">
              
              {/* Controls (Left) */}
              <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white w-full md:w-80 pointer-events-auto">
                <h4 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                  <RotateCw size={14} /> Flight Controls
                </h4>
                
                <div className="space-y-4" key={resetKey}>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Pitch</span>
                      <span>{(controlsRef.current.pitch * (180/Math.PI)).toFixed(0)}°</span>
                    </div>
                    <input 
                      type="range" min="-0.5" max="0.5" step="0.01" 
                      defaultValue="0"
                      onChange={(e) => handleControlChange('pitch', e.target.value)}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Roll</span>
                      <span>{(controlsRef.current.roll * (180/Math.PI)).toFixed(0)}°</span>
                    </div>
                    <input 
                      type="range" min="-0.8" max="0.8" step="0.01" 
                      defaultValue="0"
                      onChange={(e) => handleControlChange('roll', e.target.value)}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Yaw</span>
                      <span>Rate</span>
                    </div>
                    <input 
                      type="range" min="-0.1" max="0.1" step="0.001" 
                      defaultValue="0"
                      onChange={(e) => handleControlChange('yaw', e.target.value)}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Steady States</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setSteadyState('cruise')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] transition">Cruise</button>
                    <button onClick={() => setSteadyState('climb')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] transition">Climb</button>
                    <button onClick={() => setSteadyState('descent')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] transition">Descent</button>
                    <button onClick={() => setSteadyState('turnLeft')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] transition">Left Turn</button>
                    <button onClick={() => setSteadyState('turnRight')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] transition">Right Turn</button>
                  </div>
                </div>
              </div>

              {/* Telemetry (Right) */}
              <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white w-full md:w-auto min-w-[200px] pointer-events-auto">
                <h4 className="text-xs font-bold text-green-400 uppercase mb-3 flex items-center gap-2">
                  <Activity size={14} /> Live Telemetry
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase">Airspeed</span>
                    <span className="text-xl font-mono font-bold flex items-baseline gap-1">
                      450 <span className="text-xs font-normal text-gray-500">kts</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase">Altitude</span>
                    <span className="text-xl font-mono font-bold flex items-baseline gap-1">
                      35,000 <span className="text-xs font-normal text-gray-500">ft</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase">AoA</span>
                    <span className="text-xl font-mono font-bold flex items-baseline gap-1">
                      2.4 <span className="text-xs font-normal text-gray-500">deg</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase">G-Load</span>
                    <span className="text-xl font-mono font-bold flex items-baseline gap-1">
                      1.0 <span className="text-xs font-normal text-gray-500">g</span>
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StepViewer;
