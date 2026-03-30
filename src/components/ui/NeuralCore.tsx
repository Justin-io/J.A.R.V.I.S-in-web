import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking?: boolean;
}

export const NeuralCore: React.FC<Props> = ({ isListening, isSpeaking, isThinking }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010405, 0.04);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 14;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.sortObjects = false;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // --- GRAPH DATA STRUCTURE ---
    const nodes: any[] = [];
    const nodeCount = 2000;
    const brainRadius = { x: 7, y: 5.5, z: 6 };

    // --- GEOMETRY SETUP ---
    const nodeGeo = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeColors = new Float32Array(nodeCount * 3);
    const nodeSizes = new Float32Array(nodeCount);

    const colorBase = new THREE.Color(0x004466);

    // 1. Generate Nodes
    let validNodes = 0;
    while (validNodes < nodeCount) {
      let x = (Math.random() - 0.5) * 2 * brainRadius.x;
      let y = (Math.random() - 0.5) * 2 * brainRadius.y;
      let z = (Math.random() - 0.5) * 2 * brainRadius.z;

      // Ellipsoid constraint
      if ((x*x)/(brainRadius.x*brainRadius.x) + (y*y)/(brainRadius.y*brainRadius.y) + (z*z)/(brainRadius.z*brainRadius.z) > 1) continue;
      // Deep longitudinal fissure
      if (Math.abs(x) < 0.6 && Math.random() > 0.05) continue;
      // Lateral ventricles (hollow inside)
      if (Math.sqrt(x*x + y*y + z*z) < 2.5) continue;

      const isCore = Math.random() > 0.85;

      nodes.push({
        index: validNodes,
        vec: new THREE.Vector3(x, y, z),
        neighbors: [],
        flashIntensity: 0.0,
        isCore: isCore
      });

      nodePositions[validNodes * 3] = x;
      nodePositions[validNodes * 3 + 1] = y;
      nodePositions[validNodes * 3 + 2] = z;

      colorBase.toArray(nodeColors, validNodes * 3);
      nodeSizes[validNodes] = isCore ? 0.15 : 0.06;
      validNodes++;
    }

    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    nodeGeo.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

    // Custom shader for nodes
    const nodeMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if(d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    nodeGeo.setAttribute('size', new THREE.BufferAttribute(nodeSizes, 1));
    const pointSystem = new THREE.Points(nodeGeo, nodeMaterial);
    brainGroup.add(pointSystem);

    // 2. Generate Synapses (Lines)
    const linePositions: number[] = [];
    const maxDist = 1.8;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = nodes[i].vec.distanceTo(nodes[j].vec);
        if (dist < maxDist) {
          // Fissure crossover logic
          if (Math.sign(nodes[i].vec.x) !== Math.sign(nodes[j].vec.x) && dist > 1.0 && Math.random() > 0.02) continue;
          nodes[i].neighbors.push(nodes[j]);
          nodes[j].neighbors.push(nodes[i]);
          linePositions.push(
            nodes[i].vec.x, nodes[i].vec.y, nodes[i].vec.z,
            nodes[j].vec.x, nodes[j].vec.y, nodes[j].vec.z
          );
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const segmentCount = linePositions.length / 6; // each segment = 2 vertices = 6 floats
    const lineColors = new Float32Array(segmentCount * 6); // 2 vertices * 3 color channels per segment
    const baseLineColor = new THREE.Color(0x005577);
    for (let i = 0; i < segmentCount * 2; i++) {
      baseLineColor.toArray(lineColors, i * 3);
    }
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const synapseMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const lineSystem = new THREE.LineSegments(lineGeo, synapseMat);
    brainGroup.add(lineSystem);

    // Track which synapses are "firing" for electrical impulse effect
    const synapseFlash = new Float32Array(segmentCount).fill(0);


    // --- SIGNAL PROPAGATION (ACTION POTENTIALS) ---
    const maxSignals = 3000;
    const signals: any[] = [];
    const signalGeo = new THREE.BufferGeometry();
    const signalPos = new Float32Array(maxSignals * 3);
    signalGeo.setAttribute('position', new THREE.BufferAttribute(signalPos, 3));

    const signalMat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.12,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const signalSystem = new THREE.Points(signalGeo, signalMat);
    brainGroup.add(signalSystem);

    function spawnSignal(startNode: any) {
      if (startNode.neighbors.length === 0) return;
      const endNode = startNode.neighbors[Math.floor(Math.random() * startNode.neighbors.length)];
      const dist = startNode.vec.distanceTo(endNode.vec);
      const speed = (Math.random() * 0.02 + 0.02) / dist;
      signals.push({ a: startNode, b: endNode, progress: 0, speed: speed });
      startNode.flashIntensity = 1.0;
    }

    // --- INTERACTION ---
    let mouseX = 0;
    let mouseY = 0;
    const targetRotation = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      targetRotation.x = mouseY * 0.3;
      targetRotation.y = mouseX * 0.3;
    };

    const onMouseDown = () => {
      for (let i = 0; i < 5; i++) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        spawnSignal(randomNode);
        spawnSignal(randomNode);
        spawnSignal(randomNode);
      }
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    const colorAttr = nodeGeo.attributes.color;
    const sigPosAttr = signalGeo.attributes.position;

    const cBase = new THREE.Color(0x003355);
    const cFlash = new THREE.Color(0xddeeff);
    const tempColor = new THREE.Color();

    let frame = 0;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // State-aware spawn rate
      let spawnProb = 0.2;
      let rotationBoost = 1;
      if (isListening) { spawnProb = 0.6; rotationBoost = 2; }
      if (isSpeaking) { spawnProb = 0.8; rotationBoost = 1.5; }
      if (isThinking) { spawnProb = 0.95; rotationBoost = 3; }

      // === SPEAKING PULSE: Only breathing effect when speaking ===
      if (isSpeaking) {
        const speakPulse = Math.sin(time * 2) * 0.5 + 0.5;
        const scalePulse = 1.0 + speakPulse * 0.04;
        brainGroup.scale.setScalar(scalePulse);
        synapseMat.opacity = 0.15 + speakPulse * 0.1;
      } else {
        brainGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
        synapseMat.opacity = 0.15;
      }

      // 1. Spontaneous Thought Generation
      if (Math.random() < spawnProb) {
        spawnSignal(nodes[Math.floor(Math.random() * nodes.length)]);
      }

      // Extra bursts during active states
      if ((isListening || isSpeaking || isThinking) && Math.random() < 0.3) {
        const burstNode = nodes[Math.floor(Math.random() * nodes.length)];
        spawnSignal(burstNode);
        if (burstNode.neighbors.length > 0) spawnSignal(burstNode);
      }

      // === PROCESSING CASCADE: Massive signal bursts when thinking ===
      if (isThinking) {
        // Fire 3-5 extra cascade bursts per frame from random core nodes
        const cascadeCount = 3 + Math.floor(Math.random() * 3);
        for (let c = 0; c < cascadeCount; c++) {
          const coreNode = nodes[Math.floor(Math.random() * nodes.length)];
          if (coreNode.isCore || Math.random() < 0.4) {
            spawnSignal(coreNode);
            // Chain reaction — spawn from neighbors too
            if (coreNode.neighbors.length > 0) {
              const neighbor = coreNode.neighbors[Math.floor(Math.random() * coreNode.neighbors.length)];
              spawnSignal(neighbor);
            }
          }
        }

        // Randomly fire synapses with electrical impulses
        for (let s = 0; s < segmentCount; s++) {
          if (synapseFlash[s] <= 0 && Math.random() < 0.008) {
            synapseFlash[s] = 1.0; // ignite
          }
        }
      }

      // 2. Process Signals (Data Packets)
      for (let i = 0; i < maxSignals; i++) {
        sigPosAttr.setXYZ(i, 0, 0, 9999);
      }

      let activeCount = 0;
      for (let i = signals.length - 1; i >= 0; i--) {
        const sig = signals[i];
        sig.progress += sig.speed * (isListening ? 1.5 : isSpeaking ? 1.3 : 1);

        if (sig.progress >= 1.0) {
          sig.b.flashIntensity = 1.0;
          const branchChance = isThinking ? 0.8 : isSpeaking ? 0.7 : 0.6;
          if (Math.random() < branchChance) {
            spawnSignal(sig.b);
            if (Math.random() < 0.15) spawnSignal(sig.b);
          }
          signals.splice(i, 1);
        } else {
          if (activeCount < maxSignals) {
            const currentPos = new THREE.Vector3().lerpVectors(sig.a.vec, sig.b.vec, sig.progress);
            sigPosAttr.setXYZ(activeCount, currentPos.x, currentPos.y, currentPos.z);
            activeCount++;
          }
        }
      }
      sigPosAttr.needsUpdate = true;


      // 3. Update Node Flashes
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].flashIntensity > 0) {
          nodes[i].flashIntensity -= isThinking ? 0.02 : isSpeaking ? 0.03 : 0.05;
          if (nodes[i].flashIntensity < 0) nodes[i].flashIntensity = 0;
        }
        tempColor.copy(cBase).lerp(cFlash, nodes[i].flashIntensity);
        colorAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
      }
      colorAttr.needsUpdate = true;

      // 4. Update Synapse Electrical Impulses
      const lineColorAttr = lineGeo.attributes.color;
      const cSynapseBase = new THREE.Color(0x005577);
      const cSynapseFlash = new THREE.Color(0x00ffff);
      const cSynapseTemp = new THREE.Color();
      for (let s = 0; s < segmentCount; s++) {
        if (synapseFlash[s] > 0) {
          synapseFlash[s] -= 0.03; // decay
          if (synapseFlash[s] < 0) synapseFlash[s] = 0;
        }
        cSynapseTemp.copy(cSynapseBase).lerp(cSynapseFlash, synapseFlash[s]);
        // Each segment has 2 vertices
        lineColorAttr.setXYZ(s * 2, cSynapseTemp.r, cSynapseTemp.g, cSynapseTemp.b);
        lineColorAttr.setXYZ(s * 2 + 1, cSynapseTemp.r, cSynapseTemp.g, cSynapseTemp.b);
      }
      lineColorAttr.needsUpdate = true;

      // 5. Organic Movement
      brainGroup.rotation.y += 0.001 * rotationBoost;
      brainGroup.rotation.z = Math.sin(time * 0.3) * 0.02;

      // Interactive parallax
      scene.rotation.x += (targetRotation.x - scene.rotation.x) * 0.05;
      scene.rotation.y += (targetRotation.y - scene.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // --- RESIZE ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
      }
      nodeGeo.dispose(); nodeMaterial.dispose(); lineGeo.dispose(); synapseMat.dispose();
      signalGeo.dispose(); signalMat.dispose(); renderer.dispose();
    };
  }, [isListening, isSpeaking, isThinking]);

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center">
      {/* Main Canvas — transparent background to blend with app */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden relative cursor-crosshair rounded-2xl"
      />

      {/* Minimal overlay for state indicators only */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-48 h-48 rounded-full border border-cyan-400/20 animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>

        {isSpeaking && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5 items-end h-4">
            {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: [3, h * 3.5, 3] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.08 }}
                className="w-0.5 rounded-full"
                style={{ background: '#00ffff', boxShadow: '0 0 8px rgba(0,255,255,0.6)' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
