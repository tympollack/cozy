'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Sun, Moon, Upload, CheckCircle,
  AlertCircle, MapPin, Loader, ArrowRight,
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

  const lightInputRef = useRef<HTMLInputElement>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);

  const activeSlot = activeMode === 'light' ? lightSlot : darkSlot;
  const setActiveSlot = activeMode === 'light' ? setLightSlot : setDarkSlot;
  const inputRef = activeMode === 'light' ? lightInputRef : darkInputRef;

  // --- File selection ---
  const handleFileChange = useCallback(
    async (mode: Mode, file: File | null) => {
      if (!file) return;
      setIsProcessingFile(true);
      try {
        const processedFile = await processImageFile(file);
        const preview = URL.createObjectURL(processedFile);
        const setter = mode === 'light' ? setLightSlot : setDarkSlot;
        setter({ file: processedFile, preview });
      } finally {
        setIsProcessingFile(false);
      }
    },
    []
  );

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
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 100%)' }}
      >
        <div className="text-center space-y-4">
          <CheckCircle size={64} className="mx-auto text-green-500" aria-hidden="true" />
          <h2 className="text-2xl font-800 text-[--cozy-bark]">Your space is live! 🏡</h2>
          <p className="text-[--cozy-muted]">You earned +{lightSlot.file && darkSlot.file ? 50 : 20} points. Redirecting to feed…</p>
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
            Share a <span className="font-600 text-amber-600">Light</span> and/or{' '}
            <span className="font-600 text-indigo-600">Dark</span> photo of your space.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center">
          <CameraToggle activeMode={activeMode} onChange={setActiveMode} />
        </div>

        <form id="camera-upload-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Dual preview row */}
          <div className="grid grid-cols-2 gap-4">
            {(['light', 'dark'] as Mode[]).map((mode) => {
              const slot = mode === 'light' ? lightSlot : darkSlot;
              const ref = mode === 'light' ? lightInputRef : darkInputRef;
              const Icon = mode === 'light' ? Sun : Moon;
              const label = mode === 'light' ? 'Light Mode' : 'Dark Mode';
              const accent = mode === 'light' ? 'text-amber-500' : 'text-indigo-500';
              const isActive = activeMode === mode;

              return (
                <div key={mode}>
                  <input
                    id={`file-input-${mode}`}
                    ref={ref}
                    type="file"
                    accept="image/*"
                    aria-label={`Upload ${label} photo`}
                    className="sr-only"
                    onChange={(e) => handleFileChange(mode, e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    id={`camera-slot-${mode}`}
                    onClick={() => {
                      setActiveMode(mode);
                      ref.current?.click();
                    }}
                    aria-label={slot.preview ? `${label} photo selected — tap to change` : `Tap to add ${label} photo`}
                    className={`upload-zone w-full aspect-[3/4] flex flex-col items-center justify-center
                      rounded-2xl overflow-hidden relative transition-all duration-200
                      ${isActive ? 'ring-2 ring-[--cozy-amber] ring-offset-2' : ''}
                      ${slot.preview ? 'border-transparent' : 'bg-stone-50/50 shadow-inner'}
                    `}
                  >
                    {slot.preview ? (
                      <>
                        <img
                          src={slot.preview}
                          alt={`${label} preview`}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-3">
                          <span className={`text-xs font-700 text-white bg-black/40 
                            rounded-full px-3 py-1 backdrop-blur-sm flex items-center gap-1`}>
                            <Icon size={12} className={accent} />
                            {label}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <Icon size={28} className={accent} aria-hidden="true" />
                        <span className="text-xs font-600 text-[--cozy-muted]">{label}</span>
                        <Camera size={16} className="text-[--cozy-muted]/50" aria-hidden="true" />
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Location (optional) */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <MapPin size={14} className={location ? 'text-green-500' : 'text-[--cozy-muted]'} aria-hidden="true" />
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
                {locLoading ? (
                  <Loader size={12} className="animate-spin" />
                ) : (
                  'Add'
                )}
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
              Tap a slot above to add a photo
            </p>
          )}

          <p className="text-center text-xs text-[--cozy-muted]">
            Earn <strong>+20 points</strong> for one, or <strong>+50 points</strong> for both ✨
          </p>
        </form>
      </div>
    </div>
  );
}
