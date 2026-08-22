'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ParticleBurstProps {
  /** Number of particles. Default: 8 */
  count?: number;
  /** Emoji or character to use per particle. Default: ['⭐'] */
  emojis?: string[];
  /** Radius of the burst in px. Default: 55 */
  radius?: number;
  /** Auto-clear duration in ms. Default: 900 */
  duration?: number;
}

export function ParticleBurst({
  count = 8,
  emojis = ['⭐', '✨', '🌟'],
  radius = 55,
  duration = 900,
}: ParticleBurstProps) {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    setParticles(Array.from({ length: count }, (_, i) => i));
    const t = setTimeout(() => setParticles([]), duration + 100);
    return () => clearTimeout(t);
  }, [count, duration]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      {particles.map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const spread = radius + Math.random() * 20;
        const x = Math.cos(angle) * spread;
        const y = Math.sin(angle) * spread;
        const emoji = emojis[i % emojis.length];

        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 1.6, x, y }}
            transition={{ duration: duration / 1000, ease: 'easeOut' }}
            className="absolute text-lg select-none"
          >
            {emoji}
          </motion.div>
        );
      })}
    </div>
  );
}
