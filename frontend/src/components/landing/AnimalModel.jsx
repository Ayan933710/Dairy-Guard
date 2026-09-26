import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';

const SPECIES_CONFIG = {
  cow: {
    body: '#E8DFC8',
    patches: '#2A2622',
    scale: [1, 1, 1],
    hornLength: 0.28,
    hornColor: '#D8CDB0',
    earLength: 0.32,
  },
  buffalo: {
    body: '#2E2E30',
    patches: null,
    scale: [1.08, 1.02, 1.15],
    hornLength: 0.55,
    hornColor: '#1B1B1C',
    earLength: 0.22,
  },
};

const ANIMAL_DETAILS = {
  cow: ['Focus animal', 'AI baseline ready', 'Two sensors attached'],
  buffalo: ['Buffalo profile', 'Baseline captured', 'Awaiting focus'],
};

function Leg({ x, z, height = 0.62 }) {
  return (
    <mesh position={[x, height / -2, z]} castShadow>
      <cylinderGeometry args={[0.06, 0.075, height, 8]} />
      <meshStandardMaterial color="#3a332a" roughness={0.8} />
    </mesh>
  );
}

function PrimitiveAnimal({
  species = 'cow',
  focused = false,
  ...groupProps
}) {
  const cfg = SPECIES_CONFIG[species] ?? SPECIES_CONFIG.cow;
  const headRef = useRef();
  const tailRef = useRef();
  const breatheRef = useRef();
  const [hovered, setHovered] = useState(false);
  const t0 = useMemo(() => Math.random() * 10, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() + t0;
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.6) * (focused ? 0.12 : 0.06);
      headRef.current.rotation.x = Math.sin(t * 0.9) * 0.03;
    }
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 2.2) * 0.25 - 0.3;
    }
    if (breatheRef.current) {
      const s = 1 + Math.sin(t * 1.4) * 0.012;
      breatheRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group
      {...groupProps}
      scale={cfg.scale}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {}
      <group ref={breatheRef}>
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.34, 0.75, 6, 12]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color={cfg.body} roughness={0.65} />
        </mesh>
        {cfg.patches && (
          <mesh position={[0.15, 0.72, 0.2]} rotation={[0.3, 0.4, 0]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color={cfg.patches} roughness={0.7} />
          </mesh>
        )}
      </group>

      {}
      <Leg x={0.32} z={0.22} />
      <Leg x={0.32} z={-0.22} />
      <Leg x={-0.32} z={0.22} />
      <Leg x={-0.32} z={-0.22} />

      {}
      <group ref={headRef} position={[0.52, 0.98, 0]} name="head-anchor">
        <mesh position={[0.12, 0, 0]} rotation={[0, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.32, 10]} />
          <meshStandardMaterial color={cfg.body} roughness={0.65} />
        </mesh>
        <mesh position={[0.34, 0.06, 0]} castShadow name="skull">
          <boxGeometry args={[0.34, 0.26, 0.24]} />
          <meshStandardMaterial color={cfg.body} roughness={0.6} />
        </mesh>
        {}
        <mesh position={[0.28, 0.24, 0.12]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.03, cfg.hornLength, 6]} />
          <meshStandardMaterial color={cfg.hornColor} roughness={0.4} />
        </mesh>
        <mesh position={[0.28, 0.24, -0.12]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.03, cfg.hornLength, 6]} />
          <meshStandardMaterial color={cfg.hornColor} roughness={0.4} />
        </mesh>
        {}
        <mesh position={[0.22, 0.1, 0.16]} rotation={[0.2, 0, 0.6]}>
          <coneGeometry args={[0.05, cfg.earLength, 6]} />
          <meshStandardMaterial color={cfg.body} roughness={0.7} />
        </mesh>
        <mesh position={[0.22, 0.1, -0.16]} rotation={[-0.2, 0, 0.6]}>
          <coneGeometry args={[0.05, cfg.earLength, 6]} />
          <meshStandardMaterial color={cfg.body} roughness={0.7} />
        </mesh>
        {}
        <mesh position={[0.46, -0.02, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#4a4038" roughness={0.9} />
        </mesh>
      </group>

      {}
      <mesh ref={tailRef} position={[-0.62, 0.75, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.02, 0.03, 0.42, 6]} />
        <meshStandardMaterial color={cfg.body} roughness={0.7} />
      </mesh>

      <AnimatePresence>
        {hovered && (
          <Html position={[0, 1.55, 0]} center distanceFactor={5}>
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="animal-hover-card"
            >
            <strong>{species}</strong>
            {ANIMAL_DETAILS[species].map((detail) => <span key={detail}>{detail}</span>)}
            </motion.div>
          </Html>
        )}
      </AnimatePresence>
    </group>
  );
}

function AssetAnimal({ species = 'cow', focused = false, ...groupProps }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { scene, animations } = useGLTF(`/models/${species}.glb`);
  const { actions } = useAnimations(animations, groupRef);
  const model = useMemo(() => scene.clone(true), [scene]);
  const normalizedModel = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const height = Math.max(size.y, 0.001);
    const targetHeight = 2.5;
    model.scale.setScalar(targetHeight / height);
    model.position.set(-center.x / height * targetHeight, -bounds.min.y / height * targetHeight, -center.z / height * targetHeight);
    return model;
  }, [model]);

  useEffect(() => {
    const animation = Object.entries(actions).find(([name]) => /idle|stand|walk|breath/i.test(name))?.[1]
      ?? Object.values(actions)[0];
    animation?.reset().fadeIn(0.35).play();
    return () => animation?.fadeOut(0.25);
  }, [actions]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += (hovered ? 0.012 : 0.0025);
    groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.25) * (focused ? 0.018 : 0.01);
  });

  return (
    <group
      ref={groupRef}
      {...groupProps}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={normalizedModel} />
      <AnimatePresence>
        {hovered && (
          <Html position={[0, 2.1, 0]} center distanceFactor={5}>
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="animal-hover-card"
            >
            <strong>{species}</strong>
            {ANIMAL_DETAILS[species].map((detail) => <span key={detail}>{detail}</span>)}
            </motion.div>
          </Html>
        )}
      </AnimatePresence>
    </group>
  );
}

export default function AnimalModel(props) {
  return <AssetAnimal {...props} />;
}

export { SPECIES_CONFIG };
