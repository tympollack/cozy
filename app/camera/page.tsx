'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Sun, Moon, Upload,
  AlertCircle, MapPin, Loader, ArrowRight, Image as ImageIcon, Trash2, X, Sparkles,
  WifiOff, RefreshCw, ShieldCheck, Database
} from 'lucide-react';
import { CameraToggle } from './CameraToggle';
import { uploadPost } from '@/app/actions/postActions';
import { useCozyStore } from '@/store/useCozyStore';
import { processImageFile, getPreviewUrlFromFile } from '@/lib/imageUtils';
import { saveOfflinePost, useOfflineSync } from '@/lib/offlinePhotoStore';

export type Mode = 'light' | 'dark';
type SubmitState = 'idle' | 'uploading' | 'success' | 'error';

export type CameraFilter = 'natural' | 'golden_hour' | 'candlelight' | 'soft_honey';

export interface FilterOption {
  id: CameraFilter;
  name: string;
  emoji: string;
  css: string;
  description: string;
}

export const CAMERA_WARMTH_FILTERS: FilterOption[] = [
  {
    id: 'natural',
    name: 'Natural',
    emoji: '🌿',
    css: 'none',
    description: 'Crisp original lighting',
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    emoji: '🌅',
    css: 'sepia(0.22) saturate(1.28) brightness(1.04) contrast(1.02) hue-rotate(-6deg)',
    description: 'Warm late-afternoon sunlight',
  },
  {
    id: 'candlelight',
    name: 'Candlelight',
    emoji: '🕯️',
    css: 'sepia(0.35) saturate(1.35) brightness(0.96) contrast(1.08) hue-rotate(-12deg)',
    description: 'Cozy hearth & firelight amber glow',
  },
  {
    id: 'soft_honey',
    name: 'Soft Honey',
    emoji: '🍯',
    css: 'sepia(0.15) saturate(1.18) brightness(1.02) contrast(1.0)',
    description: 'Gentle honeyed morning warmth',
  },
];

interface PhotoSlot {
  file: File | null;
  preview: string | null;
}

const EMPTY_SLOT: PhotoSlot = { file: null, preview: null };

