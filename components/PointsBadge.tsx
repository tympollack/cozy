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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold shadow-sm
        ${bouncing ? 'points-bounce' : ''}`}
      aria-label={`${points} points`}
    >
      <Star
        size={14}
        className="fill-amber-500 text-amber-500"
        aria-hidden="true"
      />
      <span className="text-sm tabular-nums">
        <AnimatedCounter value={points} />
      </span>
    </div>
  );
}
