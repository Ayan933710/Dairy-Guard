import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

export default function NeuralWeb({ className = 'neural-web' }) {
  return (
    <ParticlesProvider init={loadSlim}>
      <Particles
        id="dairyguard-neural-web"
        className={className}
        options={{
          fullScreen: { enable: false },
          fpsLimit: 30,
          detectRetina: false,
          particles: {
          number: {
            density: { enable: true, area: 950 },
            value: 36,
          },
          color: { value: ['#075985', '#0f766e', '#0369a1', '#0891b2'] },
          links: {
            enable: true,
            color: '#075985',
            distance: 125,
            opacity: 0.36,
            width: 1,
          },
          move: {
            enable: true,
            speed: 0.58,
            direction: 'none',
            random: true,
            straight: false,
            outModes: { default: 'bounce' },
          },
          opacity: { value: { min: 0.48, max: 0.92 } },
          shape: { type: 'circle' },
          size: { value: { min: 1.8, max: 3.6 } },
          },
          interactivity: {
          detectsOn: 'window',
          events: {
            onHover: { enable: true, mode: ['grab', 'repulse'] },
            resize: true,
          },
          modes: {
            grab: {
              distance: 175,
              links: { opacity: 0.86 },
            },
            repulse: {
              distance: 115,
              duration: 0.35,
              speed: 0.7,
            },
          },
          },
          background: { color: 'transparent' },
        }}
      />
    </ParticlesProvider>
  );
}
