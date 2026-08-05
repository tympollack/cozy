'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const variants = {
  initial: (d: number) => ({ y: d > 0 ? '100%' : '-100%', opacity: 0 }),
  animate: { y: '0%', opacity: 1 },
  exit: (d: number) => ({ y: d > 0 ? '-100%' : '100%', opacity: 0, position: 'absolute' as const }),
};

export function AnimatedCounter({ value }: { value: number }) {
  const [direction, setDirection] = useState(1);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setDirection(value > prevValue ? 1 : -1);
    setPrevValue(value);
  }

  return (
    <div className="relative inline-flex overflow-hidden h-[1.2em] items-center">
      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <motion.span
          key={value}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="inline-block tabular-nums whitespace-nowrap"
        >
          {value.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
