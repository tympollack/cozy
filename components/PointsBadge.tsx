'use client';

import { useCozyStore } from '@/store/useCozyStore';
import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AnimatedCounter } from './AnimatedCounter';

export function PointsBadge() {
  const points = useCozyStore((s) => s.points);
  const prevRef = useRef(points);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (points !== prevRef.current) {
      setBouncing(true);
      prevRef.current = points;
      const t = setTimeout(() => setBouncing(false), 500);
      return () => clearTimeout(t);
    }
  }, [points]);

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full cozy-glass cozy-shadow
        ${bouncing ? 'points-bounce' : ''}`}
      aria-label={`${points} points`}
    >
      <Star
        size={14}
        className="fill-amber-400 text-amber-400"
        aria-hidden="true"
      />
      <span className="text-sm font-700 text-gradient tabular-nums">
        <AnimatedCounter value={points} />
      </span>
    </div>
  );
}
