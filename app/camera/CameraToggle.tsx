'use client';

import { Sun, Moon } from 'lucide-react';

type Mode = 'light' | 'dark';

interface CameraToggleProps {
  activeMode: Mode;
  onChange: (mode: Mode) => void;
}

export function CameraToggle({ activeMode, onChange }: CameraToggleProps) {
  return (
    <div className="toggle-pill cozy-shadow" role="group" aria-label="Select photo mode">
      <button
        id="camera-toggle-light"
        type="button"
        onClick={() => onChange('light')}
        aria-pressed={activeMode === 'light'}
        className={`toggle-option flex items-center gap-2 ${activeMode === 'light' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
      >
        <Sun size={15} aria-hidden="true" />
        Light Mode
      </button>
      <button
        id="camera-toggle-dark"
        type="button"
        onClick={() => onChange('dark')}
        aria-pressed={activeMode === 'dark'}
        className={`toggle-option flex items-center gap-2 ${activeMode === 'dark' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
      >
        <Moon size={15} aria-hidden="true" />
        Dark Mode
      </button>
    </div>
  );
}
