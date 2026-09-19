import { Suspense, useRef, useState } from 'react';
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

function InteractiveDevice({ type, onSelect }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

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
      <Suspense fallback={null}>
        <RealDeviceModel type={type} hovered={hovered} />
      </Suspense>
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
