import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Gauge, Activity, Wind, Plane, RotateCw, ArrowUpFromLine, RotateCcw, Maximize, Minimize, Pause, Play } from 'lucide-react';
import { createComponentGroups, COMPONENT_DEFINITIONS } from '../utils/componentManager';

const StepViewer = ({ url }) => {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('Initializing CAD Kernel...');
  const [error, setError] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showTree, setShowTree] = useState(false);
  
  // Flight Simulation State
  const [flightMode, setFlightMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const flightModeRef = useRef(false); // Ref for access inside animation loop
  const isPausedRef = useRef(false);
  const aircraftRef = useRef(null);
  const componentsRef = useRef({}); // Reference to individual components for animation
  
  // Component selection state
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [components, setComponents] = useState([]);
  
  // Camera & Controls Refs
  const cameraRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const initialCameraPosRef = useRef(null);
  const [resetKey, setResetKey] = useState(0); // To force re-render of inputs

  // Control inputs (Refs for performance in animation loop)
  const controlsRef = useRef({ pitch: 0, roll: 0, yaw: 0, throttle: 0.6 });
  
  // Quaternion storage for proper rotation accumulation
  const baseQuaternionRef = useRef(new THREE.Quaternion());
  const flightQuaternionRef = useRef(new THREE.Quaternion());
  const accumulatedYawRef = useRef(0);
  const telemetryRef = useRef({ heading: 0, pitch: 0, roll: 0 });

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

  // Handle component selection highlighting
  useEffect(() => {
    // Store original materials before highlighting
    if (!componentsRef.current._originalMaterials) {
      componentsRef.current._originalMaterials = {};
    }
    
    // Clear previous highlights
    Object.values(componentsRef.current).forEach((comp) => {
      if (comp.meshes && Array.isArray(comp.meshes)) {
        comp.meshes.forEach((mesh) => {
          if (componentsRef.current._originalMaterials[mesh.uuid]) {
            mesh.material = componentsRef.current._originalMaterials[mesh.uuid];
          }
        });
      }
    });
    
    // Apply highlight to selected component
    if (selectedComponent && componentsRef.current[selectedComponent]) {
      const component = componentsRef.current[selectedComponent];
      if (component.meshes && Array.isArray(component.meshes)) {
        const highlightMaterial = new THREE.MeshStandardMaterial({
          color: 0xffff00,
          emissive: 0xaaaa00,
          metalness: 0.3,
          roughness: 0.4
        });
        
        component.meshes.forEach(mesh => {
          // Save original material if not already saved
          if (!componentsRef.current._originalMaterials[mesh.uuid]) {
            componentsRef.current._originalMaterials[mesh.uuid] = mesh.material.clone();
          }
          mesh.material = highlightMaterial;
        });
      }
    }
  }, [selectedComponent]);

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
    
    // Reset Aircraft Rotation to base quaternion
    if (aircraftRef.current) {
      aircraftRef.current.quaternion.copy(baseQuaternionRef.current);
      flightQuaternionRef.current.copy(baseQuaternionRef.current);
      accumulatedYawRef.current = 0;
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
        const meshObjects = []; // Track all mesh objects for component organization
        
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
            const mName = meshData.name || `mesh-${meshObjects.length}`;
            mesh.name = mName;
            meshObjects.push(mesh); // Store for component organization
            group.add(mesh);
          } catch (meshErr) {
            console.error('Error processing mesh:', meshErr, meshData);
          }
        }

        if (group.children.length === 0) {
          throw new Error('No valid meshes could be created from STEP file');
        }

        // Organize meshes into components and create component references
        const componentOrganization = createComponentGroups(meshObjects);
        console.log('Component Organization:', componentOrganization);
        
        // Store component references for animation control
        componentsRef.current = componentOrganization.components;
        
        // Update components state for tree view
        const componentsList = Object.entries(componentOrganization.components).map(([key, data]) => ({
          id: key,
          name: data.definition.description || key,
          type: data.definition.type,
          meshCount: data.meshCount,
          icon: key === 'propeller' ? '✈️' : key === 'wing' ? '🪶' : key.includes('control') ? '🎚️' : '📦'
        }));
        setComponents(componentsList);

        // Center the model
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.position.sub(center); // Center at 0,0,0
        
        // Create a container for the aircraft to handle physics/flight dynamics
        const aircraftGroup = new THREE.Group();
        
        // Create an inner container for model alignment (fixing CAD orientation)
        const modelAlignmentGroup = new THREE.Group();
        modelAlignmentGroup.add(group);

        // Roskam Body-Fixed Coordinate System Transformation
        // STEP file native axes: X=height, Y=wing span, Z=fuselage length
        // Target Roskam axes: X=forward (nose), Y=right wing, Z=down
        // The model geometry is already offset/rotated in a specific way relative to the inertial frame
        // We apply these rotations to align it correctly, then preserve this as the BASE orientation
        
        const yAxis = new THREE.Vector3(0, 1, 0);  // Y-axis (wing span)
        const rotationQuat = new THREE.Quaternion();
        rotationQuat.setFromAxisAngle(yAxis, Math.PI / 2); // 90° about Y
        
        // Flip aircraft 180° about X-axis (to correct upside-down orientation from CAD)
        const xAxis = new THREE.Vector3(1, 0, 0);
        const flipQuat = new THREE.Quaternion();
        flipQuat.setFromAxisAngle(xAxis, Math.PI); // 180° flip

        // Apply 90° clockwise rotation about Z (default orientation for viewing)
        const zAxis = new THREE.Vector3(0, 0, 1);
        const defaultOrientQuat = new THREE.Quaternion();
        defaultOrientQuat.setFromAxisAngle(zAxis, -Math.PI / 2); // 90° clockwise

        // Apply 180° rotation about Y-axis (wing axis) - part of geometric alignment
        const yFlipAxis = new THREE.Vector3(0, 1, 0);
        const yFlipQuat = new THREE.Quaternion();
        yFlipQuat.setFromAxisAngle(yFlipAxis, Math.PI); // 180° about Y
        
        // Combine all alignment rotations into base orientation
        const alignmentQuat = new THREE.Quaternion();
        alignmentQuat.multiplyQuaternions(defaultOrientQuat, rotationQuat);
        alignmentQuat.multiplyQuaternions(yFlipQuat, alignmentQuat);
        alignmentQuat.multiplyQuaternions(flipQuat, alignmentQuat);
        
        modelAlignmentGroup.setRotationFromQuaternion(alignmentQuat);

        aircraftGroup.add(modelAlignmentGroup);
        scene.add(aircraftGroup);
        
        // Store reference for flight simulation
        aircraftRef.current = aircraftGroup;
        
        // Store the base orientation (after Roskam alignment)
        baseQuaternionRef.current.copy(aircraftGroup.quaternion);
        flightQuaternionRef.current.copy(aircraftGroup.quaternion);
        accumulatedYawRef.current = 0;
        
        const initialY = aircraftGroup.position.y;

        // Add coordinate system visualization
        // Earth-fixed (inertial) axes at world origin
        const axesHelper = new THREE.AxesHelper(150);
        scene.add(axesHelper);

        // Roskam Body-Fixed coordinate frame (attached to aircraft)
        const bodyAxesHelper = new THREE.AxesHelper(100);
        bodyAxesHelper.position.copy(aircraftGroup.position);
        aircraftGroup.add(bodyAxesHelper);

        // Add coordinate system labels
        // Create text labels for world frame (at corners)
        const labelPositions = [
          { pos: [250, 0, 0], text: 'X (North)', color: '#FF0000' },
          { pos: [0, 250, 0], text: 'Y (East)', color: '#00FF00' },
          { pos: [0, 0, 250], text: 'Z (Down)', color: '#0000FF' }
        ];
        
        labelPositions.forEach(({ pos, text, color }) => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = color;
          ctx.font = 'Bold 48px Arial';
          ctx.fillText(text, 20, 80);
          
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
          const geometry = new THREE.PlaneGeometry(60, 20);
          const label = new THREE.Mesh(geometry, material);
          label.position.set(...pos);
          label.lookAt(0, 0, 0);
          scene.add(label);
        });

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

            // Apply flight controls using body-fixed rotations
            const { pitch, roll, yaw } = controlsRef.current;
            
            // Accumulate yaw (it's a rate, not an angle)
            accumulatedYawRef.current += (yaw * 0.01) + (roll * 0.005);
            
            // Create incremental rotations in body-fixed frame (Roskam axes)
            // X-axis (forward) = pitch control
            // Y-axis (right wing) = roll control  
            // Z-axis (down) = yaw control
            const bodyPitchAxis = new THREE.Vector3(0, 1, 0); // Pitch about Y (right wing axis)
            const bodyRollAxis = new THREE.Vector3(1, 0, 0);  // Roll about X (forward axis)
            const bodyYawAxis = new THREE.Vector3(0, 0, 1);   // Yaw about Z (down axis)
            
            // Create incremental rotation quaternions for this frame
            const pitchQuat = new THREE.Quaternion().setFromAxisAngle(bodyPitchAxis, pitch);
            const rollQuat = new THREE.Quaternion().setFromAxisAngle(bodyRollAxis, roll);
            const yawQuat = new THREE.Quaternion().setFromAxisAngle(bodyYawAxis, accumulatedYawRef.current);
            
            // Combine control rotations: yaw * roll * pitch (order matters for body-fixed rotations)
            const controlQuat = new THREE.Quaternion();
            controlQuat.multiplyQuaternions(yawQuat, rollQuat);
            controlQuat.multiplyQuaternions(controlQuat, pitchQuat);
            
            // Apply: final orientation = base alignment * body-fixed rotations
            flightQuaternionRef.current.multiplyQuaternions(baseQuaternionRef.current, controlQuat);
            
            aircraftRef.current.quaternion.copy(flightQuaternionRef.current);
            
            // Calculate telemetry: extract attitude from final quaternion
            const euler = new THREE.Euler().setFromQuaternion(aircraftRef.current.quaternion, 'YXZ');
            telemetryRef.current.roll = euler.x * (180 / Math.PI);
            telemetryRef.current.pitch = euler.y * (180 / Math.PI);
            telemetryRef.current.heading = ((euler.z * (180 / Math.PI)) % 360 + 360) % 360;
            
            // Rotate propeller based on throttle
            if (componentsRef.current.propeller && componentsRef.current.propeller.meshes) {
              const throttle = controlsRef.current.throttle || 0.6;
              const propellerRPM = 10000 * throttle; // Max 10,000 RPM
              const propellerRadPerFrame = (propellerRPM / 60) * (2 * Math.PI / 60); // Convert RPM to rad/frame (~60fps)
              
              // Rotate each propeller mesh about the Z-axis (boom's long axis - forward direction)
              const propellerAxis = new THREE.Vector3(0, 0, 1);
              componentsRef.current.propeller.meshes.forEach(mesh => {
                mesh.rotateOnWorldAxis(propellerAxis, propellerRadPerFrame);
              });
            }
            
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
              {showTree ? 'Hide Component Tree' : 'Show Component Tree'}
            </button>
          </div>

          {showTree && components.length > 0 && (
            <div className="absolute top-16 left-4 z-20 bg-white/95 backdrop-blur px-4 py-3 rounded-lg text-xs text-gray-800 border border-gray-300 shadow-lg max-h-96 overflow-auto w-72">
              <div className="font-bold mb-3 text-sm text-gray-900">Aircraft Components ({components.length})</div>
              <ul className="space-y-2">
                {components.map((comp) => (
                  <li 
                    key={comp.id}
                    onClick={() => setSelectedComponent(selectedComponent === comp.id ? null : comp.id)}
                    className={`p-2 rounded cursor-pointer transition-all truncate ${
                      selectedComponent === comp.id 
                        ? 'bg-blue-500 text-white font-semibold shadow-md' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title={comp.name}
                  >
                    <span className="mr-2">{comp.icon}</span>
                    <span className="font-medium">{comp.name}</span>
                    <span className="text-[10px] ml-1 opacity-75">({comp.meshCount})</span>
                  </li>
                ))}
              </ul>
              {components.length === 0 && (
                <div className="text-gray-500 text-xs">No components identified</div>
              )}
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

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Throttle</span>
                      <span>{(controlsRef.current.throttle * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      defaultValue="0.6"
                      onChange={(e) => handleControlChange('throttle', e.target.value)}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500"
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
                    <span className="text-[10px] text-gray-400 uppercase">Heading</span>
                    <span className="text-xl font-mono font-bold">
                      {telemetryRef.current.heading.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase">Pitch</span>
                    <span className="text-xl font-mono font-bold">
                      {telemetryRef.current.pitch.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase">Roll</span>
                    <span className="text-xl font-mono font-bold">
                      {telemetryRef.current.roll.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase">Throttle</span>
                    <span className="text-xl font-mono font-bold">
                      {(controlsRef.current.throttle * 100).toFixed(0)}%
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
