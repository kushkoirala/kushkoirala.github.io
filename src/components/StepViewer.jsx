import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Gauge, Activity, Wind, Plane, RotateCw, ArrowUpFromLine, RotateCcw, Maximize, Minimize, Pause, Play, Droplets, AlertTriangle, Shield, Weight } from 'lucide-react';
import { createComponentGroups, COMPONENT_DEFINITIONS } from '../utils/componentManager';
import AerodynamicCalculator from '../utils/aerodynamics';
import { PressureVisualizer } from '../utils/pressureVisualizer';
import StructuralAnalyzer from '../utils/structuralAnalyzer';
import StructuralVisualizer from '../utils/structuralVisualizer';
import { weightModel } from '../utils/weightModel';

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
  const alignmentQuatRef = useRef(new THREE.Quaternion());
  const baseQuaternionRef = useRef(new THREE.Quaternion());
  const baseInverseQuaternionRef = useRef(new THREE.Quaternion());
  const flightQuaternionRef = useRef(new THREE.Quaternion());
  const accumulatedYawRef = useRef(0);
  const telemetryRef = useRef({ heading: 0, pitch: 0, roll: 0 });
  
  // Aerodynamics
  const aeroRef = useRef(new AerodynamicCalculator());
  const pressureVisualizerRef = useRef(null);
  const pressureUpdateTimeRef = useRef(0);
  
  // Structural Analysis
  const structuralAnalyzerRef = useRef(new StructuralAnalyzer());
  const structuralVisualizerRef = useRef(null);
  const [structuralState, setStructuralState] = useState({});
  const [structuralWarnings, setStructuralWarnings] = useState([]);
  const [showStructural, setShowStructural] = useState(false);
  const [showWeight, setShowWeight] = useState(true); // Show weight by default
  
  const [telemetry, setTelemetry] = useState({
    airspeed: 0,
    CL: 0,
    CD: 0,
    lift: 0,
    drag: 0,
    stallSpeed: 0,
    climbRate: 0,
    gLoad: 0
  });
  
  // Digital Twin State (Extended telemetry)
  const [digitalTwin, setDigitalTwin] = useState({
    power: 0,
    powerRequired: 0,
    excessPower: 0,
    turnRate: 0,
    wingLoading: 0,
    liftToDrag: 0,
    efficiency: 0,
    stallMargin: 0,
    isStalling: false,
    flightPhase: 'idle'
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPressure, setShowPressure] = useState(false);
  const showPressureRef = useRef(false);

  // Handle pressure visualization toggle
  useEffect(() => {
    showPressureRef.current = showPressure;
    if (!showPressure && pressureVisualizerRef.current) {
      // Restore original materials when turning off pressure
      pressureVisualizerRef.current.restoreOriginalMaterials();
    }
  }, [showPressure]);

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
              // Left turn: left wing down = negative roll
              controlsRef.current = { pitch: 0, roll: -20 * (Math.PI/180), yaw: 0, throttle: 0.6 };
              break;
          case 'turnRight':
              // Right turn: right wing down = positive roll
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
        
        // Initialize Visualizers
        pressureVisualizerRef.current = new PressureVisualizer(scene);
        structuralVisualizerRef.current = new StructuralVisualizer(scene);

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
        alignmentQuatRef.current.copy(alignmentQuat);

        aircraftGroup.add(modelAlignmentGroup);
        scene.add(aircraftGroup);
        
        // Store reference for flight simulation
        aircraftRef.current = aircraftGroup;
        
        // Register meshes for structural visualization
        if (structuralVisualizerRef.current) {
          structuralVisualizerRef.current.registerMeshes(aircraftGroup);
        }
        
        // Store the base orientation (after Roskam alignment)
        baseQuaternionRef.current.copy(aircraftGroup.quaternion);
        baseInverseQuaternionRef.current.copy(aircraftGroup.quaternion).invert();
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
          const now = Date.now(); // Declare once per frame
          
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
            // Roskam convention: X=forward (nose), Y=right wing, Z=down
            // Standard aircraft controls:
            // - Pitch: nose up/down = rotate about Y axis (right wing)
            // - Roll: wing up/down = rotate about X axis (forward)
            // - Yaw: nose left/right = rotate about Z axis (down)
            //
            // User feedback: 
            // - Pitch up → yaws left (pitch input currently causes Z axis rotation)
            // - Positive roll → pitches up (roll input currently causes Y axis rotation)
            // Solution: Swap the control inputs - use roll value for pitch axis, pitch value for roll axis
            // Make sure axes are aligned with the CAD orientation before applying controls
            const alignQuat = alignmentQuatRef.current;
            const bodyPitchAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(alignQuat).normalize();   // Y axis for pitch rotation (nose up/down)
            const bodyRollAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(alignQuat).normalize();    // X axis for roll rotation (wing up/down)
            const bodyYawAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(alignQuat).normalize();      // Z axis for yaw rotation (nose left/right)
            
            // FIX control mapping: pitch input should control pitch, roll input should control roll
            // User reports: pitch input causes yaw (Z axis), roll input causes pitch (Y axis)
            // We want: pitch input -> Y axis (pitch), roll input -> X axis (roll)
            // Use correct values: pitch value for pitch axis, roll value for roll axis
            const pitchQuat = new THREE.Quaternion().setFromAxisAngle(bodyPitchAxis, -pitch);  // invert sign so positive pitch raises nose
            const rollQuat = new THREE.Quaternion().setFromAxisAngle(bodyRollAxis, roll);     // roll input -> X axis (roll rotation)
            const yawQuat = new THREE.Quaternion().setFromAxisAngle(bodyYawAxis, accumulatedYawRef.current); // yaw input -> Z axis (yaw rotation)
            
            // Combine control rotations: yaw * roll * pitch (original order to match Euler extraction)
            const controlQuat = new THREE.Quaternion();
            controlQuat.multiplyQuaternions(yawQuat, rollQuat);
            controlQuat.multiplyQuaternions(controlQuat, pitchQuat);
            
            // Apply: final orientation = base alignment * body-fixed rotations
            flightQuaternionRef.current.multiplyQuaternions(baseQuaternionRef.current, controlQuat);
            
            aircraftRef.current.quaternion.copy(flightQuaternionRef.current);
            
            // Calculate telemetry: extract attitude from final quaternion
            // Keep telemetry accurate to actual flight conditions - use the working Euler extraction
            // Euler order 'ZXY': Z first (yaw), X second (roll), Y third (pitch)
            // Remove the fixed alignment so telemetry starts at 0/0/0 with the base pose
            const attitudeQuat = new THREE.Quaternion().multiplyQuaternions(
              baseInverseQuaternionRef.current,
              aircraftRef.current.quaternion
            );
            const euler = new THREE.Euler().setFromQuaternion(attitudeQuat, 'ZXY');
            // Map telemetry to show actual aircraft attitude (what's actually happening):
            // - Pitch telemetry = actual pitch (nose up/down) = Y rotation = euler.y
            // - Roll telemetry = actual roll (wing up/down) = X rotation = euler.x  
            // - Heading telemetry = actual heading (nose left/right) = Z rotation = euler.z
            telemetryRef.current.pitch = euler.y * (180 / Math.PI);    // Y rotation = actual pitch attitude
            telemetryRef.current.roll = euler.x * (180 / Math.PI);       // X rotation = actual roll attitude
            telemetryRef.current.heading = ((euler.z * (180 / Math.PI)) % 360 + 360) % 360; // Z rotation = actual heading
            
            // Calculate aerodynamic telemetry
            const throttle = controlsRef.current.throttle || 0.6;
            const airspeed = throttle * 20; // Approximate: 0-20 m/s based on throttle
            const angleOfAttack = telemetryRef.current.pitch * (Math.PI / 180); // Convert pitch to radians for AOA
            
            if (aeroRef.current && flightModeRef.current) {
              const aeroSummary = aeroRef.current.getSummary(airspeed, angleOfAttack, 1500); // Power: 1500W
              
              // Calculate advanced metrics
              const stallMargin = airspeed > 0 ? ((airspeed - aeroSummary.stallSpeed) / aeroSummary.stallSpeed * 100) : 0;
              const isStalling = stallMargin < 10 && stallMargin > -5; // Stall warning at 10% above stall speed
              const liftToDrag = aeroSummary.CD > 0.001 ? (aeroSummary.CL / aeroSummary.CD) : 0;
              const bankRad = controlsRef.current.roll;
              const turnRate = airspeed > 0 ? Math.tan(bankRad) * 9.81 / airspeed * (180 / Math.PI) : 0;
              
              // Determine flight phase
              let flightPhase = 'idle';
              if (throttle > 0.05) {
                if (Math.abs(controlsRef.current.pitch) > 0.2) {
                  flightPhase = telemetryRef.current.pitch > 0 ? 'climbing' : 'descending';
                } else if (Math.abs(controlsRef.current.roll) > 0.15) {
                  flightPhase = 'turning';
                } else {
                  flightPhase = 'cruising';
                }
              }
              
              setTelemetry({
                airspeed: aeroSummary.airspeed,
                CL: aeroSummary.CL,
                CD: aeroSummary.CD,
                lift: aeroSummary.lift,
                drag: aeroSummary.drag,
                stallSpeed: aeroSummary.stallSpeed,
                climbRate: aeroSummary.climbRate,
                gLoad: aeroSummary.gLoad
              });
              
              setDigitalTwin({
                power: aeroSummary.powerRequired || 0,
                powerRequired: aeroSummary.powerRequired || 0,
                excessPower: Math.max(0, 1500 - (aeroSummary.powerRequired || 0)),
                turnRate: turnRate,
                wingLoading: (aeroRef.current.mass * 9.81) / aeroRef.current.wingArea,
                liftToDrag: liftToDrag,
                efficiency: Math.min(100, (liftToDrag / 15) * 100), // Normalized to L/D of 15
                stallMargin: Math.max(-50, stallMargin),
                isStalling: isStalling,
                flightPhase: flightPhase
              });
              
              // Update structural analysis (throttle to every 200ms)
              if (structuralAnalyzerRef.current && showStructural && (now - pressureUpdateTimeRef.current) > 200) {
                pressureUpdateTimeRef.current = now;
                
                // Calculate g-loading
                const gLoad = Math.sqrt(
                  (aeroSummary.lift / (aeroRef.current.mass * 9.81)) ** 2 +
                  (aeroSummary.drag / (aeroRef.current.mass * 9.81)) ** 2 +
                  1  // Gravity
                );
                
                // Calculate moments (approximate)
                const rollingMoment = aeroSummary.lift * Math.abs(controlsRef.current.roll);
                const pitchingMoment = aeroSummary.lift * controlsRef.current.pitch;
                const yawingMoment = aeroSummary.drag * controlsRef.current.yaw;
                
                const analysis = structuralAnalyzerRef.current.calculateAerodynamicLoads(
                  aeroSummary.lift,
                  aeroSummary.drag,
                  gLoad,
                  rollingMoment,
                  pitchingMoment,
                  yawingMoment
                );
                
                setStructuralState(analysis.structuralState);
                setStructuralWarnings(analysis.warnings);
                
                // Visualize structural stress on meshes (every 100ms)
                if (structuralVisualizerRef.current && showStructural && (now - pressureUpdateTimeRef.current) > 100) {
                  console.log('🎨 Calling visualizeStress with', Object.keys(analysis.structuralState).length, 'components, showStructural:', showStructural);
                  structuralVisualizerRef.current.visualizeStress(analysis.structuralState);
                  structuralVisualizerRef.current.animateCriticalStress(analysis.structuralState, now / 1000);
                }
                
                console.log('🏗️ Structural analysis: Health', (analysis.overallHealth * 100).toFixed(1) + '%');
              }
              
              // Update pressure visualization (throttle to every 100ms)
              if (pressureVisualizerRef.current && showPressureRef.current && (now - pressureUpdateTimeRef.current) > 100) {
                pressureUpdateTimeRef.current = now;
                const meshes = [];
                // Collect all meshes from the aircraft model
                aircraftRef.current.traverse((child) => {
                  if (child.isMesh) {
                    meshes.push(child);
                  }
                });
                
                if (meshes.length > 0) {
                  console.log('🌊 Updating pressure on', meshes.length, 'meshes. CL:', aeroSummary.CL.toFixed(2), 'CD:', aeroSummary.CD.toFixed(2), 'Airspeed:', airspeed.toFixed(1));
                  pressureVisualizerRef.current.visualizePressure(
                    meshes,
                    aeroSummary.CL,
                    aeroSummary.CD,
                    airspeed,
                    { density: 1.225, wingArea: aeroRef.current.wingArea }
                  );
                } else {
                  console.warn('⚠️ No meshes found in aircraft');
                }
              }
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
  }, [url, showStructural, showWeight]);

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
                
                {/* Pressure Visualization Toggle */}
                <button
                  onClick={() => setShowPressure(!showPressure)}
                  className={`w-full mb-2 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                    showPressure
                      ? 'bg-cyan-600 text-white ring-2 ring-cyan-300'
                      : 'bg-cyan-900/50 text-cyan-300 hover:bg-cyan-900/70'
                  }`}
                >
                  <Droplets size={14} />
                  {showPressure ? 'Pressure ON' : 'Pressure OFF'}
                </button>
                
                {/* Structural Analysis Toggle */}
                <button
                  onClick={() => setShowStructural(!showStructural)}
                  className={`w-full mb-2 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                    showStructural
                      ? 'bg-orange-600 text-white ring-2 ring-orange-300'
                      : 'bg-orange-900/50 text-orange-300 hover:bg-orange-900/70'
                  }`}
                >
                  <Shield size={14} />
                  {showStructural ? 'Structural ON' : 'Structural OFF'}
                </button>

                {/* Weight Information Toggle */}
                <button
                  onClick={() => setShowWeight(!showWeight)}
                  className={`w-full mb-4 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                    showWeight
                      ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                      : 'bg-purple-900/50 text-purple-300 hover:bg-purple-900/70'
                  }`}
                >
                  <Weight size={14} />
                  {showWeight ? 'Weight ON' : 'Weight OFF'}
                </button>
                
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
              <div className={`backdrop-blur-md p-4 rounded-xl border text-white w-full md:w-auto max-w-sm pointer-events-auto max-h-96 overflow-y-auto transition-all ${
                digitalTwin.isStalling 
                  ? 'bg-red-900/80 border-red-400 shadow-lg shadow-red-500/50' 
                  : 'bg-black/80 border-white/20'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-green-400 uppercase flex items-center gap-2">
                    <Activity size={14} /> Live Telemetry
                  </h4>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition"
                  >
                    {showAdvanced ? 'Basic' : 'Advanced'}
                  </button>
                </div>
                
                {/* Stall Warning Banner */}
                {digitalTwin.isStalling && (
                  <div className="mb-3 p-2 bg-red-600 rounded animate-pulse text-center font-bold text-sm">
                    ⚠️ STALL WARNING ⚠️
                  </div>
                )}
                
                {/* Attitude */}
                <div className="mb-4 pb-4 border-b border-white/10">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Attitude</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Heading</span>
                      <span className="text-lg font-mono font-bold">
                        {telemetryRef.current.heading.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Pitch</span>
                      <span className="text-lg font-mono font-bold">
                        {telemetryRef.current.pitch.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Roll</span>
                      <span className="text-lg font-mono font-bold">
                        {telemetryRef.current.roll.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Throttle</span>
                      <span className="text-lg font-mono font-bold">
                        {(controlsRef.current.throttle * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aerodynamics */}
                <div className="mb-4 pb-4 border-b border-white/10">
                  <h5 className="text-[10px] font-bold text-blue-400 uppercase mb-2">Aerodynamics</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Airspeed</span>
                      <span className="text-lg font-mono font-bold text-blue-300">
                        {telemetry.airspeed.toFixed(1)} m/s
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Stall Speed</span>
                      <span className={`text-lg font-mono font-bold ${telemetry.airspeed < telemetry.stallSpeed * 1.1 ? 'text-red-400 animate-pulse' : 'text-green-300'}`}>
                        {telemetry.stallSpeed.toFixed(1)} m/s
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">CL</span>
                      <span className="text-lg font-mono font-bold text-cyan-300">
                        {telemetry.CL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">CD</span>
                      <span className="text-lg font-mono font-bold text-cyan-300">
                        {telemetry.CD.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Lift</span>
                      <span className="text-lg font-mono font-bold text-orange-300">
                        {telemetry.lift.toFixed(2)} N
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Drag</span>
                      <span className="text-lg font-mono font-bold text-orange-300">
                        {telemetry.drag.toFixed(2)} N
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">Climb Rate</span>
                      <span className="text-lg font-mono font-bold text-purple-300">
                        {telemetry.climbRate.toFixed(0)} m/min
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase">G Load</span>
                      <span className="text-lg font-mono font-bold text-purple-300">
                        {telemetry.gLoad.toFixed(2)} g
                      </span>
                    </div>
                  </div>
                </div>

                {/* Advanced Telemetry */}
                {showAdvanced && (
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <h5 className="text-[10px] font-bold text-yellow-400 uppercase">Digital Twin Analysis</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">Power Used</span>
                        <span className="text-sm font-mono font-bold text-yellow-300">
                          {digitalTwin.power.toFixed(0)} W
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">Excess Power</span>
                        <span className="text-sm font-mono font-bold text-lime-300">
                          {digitalTwin.excessPower.toFixed(0)} W
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">L/D Ratio</span>
                        <span className="text-sm font-mono font-bold text-teal-300">
                          {digitalTwin.liftToDrag.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">Turn Rate</span>
                        <span className="text-sm font-mono font-bold text-indigo-300">
                          {digitalTwin.turnRate.toFixed(1)}°/s
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">Wing Loading</span>
                        <span className="text-sm font-mono font-bold text-pink-300">
                          {digitalTwin.wingLoading.toFixed(2)} N/m²
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">Stall Margin</span>
                        <span className={`text-sm font-mono font-bold ${digitalTwin.stallMargin > 20 ? 'text-green-300' : digitalTwin.stallMargin > 10 ? 'text-yellow-300' : 'text-red-300'}`}>
                          {digitalTwin.stallMargin.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="text-[10px] text-gray-400">Flight Phase</span>
                        <span className="text-sm font-bold text-white capitalize">
                          {digitalTwin.flightPhase}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Structural Analysis Panel */}
                {showStructural && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h5 className="text-[10px] font-bold text-orange-400 uppercase mb-2 flex items-center gap-2">
                      <Shield size={12} /> Structural Integrity
                    </h5>
                    
                    {/* Overall Health */}
                    <div className="mb-3 p-2 bg-white/5 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] text-gray-300">Overall Health</span>
                        <span className={`text-xs font-bold ${
                          Object.values(structuralState).length > 0 
                            ? (Object.values(structuralState).reduce((sum, s) => sum + s.healthFactor, 0) / Object.values(structuralState).length > 0.8 ? 'text-green-300' : 'text-yellow-300')
                            : 'text-gray-300'
                        }`}>
                          {Object.values(structuralState).length > 0 
                            ? ((Object.values(structuralState).reduce((sum, s) => sum + s.healthFactor, 0) / Object.values(structuralState).length) * 100).toFixed(0)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-gray-600 rounded overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all"
                          style={{
                            width: Object.values(structuralState).length > 0 
                              ? ((Object.values(structuralState).reduce((sum, s) => sum + s.healthFactor, 0) / Object.values(structuralState).length) * 100) + '%'
                              : '100%'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Critical Warnings */}
                    {structuralWarnings.filter(w => w.severity === 'CRITICAL').length > 0 && (
                      <div className="mb-2 p-2 bg-red-900/30 border border-red-500/50 rounded">
                        {structuralWarnings.filter(w => w.severity === 'CRITICAL').map((warning, i) => (
                          <div key={i} className="flex gap-1 items-start mb-1">
                            <AlertTriangle size={10} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-[8px] text-red-300">{warning.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Component Status */}
                    <div className="space-y-1 text-[9px]">
                      {['wing', 'boom', 'ailerons', 'elevator', 'landingGear'].map(comp => 
                        structuralState[comp] && (
                          <div key={comp} className="flex justify-between items-center p-1 bg-white/5 rounded">
                            <span className="text-gray-400 capitalize">{comp}:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-orange-300">{(structuralState[comp].stress/1e6).toFixed(1)} MPa</span>
                              <div 
                                className="w-6 h-3 rounded"
                                style={{backgroundColor: `hsl(${structuralState[comp].healthFactor * 120}, 100%, 50%)`}}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Weight Information Panel */}
                {showWeight && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h5 className="text-[10px] font-bold text-purple-400 uppercase mb-2 flex items-center gap-2">
                      <Weight size={12} /> Aircraft Weight
                    </h5>
                    
                    {/* Total Weight */}
                    <div className="mb-3 p-2 bg-white/5 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] text-gray-300">Total Weight (Empty)</span>
                        <span className="text-xs font-bold text-purple-300">{weightModel.getEmptyWeight().toFixed(2)} kg</span>
                      </div>
                      <div className="text-[8px] text-gray-400">Structure + systems, no remote control</div>
                    </div>

                    {/* Weight Breakdown */}
                    <div className="space-y-1 text-[8px]">
                      {Object.entries(weightModel.getWeightBreakdown()).map(([category, weight]) => (
                        <div key={category} className="flex justify-between items-center p-1 bg-white/5 rounded">
                          <span className="text-gray-400">{category}</span>
                          <span className="font-mono text-purple-300">{weight.toFixed(2)} kg</span>
                        </div>
                      ))}
                    </div>

                    {/* Component Details */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <h6 className="text-[8px] font-bold text-purple-300 uppercase mb-2">Major Components</h6>
                      <div className="space-y-0.5 text-[7px]">
                        {[
                          { name: 'Wing', weight: 0.85 },
                          { name: 'Boom/Fuselage', weight: 0.35 },
                          { name: 'Landing Gear', weight: 0.45 },
                          { name: 'Battery & Electronics', weight: 0.80 },
                          { name: 'Propulsion (Motor+ESC)', weight: 0.35 },
                          { name: 'RC Payload', weight: 0.15 }
                        ].map((comp, i) => (
                          <div key={i} className="flex justify-between px-1 py-0.5 bg-white/5 rounded">
                            <span className="text-gray-400">{comp.name}</span>
                            <span className="font-mono text-purple-300">{comp.weight} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StepViewer;
