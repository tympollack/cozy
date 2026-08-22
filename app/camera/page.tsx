'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Sun, Moon, Upload, CheckCircle,
  AlertCircle, MapPin, Loader, ArrowRight, Image as ImageIcon, Trash2, RefreshCw, X
} from 'lucide-react';
import { CameraToggle } from './CameraToggle';
import { uploadPost } from '@/app/actions/postActions';
import { useCozyStore } from '@/store/useCozyStore';
import { processImageFile } from '@/lib/imageUtils';

type Mode = 'light' | 'dark';
type SubmitState = 'idle' | 'uploading' | 'success' | 'error';

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
  const [lightSlot, setLightSlot] = useState<PhotoSlot>(EMPTY_SLOT);
  const [darkSlot, setDarkSlot] = useState<PhotoSlot>(EMPTY_SLOT);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [activePickerModalMode, setActivePickerModalMode] = useState<Mode | null>(null);

  // File input refs for Light mode
  const lightCameraRef = useRef<HTMLInputElement>(null);
  const lightGalleryRef = useRef<HTMLInputElement>(null);

  // File input refs for Dark mode
  const darkCameraRef = useRef<HTMLInputElement>(null);
  const darkGalleryRef = useRef<HTMLInputElement>(null);

  // --- File selection ---
  const handleFileChange = useCallback(
    async (mode: Mode, file: File | null) => {
      if (!file) return;
      const setter = mode === 'light' ? setLightSlot : setDarkSlot;

      // 1. Instant preview URL for immediate rendering (0ms delay)
      const instantPreview = URL.createObjectURL(file);
      setter({ file, preview: instantPreview });
      setActivePickerModalMode(null);

      // 2. Background image processing & compression (native HEIC decode + 1600px canvas JPEG)
      setIsProcessingFile(true);
      try {
        const processedFile = await processImageFile(file);
        const processedPreview = URL.createObjectURL(processedFile);
        setter({ file: processedFile, preview: processedPreview });
      } catch (err) {
        console.error('Image processing error:', err);
      } finally {
        setIsProcessingFile(false);
      }
    },
    []
  );

  const clearSlot = useCallback((mode: Mode, e: React.MouseEvent) => {
    e.stopPropagation();
    const setter = mode === 'light' ? setLightSlot : setDarkSlot;
    setter(EMPTY_SLOT);
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

  // --- Submit ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!lightSlot.file && !darkSlot.file) return;

      setSubmitState('uploading');
      setErrorMsg('');

      const formData = new FormData();
      if (lightSlot.file) formData.append('light', lightSlot.file);
      if (darkSlot.file) formData.append('dark', darkSlot.file);
      if (location) {
        formData.append('lat', String(location.lat));
        formData.append('lng', String(location.lng));
      }

      startTransition(async () => {
        const result = await uploadPost(formData);
        if (result.success) {
          addPoints(lightSlot.file && darkSlot.file ? 50 : 20); // Optimistic points
          setSubmitState('success');
          setTimeout(() => router.push('/feed'), 2000);
        } else {
          setErrorMsg(result.error ?? 'Upload failed. Try again.');
          setSubmitState('error');
        }
      });
    },
    [lightSlot, darkSlot, location, addPoints, router]
  );

  const anyReady = !!lightSlot.file || !!darkSlot.file;
  const isUploading = submitState === 'uploading' || isPending;

  if (submitState === 'success') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 100%)' }}
      >
        <div className="text-center space-y-4">
          <CheckCircle size={64} className="mx-auto text-green-500" aria-hidden="true" />
          <h2 className="text-2xl font-800 text-[--cozy-bark]">Your space is live! 🏡</h2>
          <p className="text-[--cozy-muted]">
            You earned +{lightSlot.file && darkSlot.file ? 50 : 20} points. Redirecting to feed…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5ede0 100%)' }}
    >
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-800 text-[--cozy-bark]">Share Your Space</h1>
          <p className="text-sm text-[--cozy-muted] mt-1">
            Capture a <span className="font-600 text-amber-600">Light</span> and/or{' '}
            <span className="font-600 text-indigo-600">Dark</span> photo of your cozy space.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center">
          <CameraToggle activeMode={activeMode} onChange={setActiveMode} />
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

        <form id="camera-upload-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Dual preview / capture row */}
          <div className="grid grid-cols-2 gap-4">
            {(['light', 'dark'] as Mode[]).map((mode) => {
              const slot = mode === 'light' ? lightSlot : darkSlot;
              const cameraRef = mode === 'light' ? lightCameraRef : darkCameraRef;
              const galleryRef = mode === 'light' ? lightGalleryRef : darkGalleryRef;

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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slot.preview}
                          alt={`${label} preview`}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 p-2 flex flex-col justify-between">
                          {/* Top controls */}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-700 text-white bg-black/40 rounded-full px-2 py-0.5 backdrop-blur-md flex items-center gap-1">
                              <Icon size={10} className={accent} />
                              {label}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => clearSlot(mode, e)}
                              className="w-6 h-6 rounded-full bg-black/60 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md"
                              title="Remove photo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Retake buttons */}
                          <div className="flex gap-1 justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cameraRef.current?.click();
                              }}
                              className="flex items-center gap-1 text-[9px] font-700 text-white bg-black/60 hover:bg-black/80 px-2 py-1 rounded-full backdrop-blur-md"
                            >
                              <Camera size={10} /> Camera
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                galleryRef.current?.click();
                              }}
                              className="flex items-center gap-1 text-[9px] font-700 text-white bg-black/60 hover:bg-black/80 px-2 py-1 rounded-full backdrop-blur-md"
                            >
                              <ImageIcon size={10} /> Gallery
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-3 text-center">
                        <Icon size={24} className={accent} aria-hidden="true" />
                        <span className="text-xs font-700 text-[--cozy-bark]">{label}</span>

                        {/* Dual capture / gallery buttons inside the empty slot */}
                        <div className="grid grid-cols-1 gap-1.5 w-full pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMode(mode);
                              cameraRef.current?.click();
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-700 bg-[--cozy-rust] text-white hover:opacity-90 transition-opacity shadow-sm"
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
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-600 bg-white/90 dark:bg-zinc-700/90 text-[--cozy-bark] hover:bg-white border border-[--cozy-amber]/30 transition-colors"
                          >
                            <ImageIcon size={13} className="text-[--cozy-rust]" />
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
                  ? 'Location added (approx. ~45km area)'
                  : 'Add approximate location? (optional)'}
              </span>
            </div>
            {!location && (
              <button
                id="camera-location-btn"
                type="button"
                onClick={requestLocation}
                disabled={locLoading}
                className="text-xs font-600 text-[--cozy-rust] hover:underline disabled:opacity-50"
                aria-label="Add approximate location"
              >
                {locLoading ? <Loader size={12} className="animate-spin" /> : 'Add'}
              </button>
            )}
          </div>

          {/* Error */}
          {submitState === 'error' && (
            <div
              id="camera-error"
              role="alert"
              className="flex items-center gap-2 text-sm text-red-600
                bg-red-50 border border-red-200 rounded-xl px-4 py-3"
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
              rounded-2xl text-base bg-stone-800 hover:bg-stone-900 text-amber-50 font-semibold shadow-md
              active:scale-[0.98]
              disabled:!bg-none disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed disabled:shadow-none
              transition-all duration-200`}
          >
            {isUploading ? (
              <>
                <Loader size={18} className="animate-spin" aria-hidden="true" />
                Uploading your space…
              </>
            ) : isProcessingFile ? (
              <>
                <Loader size={18} className="animate-spin" aria-hidden="true" />
                Processing image...
              </>
            ) : (
              <>
                <Upload size={18} aria-hidden="true" />
                Share my space
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
                className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10"
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-700 bg-[--cozy-rust] text-white shadow-md hover:opacity-90"
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-600 bg-white/90 text-[--cozy-bark] border border-[--cozy-amber]/30 hover:bg-white"
              >
                <ImageIcon size={18} className="text-[--cozy-rust]" /> Choose from Photo Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
