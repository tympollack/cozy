'use client';

/**
 * @module components/dollhouse/WeatherAuraOverlay
 *
 * Ambient weather status auras driven by the daily Vibe Check state.
 * Renders layered atmospheric effects:
 *   - sunshine:  diagonal golden sunbeams, floating warmth motes, amber glow
 *   - breezy:    drifting autumn/spring leaves, light azure wind stream trails
 *   - starlight: deep twilight wash, sparkling celestial stars, soft moonbeam
 *   - neutral:   steady warm hearth radiance, gentle rising aroma/steam particles
 *   - foggy:     low rolling mist banks across the isometric floor tiles
 *   - raincloud: gentle overcast shadow, rain token streaks, subtle ripple splashes
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VibeStatus } from '@/types/vibe';

interface WeatherAuraOverlayProps {
  vibeStatus?: VibeStatus;
  nightMode?: boolean;
}

export function WeatherAuraOverlay({
  vibeStatus = 'neutral',
  nightMode = false,
}: WeatherAuraOverlayProps) {
  // Deterministic particle set for animations
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 10 + (i * 7.5) % 80,
      y: 15 + (i * 9) % 70,
      size: 4 + (i % 5) * 2,
      duration: 3 + (i % 4) * 1.5,
      delay: (i % 5) * 0.4,
    }));
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-20"
      aria-hidden="true"
    >
      <AnimatePresence>
        {/* ── 1. SUNSHINE: Golden Sunbeams & Amber Warmth ── */}
        {vibeStatus === 'sunshine' && (
          <motion.div
            key="vibe-sunshine"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {/* Diagonal Sunbeam polygon through window */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 800 600"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sunbeam-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="sunbeam-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
                  <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points="120,40 280,40 560,540 380,540" fill="url(#sunbeam-grad-1)" />
              <polygon points="220,50 340,50 640,480 500,480" fill="url(#sunbeam-grad-2)" />
            </svg>

            {/* Warm radiant aura in center */}
            <div className="absolute inset-0 bg-radial from-amber-400/20 via-orange-300/10 to-transparent" />

            {/* Golden dust motes */}
            {particles.map((p) => (
              <motion.div
                key={`sun-${p.id}`}
                className="absolute rounded-full bg-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                style={{
                  width: p.size * 0.7,
                  height: p.size * 0.7,
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                }}
                animate={{
                  y: [0, -18, 0],
                  opacity: [0.3, 0.9, 0.3],
                  scale: [0.9, 1.25, 0.9],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}

        {/* ── 2. BREEZY: Wind Gust Trails & Swaying Leaves ── */}
        {vibeStatus === 'breezy' && (
          <motion.div
            key="vibe-breezy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {/* Soft cyan atmospheric tint */}
            <div className="absolute inset-0 bg-radial from-sky-400/15 via-teal-300/5 to-transparent" />

            {/* Drifting wind stream paths */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 800 600"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M -50 180 Q 250 140 500 200 T 850 170"
                fill="none"
                stroke="rgba(186, 230, 253, 0.35)"
                strokeWidth="2.5"
                strokeDasharray="80 120"
                animate={{ strokeDashoffset: [0, -400] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />
              <motion.path
                d="M -50 320 Q 300 280 600 340 T 850 310"
                fill="none"
                stroke="rgba(186, 230, 253, 0.25)"
                strokeWidth="2"
                strokeDasharray="60 100"
                animate={{ strokeDashoffset: [0, -320] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />
            </svg>

            {/* Floating leaf particles */}
            {particles.map((p) => (
              <motion.div
                key={`leaf-${p.id}`}
                className="absolute text-emerald-400 select-none text-xs"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                }}
                animate={{
                  x: [0, 45, 90],
                  y: [0, 15, 30],
                  rotate: [0, 180, 360],
                  opacity: [0.1, 0.8, 0],
                }}
                transition={{
                  duration: p.duration + 2,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                🍃
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── 3. STARLIGHT: Celestial Night & Moonbeam Pool ── */}
        {vibeStatus === 'starlight' && (
          <motion.div
            key="vibe-starlight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {/* Deep twilight violet ambient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-purple-950/25 to-slate-950/30" />

            {/* Moonbeam pool */}
            <div
              className="absolute w-72 h-48 rounded-[100%] bg-purple-300/10 blur-2xl"
              style={{ left: '30%', top: '40%' }}
            />

            {/* Twinkling star tokens */}
            {particles.map((p) => (
              <motion.div
                key={`star-${p.id}`}
                className="absolute text-purple-200 select-none drop-shadow-[0_0_6px_rgba(216,180,254,0.9)]"
                style={{
                  fontSize: p.size + 4,
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [0.8, 1.25, 0.8],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                ✦
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── 4. NEUTRAL: Warm Hearth Glow & Coffee Steam Wisps ── */}
        {vibeStatus === 'neutral' && (
          <motion.div
            key="vibe-neutral"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {/* Steady warm amber ambient glow */}
            <div className="absolute inset-0 bg-radial from-amber-600/15 via-stone-800/10 to-transparent" />

            {/* Gentle rising warmth motes */}
            {particles.slice(0, 6).map((p) => (
              <motion.div
                key={`steam-${p.id}`}
                className="absolute rounded-full bg-amber-100/60 blur-[1px]"
                style={{
                  width: p.size,
                  height: p.size,
                  left: `${45 + (p.x % 20)}%`,
                  top: `${50 + (p.y % 25)}%`,
                }}
                animate={{
                  y: [0, -35],
                  opacity: [0.6, 0],
                  scale: [0.8, 1.4],
                }}
                transition={{
                  duration: 2.8 + p.delay,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}

        {/* ── 5. FOGGY: Low-Lying Rolling Mist Banks ── */}
        {vibeStatus === 'foggy' && (
          <motion.div
            key="vibe-foggy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {/* Soft muted slate ambient filter */}
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[0.5px]" />

            {/* Horizontal rolling fog layers */}
            <motion.div
              className="absolute bottom-6 -left-32 w-[140%] h-36 bg-gradient-to-t from-slate-200/25 via-slate-100/15 to-transparent blur-xl pointer-events-none"
              animate={{ x: [0, 50, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-16 -right-32 w-[140%] h-32 bg-gradient-to-t from-slate-300/20 via-slate-200/10 to-transparent blur-lg pointer-events-none"
              animate={{ x: [0, -60, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}

        {/* ── 6. RAINCLOUD: Overcast Sky, Rain Streaks & Splash Ripples ── */}
        {vibeStatus === 'raincloud' && (
          <motion.div
            key="vibe-raincloud"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {/* Overcast blue-gray tint */}
            <div className="absolute inset-0 bg-blue-950/20" />

            {/* Slanted rain streaks */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 800 600"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 24 }).map((_, i) => {
                const startX = (i * 35) % 800;
                const startY = (i * 25) % 300;
                return (
                  <motion.line
                    key={`rain-${i}`}
                    x1={startX}
                    y1={startY}
                    x2={startX - 18}
                    y2={startY + 45}
                    stroke="rgba(147, 197, 253, 0.45)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    animate={{
                      y1: [startY, startY + 600],
                      y2: [startY + 45, startY + 645],
                      x1: [startX, startX - 240],
                      x2: [startX - 18, startX - 258],
                    }}
                    transition={{
                      duration: 0.85,
                      delay: (i % 6) * 0.12,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                );
              })}
            </svg>

            {/* Ripple water token splashes on the floor */}
            {particles.slice(0, 5).map((p) => (
              <motion.div
                key={`ripple-${p.id}`}
                className="absolute rounded-full border border-sky-300/50"
                style={{
                  left: `${20 + (p.x % 60)}%`,
                  top: `${60 + (p.y % 30)}%`,
                  width: 14,
                  height: 7,
                }}
                animate={{
                  scale: [0.5, 2.2],
                  opacity: [0.8, 0],
                }}
                transition={{
                  duration: 1.4,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Night mode vignette if active */}
      {nightMode && (
        <div className="absolute inset-0 bg-indigo-950/30 mix-blend-multiply pointer-events-none" />
      )}
    </div>
  );
}
