'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function ParticleBurst() {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    // 5 particles
    setParticles([1, 2, 3, 4, 5]);
    const t = setTimeout(() => setParticles([]), 1000);
    return () => clearTimeout(t);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {particles.map((p, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const distance = 40 + Math.random() * 20;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        return (
          <motion.div
            key={p}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 1.5, x, y }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute text-xl"
          >
            ⭐
          </motion.div>
        );
      })}
    </div>
  );
}
