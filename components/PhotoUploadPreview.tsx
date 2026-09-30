'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Trash2, Camera, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import {
  CAMERA_WARMTH_FILTERS,
  type CameraFilter,
  type FilterOption,
} from '@/lib/cameraFilters';

export interface PhotoUploadPreviewProps {
  file: File | null;
  previewUrl: string | null;
  mode?: 'light' | 'dark';
  filter?: CameraFilter;
  filterDef?: FilterOption;
  filterCss?: string;
  imgError?: boolean;
  onImgError?: () => void;
  onImgLoad?: () => void;
  onClear?: (e: React.MouseEvent) => void;
  onRetake?: () => void;
  onGallery?: () => void;
  className?: string;
  'data-testid'?: string;
}

export function PhotoUploadPreview({
  file,
  previewUrl,
  mode = 'light',
  filter = 'golden_hour',
  filterDef,
  filterCss,
  imgError: controlledImgError,
  onImgError,
  onImgLoad,
  onClear,
  onRetake,
  onGallery,
  className = '',
  'data-testid': dataTestId,
}: PhotoUploadPreviewProps) {
  const [internalImgError, setInternalImgError] = useState(false);

  // Reconcile controlled vs uncontrolled error state
  const isError = controlledImgError !== undefined ? controlledImgError : internalImgError;

  // Determine active filter styling
  const activeDef =
    filterDef ??
    CAMERA_WARMTH_FILTERS.find((f) => f.id === filter) ??
    CAMERA_WARMTH_FILTERS[0];

  const resolvedFilterCss = filterCss ?? activeDef.css;

  // Whenever previewUrl or file changes (e.g., converted JPG arrives from WASM pipeline),
  // reset error state so the converted JPG URL renders directly in the preview img element
  useEffect(() => {
    setInternalImgError(false);
    onImgLoad?.();
  }, [previewUrl, onImgLoad]);

  const Icon = mode === 'light' ? Sun : Moon;
  const label = mode === 'light' ? 'Light Mode' : 'Dark Mode';
  const accent = mode === 'light' ? 'text-amber-500' : 'text-indigo-500';

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Fallback placeholder card shown ONLY when image decoding fails / prior to conversion */}
      {isError && (
        <div
          data-testid="preview-fallback-placeholder"
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-amber-950/80 via-stone-900/90 to-black/90 text-center select-none"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mb-1.5 shadow-inner">
            <ImageIcon size={22} className="text-amber-400" />
          </div>
          <span className="text-[11px] font-800 text-amber-100 tracking-tight line-clamp-1 max-w-[130px]">
            {file?.name ?? `${label} Photo`}
          </span>
          <span className="text-[9px] font-700 text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30 mt-1">
            ✨ Ready to share
          </span>
        </div>
      )}

      {/* Direct preview img element with live Ambient Warmth Filter applied */}
      {previewUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          data-testid={dataTestId || `camera-preview-${mode}`}
          src={previewUrl}
          alt={file?.name ? `${file.name} preview` : `${label} preview`}
          loading="lazy"
          style={{ filter: resolvedFilterCss }}
          onLoad={() => {
            setInternalImgError(false);
            onImgLoad?.();
          }}
          onError={() => {
            setInternalImgError(true);
            onImgError?.();
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            isError ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />
      )}

      {/* Viewfinder Overlays & Controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 p-2 flex flex-col justify-between select-none">
        {/* Top bar */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-700 text-white bg-black/50 rounded-full px-2 py-0.5 backdrop-blur-md flex items-center gap-1">
            <Icon size={10} className={accent} />
            {label}
          </span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="w-6 h-6 rounded-full bg-black/60 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors"
              title="Remove photo"
              aria-label="Remove photo"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* Bottom controls: Privacy and Warmth Filter Badges */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] text-white/90 font-700">
            <span
              data-testid={`badge-filter-${mode}`}
              className="px-1.5 py-0.5 rounded-md bg-amber-500/80 text-stone-950 font-800"
            >
              {activeDef.emoji} {activeDef.name}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-xs flex items-center gap-1 text-emerald-300">
              <ShieldCheck size={9} /> GPS Clean
            </span>
          </div>

          {/* Retake and Gallery Actions */}
          {(onRetake || onGallery) && (
            <div className="flex gap-1 justify-center pt-0.5">
              {onRetake && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetake();
                  }}
                  className="flex items-center gap-1 text-[9px] font-700 text-white bg-black/60 hover:bg-black/80 px-2 py-1 rounded-full backdrop-blur-md cursor-pointer transition-colors"
                >
                  <Camera size={10} /> Retake
                </button>
              )}
              {onGallery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGallery();
                  }}
                  className="flex items-center gap-1 text-[9px] font-700 text-white bg-black/60 hover:bg-black/80 px-2 py-1 rounded-full backdrop-blur-md cursor-pointer transition-colors"
                >
                  <ImageIcon size={10} /> Gallery
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
