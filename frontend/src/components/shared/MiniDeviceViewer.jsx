import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import DeviceTooltip from '../landing/DeviceTooltip.jsx';
import { DEVICES } from '../../data/devices.js';

const MODEL_PATHS = {
  collar: '/models/Smart_Collar.glb',
  cup: '/models/Digi-Cup.glb',
  hub: '/models/Central_Hub.glb',
};

function RealDeviceModel({ type, hovered }) {
  const path = MODEL_PATHS[type] || '/models/cow.glb';
  const { scene } = useGLTF(path, true);
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += hovered ? 0.02 : 0.008;
    groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.05;
  });

  return (
    <group ref={groupRef} scale={type === 'hub' ? 0.9 : type === 'cup' ? 0.95 : 1.1}>
      <primitive object={scene.clone()} />
    </group>
  );
}

function CollarMesh({ hovered }) {
  return (
    <group rotation={[0.15, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.1, 12, 32]} />
        <meshStandardMaterial color={hovered ? '#0EA5E9' : '#233A2F'} emissive={hovered ? '#0369A1' : '#000000'} roughness={0.4} metalness={0.35} />
      </mesh>
      <mesh position={[0.45, -0.12, 0.1]}>
        <boxGeometry args={[0.26, 0.2, 0.14]} />
        <meshStandardMaterial color="#0f1a17" roughness={0.5} />
      </mesh>
      <mesh position={[0.6, -0.12, 0.1]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#4C8A68" emissive="#4C8A68" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function CupMesh({ hovered }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.34, 0.28, 0.5, 24]} />
        <meshStandardMaterial color={hovered ? '#38BDF8' : '#F6F2E7'} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.16, 0.31]}>
        <boxGeometry args={[0.24, 0.15, 0.02]} />
        <meshStandardMaterial color="#0f1a17" emissive="#2F5D46" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.09, 0.06, 0.24, 12]} />
        <meshStandardMaterial color="#233A2F" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function HubMesh({ hovered }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.82, 0.58, 0.3]} />
        <meshStandardMaterial color={hovered ? '#0EA5E9' : '#233A2F'} roughness={0.38} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.03, 0.16]}>
        <boxGeometry args={[0.42, 0.16, 0.018]} />
        <meshStandardMaterial color="#0f1a17" emissive="#2F5D46" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-0.28, -0.18, 0.16]}>
        <sphereGeometry args={[0.025, 10, 10]} />
        <meshStandardMaterial color="#6FC58D" emissive="#6FC58D" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[-0.18, -0.18, 0.16]}>
        <sphereGeometry args={[0.025, 10, 10]} />
        <meshStandardMaterial color="#0EA5E9" emissive="#0EA5E9" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.28, 0.42, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.34, 10]} />
        <meshStandardMaterial color="#CFC9B8" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function InteractiveDevice({ type, onSelect }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [useFallback, setUseFallback] = useState(true);

  useEffect(() => {
    let active = true;
    const modelPath = MODEL_PATHS[type];

    fetch(modelPath)
      .then((response) => {
        const contentType = response.headers.get('content-type') || '';
        const isModelResponse = response.ok && !contentType.includes('text/html');
        if (active) setUseFallback(!isModelResponse);
      })
      .catch(() => {
        if (active) setUseFallback(true);
      });

    return () => {
      active = false;
    };
  }, [type]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += (hovered ? 0.018 : 0.006);
    groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.04;
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => { event.stopPropagation(); onSelect(type); }}
      scale={hovered ? 1.12 : 1}
    >
      {useFallback ? (
        <>
          {type === 'collar' ? <CollarMesh hovered={hovered} /> : type === 'cup' ? <CupMesh hovered={hovered} /> : <HubMesh hovered={hovered} />}
        </>
      ) : (
        <Suspense fallback={
          type === 'collar' ? <CollarMesh hovered={hovered} /> : type === 'cup' ? <CupMesh hovered={hovered} /> : <HubMesh hovered={hovered} />
        }>
          <RealDeviceModel type={type} hovered={hovered} />
        </Suspense>
      )}
    </group>
  );
}

export default function MiniDeviceViewer({ type, callouts = [] }) {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const selected = selectedDevice ? DEVICES[selectedDevice] : null;

  return (
    <div className="device-viewer-layout">
      <div className="device-canvas-wrap">
        <div className="device-callouts" aria-hidden="true">
          {callouts.map(([label, detail], index) => (
            <div key={label} className={`device-callout device-callout-${index + 1}`}>
              <span className="device-callout-line" />
              <b>{label}</b><small>{detail}</small>
            </div>
          ))}
        </div>
        <Canvas dpr={[1, 1.5]} camera={{ position: [1.4, 0.8, 1.6], fov: 40 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[2, 3, 2]} intensity={1.4} color="#BAE6FD" />
            <Environment preset="city" environmentIntensity={1.2} />
            <Bounds fit clip observe margin={1.25}>
              <InteractiveDevice
                type={type}
                onSelect={(deviceType) => setSelectedDevice((currentDevice) => (
                  currentDevice === deviceType ? null : deviceType
                ))}
              />
            </Bounds>
            <ContactShadows frames={1} position={[0, -0.5, 0]} opacity={0.5} scale={4} blur={2} />
            <OrbitControls
              autoRotate
              autoRotateSpeed={2.2}
              enableZoom={false}
              enablePan={false}
              enableRotate
              minPolarAngle={Math.PI / 2.6}
              maxPolarAngle={Math.PI / 2.1}
            />
          </Suspense>
        </Canvas>
      </div>
      <AnimatePresence mode="wait">
        {selected && selectedDevice === type && (
          <motion.aside
            key={selectedDevice}
            className="device-detail-panel"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 18 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <button type="button" className="device-detail-close" onClick={() => setSelectedDevice(null)} aria-label="Close device details">
              <X size={15} />
            </button>
            <DeviceTooltip device={selected} />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
