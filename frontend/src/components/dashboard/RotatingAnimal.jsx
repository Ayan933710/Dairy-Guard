import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import AnimalModel from '../landing/AnimalModel.jsx';

export default function RotatingAnimal({ species, className = 'h-72 w-full' }) {
  const modelScale = species === 'buffalo' ? 0.56 : 0.76;
  const cameraPosition = species === 'buffalo' ? [1.8, 1.8, 5.2] : [1.8, 1.5, 4];

  return (
    <div className={className}>
      <Canvas dpr={[1, 1.5]} shadows camera={{ position: cameraPosition, fov: 42 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 4, 2]} intensity={1.5} color="#BAE6FD" castShadow />
          <Environment preset="city" environmentIntensity={1.2} />
          <group position={[0, -0.06, 0]} scale={modelScale}>
            <AnimalModel species={species} focused />
          </group>
          <ContactShadows frames={1} position={[0, -0.06, 0]} opacity={0.5} scale={6} blur={2.2} />
          <OrbitControls
            target={[0, 0.85, 0]}
            autoRotate
            autoRotateSpeed={2.6}
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 2.8}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
