/**
 * GrumpyCloudOverlay
 *
 * Renders an SVG cloud anchored to the top of its container with pure CSS
 * rain drops falling beneath it. No canvas, no external libraries.
 *
 * Rain is produced by a fixed set of absolutely-positioned <span> elements,
 * each given a randomised CSS custom property for `--drop-duration` and
 * `--drop-delay`. This gives a natural staggered-rain feel with zero JS after
 * mount.
 *
 * Usage: render as a direct child of a `position: relative` container.
 */

// Drop config — deterministic so SSR & client match (no Math.random() at render)
const DROPS = [
  // [left%, height-px, variant, duration-s, delay-s]
  [8,  14, '',  1.05, 0.0 ],
  [15, 18, 'b', 1.20, 0.3 ],
  [22, 12, 'c', 0.95, 0.7 ],
  [30, 16, '',  1.15, 0.15],
  [38, 20, 'b', 1.30, 0.55],
  [46, 13, 'c', 1.00, 0.9 ],
  [54, 17, '',  1.10, 0.4 ],
  [62, 15, 'b', 1.25, 0.0 ],
  [70, 19, 'c', 0.90, 0.65],
  [78, 11, '',  1.20, 0.25],
  [85, 16, 'b', 1.05, 0.8 ],
  [92, 14, 'c', 1.15, 0.45],
] as const;

export function GrumpyCloudOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-10"
      aria-hidden="true"
      role="presentation"
    >
      {/* ── Cloud SVG ─────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 flex justify-center -translate-y-1/4">
        <svg
          viewBox="0 0 220 90"
          className="w-full max-w-[280px] drop-shadow-lg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Cloud body */}
          <ellipse cx="110" cy="68" rx="100" ry="26" fill="#9ca3af" fillOpacity="0.92" />
          {/* Cloud puffs */}
          <circle cx="60"  cy="55" r="28" fill="#9ca3af" fillOpacity="0.95" />
          <circle cx="95"  cy="42" r="34" fill="#6b7280" fillOpacity="0.95" />
          <circle cx="138" cy="48" r="30" fill="#9ca3af" fillOpacity="0.95" />
          <circle cx="170" cy="56" r="24" fill="#9ca3af" fillOpacity="0.90" />
          {/* Grumpy eyes */}
          <ellipse cx="88"  cy="54" rx="5" ry="6" fill="#374151" />
          <ellipse cx="132" cy="54" rx="5" ry="6" fill="#374151" />
          {/* Angry eyebrows */}
          <line x1="80"  y1="46" x2="96"  y2="50" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
          <line x1="140" y1="50" x2="124" y2="46" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
          {/* Frown mouth */}
          <path
            d="M 95 66 Q 110 60 125 66"
            stroke="#374151"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* ── Rain drops ────────────────────────────────────────────────── */}
      {DROPS.map(([left, height, variant, duration, delay], i) => (
        <span
          key={i}
          className={`rain-drop${variant ? ` rain-drop-${variant}` : ''}`}
          style={{
            left: `${left}%`,
            top: '28%',           // starts just below the cloud base
            height: `${height}px`,
            '--drop-duration': `${duration}s`,
            '--drop-delay':    `${delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Subtle dark vignette so the cloud reads over bright images ─ */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(55,65,81,0.35) 0%, rgba(55,65,81,0.05) 45%, transparent 70%)',
        }}
      />
    </div>
  );
}
