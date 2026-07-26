'use client';

import { useState, useRef } from 'react';
import { Shield, Copy, Check, Share2 } from 'lucide-react';

interface InviteCodePillProps {
  code: string;
  groupName?: string;
  isFuturistic?: boolean;
  accentColor?: string;
  textColor?: string;
}

export function InviteCodePill({
  code,
  groupName = 'our Cozy group',
  isFuturistic = false,
  accentColor = '#f0c060',
  textColor = '#8a7060',
}: InviteCodePillProps) {
  const [copied, setCopied] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const shareText = `Join ${groupName} on Cozy! Use invite code: ${code}`;

  const triggerShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on Cozy`,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled share or unsupported
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle press & hold
  const handleTouchStart = () => {
    setIsHolding(false);
    holdTimerRef.current = setTimeout(() => {
      setIsHolding(true);
      triggerShare();
    }, 450);
  };

  const handleTouchEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
  };

  const handleClick = () => {
    if (!isHolding) {
      copyToClipboard();
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-700 transition-all active:scale-95 border select-none"
        style={{
          background: isFuturistic ? 'rgba(0,220,255,0.06)' : 'rgba(0,0,0,0.05)',
          borderColor: isFuturistic ? 'rgba(0,220,255,0.18)' : 'rgba(0,0,0,0.08)',
          color: textColor,
        }}
        title="Tap to copy code · Hold to share"
      >
        <Shield size={13} className="opacity-75 flex-shrink-0" />
        <span>Invite Code:</span>
        <span
          className="font-800 tracking-widest uppercase"
          style={{ color: accentColor }}
        >
          {code}
        </span>

        {copied ? (
          <span className="flex items-center gap-0.5 text-[10px] font-800 text-emerald-600 dark:text-emerald-400">
            <Check size={11} /> Copied!
          </span>
        ) : (
          <Copy size={11} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {/* Direct Share Button */}
      <button
        onClick={triggerShare}
        className="p-1.5 rounded-xl text-xs transition-all active:scale-90 hover:scale-105 border"
        style={{
          background: isFuturistic ? 'rgba(0,220,255,0.10)' : 'rgba(240,192,96,0.15)',
          borderColor: isFuturistic ? 'rgba(0,220,255,0.25)' : 'rgba(240,192,96,0.35)',
          color: accentColor,
        }}
        title="Share invite link"
      >
        <Share2 size={13} />
      </button>
    </div>
  );
}
