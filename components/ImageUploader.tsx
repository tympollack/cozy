'use client';

import React, { useRef, useState, useCallback, useId } from 'react';
import { AlertCircle, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { CLOUD_SYNC_ERROR_MESSAGE, isCloudSyncError, probeCloudFile } from '@/lib/imageUtils';
export { CLOUD_SYNC_ERROR_MESSAGE, isCloudSyncError, probeCloudFile };


export interface ImageUploaderProps {
  id?: string;
  accept?: string;
  capture?: 'environment' | 'user';
  disabled?: boolean;
  className?: string;
  mode?: 'light' | 'dark';
  label?: string;
  onFileSelect?: (file: File) => void | Promise<void>;
  onError?: (error: Error | string) => void;
  onCloudSyncError?: (message: string) => void;
  children?: React.ReactNode;
  'data-testid'?: string;
}

export function ImageUploader({
  id,
  accept = 'image/*',
  capture,
  disabled = false,
  className = '',
  mode,
  label,
  onFileSelect,
  onError,
  onCloudSyncError,
  children,
  'data-testid': dataTestId = 'image-uploader',
}: ImageUploaderProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReading(true);
    setToastMessage(null);

    try {
      // 1. Probe file readability (catches OneDrive 0x80070185 / iCloud NotReadableError)
      await probeCloudFile(file);

      // 2. Dispatch selection callback
      if (onFileSelect) {
        await onFileSelect(file);
      }
    } catch (err) {
      if (isCloudSyncError(err)) {
        setToastMessage(CLOUD_SYNC_ERROR_MESSAGE);
        onCloudSyncError?.(CLOUD_SYNC_ERROR_MESSAGE);
      } else {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        onError?.(errorObj);
      }
      // Critical: Reset file input so user can reselect another photo without freezing
      resetInput();
    } finally {
      setIsReading(false);
    }
  };

  const triggerSelect = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className={`relative ${className}`} data-testid={dataTestId}>
      {/* Hidden native input */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        capture={capture}
        disabled={disabled || isReading}
        className="sr-only"
        onChange={handleInputChange}
        data-testid={`${dataTestId}-input`}
      />

      {/* Trigger / Content */}
      {children ? (
        <div onClick={triggerSelect} role="button" tabIndex={0} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerSelect}
          disabled={disabled || isReading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <Upload size={14} />
          <span>{label || 'Upload Photo'}</span>
        </button>
      )}

      {/* Cloud Hydration Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="alert"
            data-testid="cloud-sync-toast"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] p-3.5 rounded-2xl bg-amber-950/95 border-2 border-amber-400 text-amber-100 shadow-2xl backdrop-blur-md flex items-start gap-3"
          >
            <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toastMessage}
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-amber-400 hover:text-amber-200 cursor-pointer p-0.5 transition-colors"
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
