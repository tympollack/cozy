'use client';

import React, { useState, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Check, X, Loader2, Tag } from 'lucide-react';
import { createItemPin } from '@/app/actions/pinActions';

interface PinDropZoneProps {
  postId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function PinDropZone({ postId, onCancel, onSuccess }: PinDropZoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  
  const [step, setStep] = useState<'drag' | 'form'>('drag');
  const [coordinates, setCoordinates] = useState({ xPercent: 50, yPercent: 50 });
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirmLocation = () => {
    if (!containerRef.current || !reticleRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const reticleRect = reticleRef.current.getBoundingClientRect();
    
    // Calculate center of the reticle
    const reticleCenterX = reticleRect.left + reticleRect.width / 2;
    const reticleCenterY = reticleRect.top + reticleRect.height / 2;
    
    // Convert to percentage relative to container
    const xPercent = ((reticleCenterX - containerRect.left) / containerRect.width) * 100;
    const yPercent = ((reticleCenterY - containerRect.top) / containerRect.height) * 100;
    
    // Clamp to 0-100 just in case
    setCoordinates({
      xPercent: Math.max(0, Math.min(100, xPercent)),
      yPercent: Math.max(0, Math.min(100, yPercent))
    });
    
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) {
      setErrorMsg('Both fields are required.');
      return;
    }
    
    // Basic URL cleanup
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await createItemPin(postId, coordinates.xPercent, coordinates.yPercent, title, finalUrl);
      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || 'Failed to create pin.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      
      {step === 'drag' && (
        <>
          {/* Header instructions */}
          <div className="absolute top-8 px-6 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full shadow-lg border border-white/20 animate-in fade-in slide-in-from-top-4">
            <p className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Drag the reticle to the item
            </p>
          </div>

          {/* Draggable Area */}
          <div ref={containerRef} className="relative w-full h-full">
            <motion.div
              ref={reticleRef}
              drag
              dragControls={dragControls}
              dragMomentum={false}
              dragElastic={0}
              dragConstraints={containerRef}
              className="absolute left-1/2 top-1/2 -ml-6 -mt-6 w-12 h-12 cursor-grab active:cursor-grabbing flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full border-2 border-white border-dashed bg-white/20 backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-8 flex gap-4 animate-in fade-in slide-in-from-bottom-4">
            <button
              onClick={onCancel}
              className="w-14 h-14 bg-red-500/90 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
              aria-label="Cancel"
            >
              <X size={24} />
            </button>
            <button
              onClick={handleConfirmLocation}
              className="w-14 h-14 bg-green-500/90 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
              aria-label="Confirm Location"
            >
              <Check size={24} />
            </button>
          </div>
        </>
      )}

      {step === 'form' && (
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-6 rounded-3xl w-[90%] max-w-sm shadow-2xl border border-zinc-200/50 dark:border-zinc-700/50 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-500" />
              Item Details
            </h3>
            <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
                {errorMsg}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Item Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Herman Miller Chair"
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Link URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://amazon.com/..."
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Pin'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
