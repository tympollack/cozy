'use client';

import { useCozyStore } from '@/store/useCozyStore';
import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AnimatedCounter } from './AnimatedCounter';

import { createBrowserClient } from '@/lib/supabase-browser';

export function PointsBadge() {
  const { points, setPoints } = useCozyStore();
  const prevRef = useRef(points);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.schema('cozy').from('users').select('points').eq('id', user.id).single();
          if (data && data.points !== undefined) {
            setPoints(data.points);
          }
        }
      } catch (err) {
        console.error('Failed to sync points:', err);
      }
    };
    fetchPoints();
  }, [setPoints]);

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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-600/50 font-800 shadow-xs transition-colors
        ${bouncing ? 'points-bounce' : ''}`}
      aria-label={`${points} points`}
    >
      <Star
        size={13}
        className="fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
        aria-hidden="true"
      />
      <span className="text-xs font-900 tabular-nums">
        <AnimatedCounter value={points} />
      </span>
    </div>
  );
}
