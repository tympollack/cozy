"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { ArrowLeft, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex-1 w-full max-w-lg mx-auto p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-900 dark:text-white" />
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          Settings
        </h1>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        
        {/* Appearance Section */}
        <section className="backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            Appearance
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-white">Theme</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose light or dark mode.</p>
            </div>
            
            <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full p-1 relative">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all z-10 ${
                  theme === 'light'
                    ? 'text-zinc-900 shadow-md bg-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all z-10 ${
                  theme === 'dark'
                    ? 'text-white shadow-md bg-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
            </div>
          </div>
        </section>
        
      </div>
    </div>
  );
}
