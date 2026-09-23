import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

export default function InteractiveCard({
  children,
  className = '',
  variants = cardVariants,
  shimmer = true,
  ...props
}) {
  const [showShimmer, setShowShimmer] = useState(shimmer);
  const hasAnimated = useRef(false);
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [3, -3]), {
    stiffness: 260,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-3, 3]), {
    stiffness: 260,
    damping: 24,
  });

  useEffect(() => {
    if (!shimmer) return undefined;
    const shimmerTimer = window.setTimeout(() => setShowShimmer(false), 650);
    return () => window.clearTimeout(shimmerTimer);
  }, [shimmer]);

  // After first animation completes, mark as animated so subsequent
  // scroll-in/out cycles don't replay the hidden→visible transition.
  function handleAnimationComplete() {
    hasAnimated.current = true;
  }

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width);
    pointerY.set((event.clientY - bounds.top) / bounds.height);
  }

  function handlePointerLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <motion.div
      variants={variants}
      // After the first entrance animation, skip future "hidden" resets
      // so cards stay visible when scrolled out of and back into view.
      initial={hasAnimated.current ? 'visible' : undefined}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onAnimationComplete={handleAnimationComplete}
      className={`relative ${className}`}
      {...props}
    >
      {showShimmer && <span className="card-shimmer" aria-hidden="true" />}
      {children}
    </motion.div>
  );
}

export { cardVariants };
