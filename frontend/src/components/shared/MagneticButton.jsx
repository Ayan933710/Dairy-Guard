import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function MagneticButton({ children, className = '', ...props }) {
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const springX = useSpring(offsetX, { stiffness: 300, damping: 20 });
  const springY = useSpring(offsetY, { stiffness: 300, damping: 20 });

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    offsetX.set((event.clientX - (bounds.left + bounds.width / 2)) * 0.12);
    offsetY.set((event.clientY - (bounds.top + bounds.height / 2)) * 0.12);
  }

  function handlePointerLeave() {
    offsetX.set(0);
    offsetY.set(0);
  }

  return (
    <motion.button
      style={{ x: springX, y: springY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}