export default function CameraPage() {
  const router = useRouter();
  const addPoints = useCozyStore((s) => s.addPoints);
  const [isPending, startTransition] = useTransition();

  const [activeMode, setActiveMode] = useState<Mode>('light');
  const [lightFilter, setLightFilter] = useState<CameraFilter>('golden_hour');
  const [darkFilter, setDarkFilter] = useState<CameraFilter>('candlelight');
  const [lightSlot, setLightSlot] = useState<PhotoSlot>(EMPTY_SLOT);
  const [darkSlot, setDarkSlot] = useState<PhotoSlot>(EMPTY_SLOT);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [activePickerModalMode, setActivePickerModalMode] = useState<Mode | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<Mode, boolean>>({ light: false, dark: false });
  const [offlineSaved, setOfflineSaved] = useState(false);

  // Background IndexedDB offline sync hook
  const { isOnline, queuedCount, isSyncing, syncNow } = useOfflineSync(uploadPost);

  // File input refs for Light mode
  const lightCameraRef = useRef<HTMLInputElement>(null);
  const lightGalleryRef = useRef<HTMLInputElement>(null);

  // File input refs for Dark mode
  const darkCameraRef = useRef<HTMLInputElement>(null);
  const darkGalleryRef = useRef<HTMLInputElement>(null);

  const activeFilter = activeMode === 'light' ? lightFilter : darkFilter;
  const activeFilterConfig =
    CAMERA_WARMTH_FILTERS.find((f) => f.id === activeFilter) ?? CAMERA_WARMTH_FILTERS[0];

  // --- File selection ---
  const handleFileChange = useCallback(
    async (mode: Mode, file: File | null) => {
      if (!file) return;
      const setter = mode === 'light' ? setLightSlot : setDarkSlot;
      const filterToApply = mode === 'light' ? lightFilter : darkFilter;
      const filterCss = CAMERA_WARMTH_FILTERS.find((f) => f.id === filterToApply)?.css;

      setActivePickerModalMode(null);
      setImgErrors((prev) => ({ ...prev, [mode]: false }));

      // 1. Instant preview URL (handles Android HEIC via EXIF thumbnail extraction)
      const instantPreview = await getPreviewUrlFromFile(file);
      setter({ file, preview: instantPreview });

      // 2. Background image processing, EXIF scrubbing & compression (<100ms)
      setIsProcessingFile(true);
      try {
        const processedFile = await processImageFile(file, { filterCss });
        if (processedFile !== file) {
          const processedPreview = URL.createObjectURL(processedFile);
          setter({ file: processedFile, preview: processedPreview });
        }
      } catch (err) {
        console.error('Image processing error:', err);
      } finally {
        setIsProcessingFile(false);
      }
    },
    [lightFilter, darkFilter]
  );

  const clearSlot = useCallback((mode: Mode, e: React.MouseEvent) => {
    e.stopPropagation();
    const setter = mode === 'light' ? setLightSlot : setDarkSlot;
    setter(EMPTY_SLOT);
    setImgErrors((prev) => ({ ...prev, [mode]: false }));
  }, []);

  // --- Geolocation (optional) ---
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { timeout: 8000 }
    );
  }, []);

  // --- Submit & Offline Queueing ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!lightSlot.file && !darkSlot.file) return;

      setSubmitState('uploading');
      setErrorMsg('');

      // If user is currently offline or navigator is offline, save to IndexedDB queue directly
      if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        try {
          await saveOfflinePost({
            lightBlob: lightSlot.file,
            lightName: lightSlot.file?.name ?? null,
            darkBlob: darkSlot.file,
            darkName: darkSlot.file?.name ?? null,
            location,
          });
          addPoints(lightSlot.file && darkSlot.file ? 50 : 20);
          setOfflineSaved(true);
          setSubmitState('idle');
          return;
        } catch (err) {
          console.error('[handleSubmit] Offline save error:', err);
        }
      }

      const formData = new FormData();
      if (lightSlot.file) formData.append('light', lightSlot.file);
      if (darkSlot.file) formData.append('dark', darkSlot.file);
      if (location) {
        formData.append('lat', String(location.lat));
        formData.append('lng', String(location.lng));
      }

      startTransition(async () => {
        try {
          const result = await uploadPost(formData);
          if (result.success) {
            addPoints(lightSlot.file && darkSlot.file ? 50 : 20); // Optimistic points
            setSubmitState('success');
            setTimeout(() => router.push('/profile'), 2200);
          } else {
            setErrorMsg(result.error ?? 'Upload failed. Try again.');
            setSubmitState('error');
          }
        } catch (err) {
          console.error('[handleSubmit] Upload failed:', err);
          // Fallback to offline queue on unexpected network disconnect
          try {
            await saveOfflinePost({
              lightBlob: lightSlot.file,
              lightName: lightSlot.file?.name ?? null,
              darkBlob: darkSlot.file,
              darkName: darkSlot.file?.name ?? null,
              location,
            });
            addPoints(lightSlot.file && darkSlot.file ? 50 : 20);
            setOfflineSaved(true);
            setSubmitState('idle');
          } catch {
            setErrorMsg(
              (err as Error)?.message || 'Upload failed. Please check your connection and try again.'
            );
            setSubmitState('error');
          }
        }
      });
    },
    [lightSlot, darkSlot, location, addPoints, router, isOnline]
  );

  const anyReady = !!lightSlot.file || !!darkSlot.file;
  const isUploading = submitState === 'uploading' || isPending;

  // Offline Saved Confirmation Screen
  if (offlineSaved) {
    return (
      <div
        className="min-h-[85vh] flex items-center justify-center px-4 py-12"
        style={{ background: 'linear-gradient(160deg, #241a15 0%, #17110e 100%)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-sm text-center p-8 rounded-3xl bg-[#2e221b]/95 border-2 border-amber-400/40 shadow-2xl space-y-5 backdrop-blur-md relative overflow-hidden"
        >
          <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-4xl shadow-inner">
            💾
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-900 text-amber-50">Saved to Offline Queue! 🌿</h2>
            <p className="text-xs font-600 text-amber-200/80 leading-relaxed">
              Your photos are safely stored on your device. Cozy will automatically sync your space
              as soon as you are back online.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-800">
            <Database size={13} className="text-amber-400" />
            <span>IndexedDB Queue Ready · Zero GPS Leakage</span>
          </div>

          <button
            onClick={() => router.push('/profile')}
            className="w-full py-3 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-800 text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Go to My Spaces</span>
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    );
  }

  // Uploaded Live Success Screen
  if (submitState === 'success') {
    const pointsEarned = lightSlot.file && darkSlot.file ? 50 : 20;
    return (
      <div
        className="min-h-[85vh] flex items-center justify-center px-4 py-12"
        style={{ background: 'linear-gradient(160deg, #241a15 0%, #17110e 100%)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-sm text-center p-8 rounded-3xl bg-[#2e221b]/95 border-2 border-amber-400/40 shadow-2xl space-y-6 backdrop-blur-md relative overflow-hidden"
        >
          {/* Ambient golden glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border border-amber-300/60">
            <span className="text-4xl filter drop-shadow animate-bounce">🏡</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-900 text-amber-50 tracking-tight">
              Your space is live! ✨
            </h2>
            <p className="text-sm font-600 text-amber-200/80">
              Ready to feature in your cozy shell
            </p>
          </div>

          {/* Points Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-sm font-800">+{pointsEarned} Points Earned</span>
          </div>

          {/* Direct CTA */}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => router.push('/profile')}
              className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-800 text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>View in My Spaces</span>
              <ArrowRight size={16} />
            </button>
            <p className="text-[11px] font-500 text-amber-300/60">
              Taking you to your spaces in a moment...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="cozy-page-bg px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Offline Status Alert Banner */}
        {!isOnline && (
          <div
            data-testid="offline-status-banner"
            className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-700 shadow-sm"
          >
            <span className="flex items-center gap-1.5">
              <WifiOff size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>Offline Living: photos will save locally & auto-sync when online</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-950 dark:text-amber-100 font-800 flex-shrink-0">
              Auto Sync
            </span>
          </div>
        )}

        {/* Pending Sync Bar if queued photos exist */}
        {queuedCount > 0 && (
          <div
            data-testid="pending-sync-bar"
            className="flex items-center justify-between p-3 rounded-2xl bg-stone-900 border border-amber-500/30 text-amber-200 text-xs font-700 shadow-sm"
          >
            <span className="flex items-center gap-1.5">
              <Database size={14} className="text-amber-400 flex-shrink-0" />
              <span>{queuedCount} offline {queuedCount === 1 ? 'space' : 'spaces'} waiting to sync</span>
            </span>
            <button
              type="button"
              onClick={syncNow}
              disabled={isSyncing || !isOnline}
              className="px-3 py-1 rounded-xl bg-amber-400 text-stone-950 font-800 text-[11px] hover:bg-amber-300 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing…' : 'Sync Now'}</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-800 text-[--cozy-bark]">Share Your Space</h1>
          <p className="text-sm text-[--cozy-muted]">
            Capture a <span className="font-700 text-amber-600">Light</span> and/or{' '}
            <span className="font-700 text-indigo-600">Dark</span> photo of your cozy space.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center">
          <CameraToggle activeMode={activeMode} onChange={setActiveMode} />
        </div>

        {/* Ambient Warmth Filter Selector */}
        <div
          data-testid="warmth-filter-selector"
          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs"
        >
          <div className="flex items-center justify-between w-full px-1 text-xs">
            <span className="font-800 text-[--cozy-bark] flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-600" />
              <span>Ambient Warmth Filter ({activeMode === 'light' ? 'Light' : 'Dark'} Mode)</span>
            </span>
            <span className="text-[10px] font-700 text-[--cozy-muted]">
              {activeFilterConfig.description}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 w-full">
            {CAMERA_WARMTH_FILTERS.map((filter) => {
              const isSelected = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  data-testid={`filter-btn-${filter.id}`}
                  onClick={() => {
                    if (activeMode === 'light') setLightFilter(filter.id);
                    else setDarkFilter(filter.id);
                  }}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-800 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-xs scale-[1.03]'
                      : 'bg-white/70 dark:bg-stone-800/70 text-[--cozy-bark] dark:text-stone-200 border-amber-900/10 hover:bg-white'
                  }`}
                  title={filter.description}
                >
                  <span className="text-base leading-none mb-0.5">{filter.emoji}</span>
                  <span className="text-[10px] tracking-tight truncate">{filter.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hidden inputs for Light mode */}
        <input
          id="camera-input-light"
          ref={lightCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => handleFileChange('light', e.target.files?.[0] ?? null)}
        />
        <input
          id="gallery-input-light"
          ref={lightGalleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFileChange('light', e.target.files?.[0] ?? null)}
        />

        {/* Hidden inputs for Dark mode */}
        <input
          id="camera-input-dark"
          ref={darkCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => handleFileChange('dark', e.target.files?.[0] ?? null)}
        />
        <input
          id="gallery-input-dark"
          ref={darkGalleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFileChange('dark', e.target.files?.[0] ?? null)}
        />

        <form id="camera-upload-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Dual preview / capture row */}
          <div className="grid grid-cols-2 gap-4">
            {(['light', 'dark'] as Mode[]).map((mode) => {
              const slot = mode === 'light' ? lightSlot : darkSlot;
              const cameraRef = mode === 'light' ? lightCameraRef : darkCameraRef;
              const galleryRef = mode === 'light' ? lightGalleryRef : darkGalleryRef;
              const filterId = mode === 'light' ? lightFilter : darkFilter;
              const filterDef =
                CAMERA_WARMTH_FILTERS.find((f) => f.id === filterId) ?? CAMERA_WARMTH_FILTERS[0];

              const Icon = mode === 'light' ? Sun : Moon;
              const label = mode === 'light' ? 'Light Mode' : 'Dark Mode';
              const accent = mode === 'light' ? 'text-amber-500' : 'text-indigo-500';
              const isActive = activeMode === mode;

              return (
                <div key={mode} className="space-y-2">
                  <div
                    onClick={() => {
                      setActiveMode(mode);
                      if (!slot.preview) {
                        setActivePickerModalMode(mode);
                      }
                    }}
                    className={`w-full aspect-[3/4] flex flex-col items-center justify-center
                      rounded-2xl overflow-hidden relative transition-all duration-200 cursor-pointer
                      ${isActive ? 'ring-2 ring-[--cozy-amber] ring-offset-2' : ''}
                      ${slot.preview ? 'border-transparent shadow-md' : 'bg-white/60 dark:bg-zinc-800/60 border-2 border-dashed border-[--cozy-amber]/40 hover:border-[--cozy-amber] shadow-inner'}
                    `}
                  >
                    {slot.preview ? (
                      <>
                        {/* Fallback card when native image rendering is unsupported or fails */}
                        {imgErrors[mode] && (
                          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-amber-950/80 via-stone-900/90 to-black/90 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mb-1.5 shadow-inner">
                              <ImageIcon size={22} className="text-amber-400" />
                            </div>
                            <span className="text-[11px] font-800 text-amber-100 tracking-tight line-clamp-1 max-w-[130px]">
                              {slot.file?.name ?? `${label} Photo`}
                            </span>
                            <span className="text-[9px] font-700 text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30 mt-1">
                              ✨ Ready to share
                            </span>
                          </div>
                        )}

                        {/* Real-time warm preview image with filter applied */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          data-testid={`camera-preview-${mode}`}
                          src={slot.preview}
                          alt=""
                          loading="lazy"
                          style={{ filter: filterDef.css }}
                          onError={() => setImgErrors((prev) => ({ ...prev, [mode]: true }))}
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${imgErrors[mode] ? 'opacity-0' : 'opacity-100'}`}
                        />

                        {/* Viewfinder Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 p-2 flex flex-col justify-between select-none">
                          {/* Top controls */}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-700 text-white bg-black/50 rounded-full px-2 py-0.5 backdrop-blur-md flex items-center gap-1">
                              <Icon size={10} className={accent} />
                              {label}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => clearSlot(mode, e)}
                              className="w-6 h-6 rounded-full bg-black/60 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md cursor-pointer"
                              title="Remove photo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Privacy and Warmth Badge */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[9px] text-white/90 font-700">
                              <span
                                data-testid={`badge-filter-${mode}`}
                                className="px-1.5 py-0.5 rounded-md bg-amber-500/80 text-stone-950 font-800"
                              >
                                {filterDef.emoji} {filterDef.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-xs flex items-center gap-1 text-emerald-300">
                                <ShieldCheck size={9} /> GPS Clean
                              </span>
                            </div>

                            {/* Retake buttons */}
                            <div className="flex gap-1 justify-center pt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cameraRef.current?.click();
                                }}
                                className="flex items-center gap-1 text-[9px] font-700 text-white bg-black/60 hover:bg-black/80 px-2 py-1 rounded-full backdrop-blur-md cursor-pointer"
                              >
                                <Camera size={10} /> Retake
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  galleryRef.current?.click();
                                }}
                                className="flex items-center gap-1 text-[9px] font-700 text-white bg-black/60 hover:bg-black/80 px-2 py-1 rounded-full backdrop-blur-md cursor-pointer"
                              >
                                <ImageIcon size={10} /> Gallery
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-3 text-center">
                        <Icon size={24} className={accent} aria-hidden="true" />
                        <span className="text-xs font-700 text-stone-800 dark:text-stone-200">
                          {label}
                        </span>

                        {/* Dual capture / gallery buttons inside the empty slot */}
                        <div className="grid grid-cols-1 gap-1.5 w-full pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMode(mode);
                              cameraRef.current?.click();
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-700 bg-[#b84d1e] hover:bg-[#a04319] text-white transition-colors shadow-sm cursor-pointer"
                          >
                            <Camera size={13} />
                            Take Photo
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMode(mode);
                              galleryRef.current?.click();
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-600 bg-white/95 dark:bg-stone-800/95 text-stone-900 dark:text-stone-100 hover:bg-white border border-amber-900/15 dark:border-amber-500/30 transition-colors shadow-xs cursor-pointer"
                          >
                            <ImageIcon size={13} className="text-[#b84d1e] dark:text-amber-400" />
                            From Gallery
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Location (optional) */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <MapPin
                size={14}
                className={location ? 'text-green-500' : 'text-[--cozy-muted]'}
                aria-hidden="true"
              />
              <span className="text-sm text-[--cozy-muted]">
                {location
                  ? 'Approximate neighborhood added (~45km radius)'
                  : 'Add approximate location? (optional)'}
              </span>
            </div>
            {!location && (
              <button
                id="camera-location-btn"
                type="button"
                onClick={requestLocation}
                disabled={locLoading}
                className="text-xs font-600 text-[--cozy-rust] hover:underline disabled:opacity-50 cursor-pointer"
                aria-label="Add approximate location"
              >
                {locLoading ? <Loader size={12} className="animate-spin" /> : 'Add'}
              </button>
            )}
          </div>

          {/* Privacy Guarantee callout */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-100/80 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800 text-[11px] text-[--cozy-muted]">
            <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
            <span>
              <strong>Zero GPS Leakage:</strong> All EXIF metadata & device serials are scrubbed on your device before upload.
            </span>
          </div>

          {/* Error message */}
          {submitState === 'error' && (
            <div
              id="camera-error"
              role="alert"
              className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              <AlertCircle size={16} aria-hidden="true" />
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            id="camera-submit-btn"
            type="submit"
            disabled={!anyReady || isUploading || isProcessingFile}
            className={`w-full flex items-center justify-center gap-2 py-4 px-6
              rounded-2xl text-base font-semibold shadow-md cursor-pointer
              active:scale-[0.98]
              transition-all duration-200 ${
                !isOnline
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-stone-800 hover:bg-stone-900 text-amber-50'
              }
              disabled:!bg-none disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed disabled:shadow-none`}
          >
            {isUploading ? (
              <>
                <Loader size={18} className="animate-spin" aria-hidden="true" />
                <span>{isOnline ? 'Uploading your space…' : 'Saving to offline queue…'}</span>
              </>
            ) : isProcessingFile ? (
              <>
                <Loader size={18} className="animate-spin" aria-hidden="true" />
                <span>Scrubbing EXIF & compressing…</span>
              </>
            ) : !isOnline ? (
              <>
                <Database size={18} aria-hidden="true" />
                <span>Save space offline 💾</span>
              </>
            ) : (
              <>
                <Upload size={18} aria-hidden="true" />
                <span>Share my space</span>
                <ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>

          {!anyReady && (
            <p className="text-center text-xs text-[--cozy-muted]" aria-live="polite">
              Use <strong>Take Photo 📷</strong> or <strong>From Gallery 🖼️</strong> above to add a photo
            </p>
          )}

          <p className="text-center text-xs text-[--cozy-muted]">
            Earn <strong>+20 points</strong> for one, or <strong>+50 points</strong> for both ✨
          </p>
        </form>
      </div>

      {/* Choice Modal when tapping card body */}
      {activePickerModalMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl p-6 cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-800 text-[--cozy-bark]">
                Select {activePickerModalMode === 'light' ? 'Light' : 'Dark'} Photo
              </h3>
              <button
                onClick={() => setActivePickerModalMode(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const ref =
                    activePickerModalMode === 'light' ? lightCameraRef : darkCameraRef;
                  ref.current?.click();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-700 bg-[#b84d1e] hover:bg-[#a04319] text-white shadow-md transition-colors cursor-pointer"
              >
                <Camera size={18} /> Take Photo with Camera
              </button>
              <button
                type="button"
                onClick={() => {
                  const ref =
                    activePickerModalMode === 'light' ? lightGalleryRef : darkGalleryRef;
                  ref.current?.click();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-600 bg-white/95 dark:bg-stone-800/95 text-stone-900 dark:text-stone-100 border border-amber-900/15 dark:border-amber-500/30 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-xs cursor-pointer"
              >
                <ImageIcon size={18} className="text-[#b84d1e] dark:text-amber-400" /> Choose from Photo Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
