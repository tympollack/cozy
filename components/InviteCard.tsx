'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { joinGroup } from '@/app/actions/groupActions';

export interface InviteGroupInfo {
  id: string;
  name: string;
  motto?: string;
  inviteCode: string;
  memberCount: number;
  maxMembers: number;
  members: { initial: string; displayName: string }[];
}

interface InviteCardProps {
  group: InviteGroupInfo;
}

export function InviteCard({ group }: InviteCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = () => {
    setError(null);
    startTransition(async () => {
      const res = await joinGroup(group.inviteCode);
      if (!res.success) {
        setError(res.error ?? 'Failed to join group.');
      } else {
        router.push(`/groups/${res.groupId}`);
      }
    });
  };

  return (
    <div className="relative w-80 p-6 rounded-3xl bg-gradient-to-br from-amber-950/60 via-stone-900/90 to-black/90 backdrop-blur-2xl border border-amber-500/30 shadow-2xl text-center flex flex-col items-center space-y-4 font-sans select-none mx-auto">
      
      {/* Camp Emblem / Badge */}
      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl shadow-inner">
        🏕️
      </div>

      {/* Title & Description */}
      <div className="space-y-1">
        <span className="text-[10px] tracking-widest uppercase font-bold text-amber-400/80">
          You&apos;ve Been Invited To
        </span>
        <h3 className="text-xl font-extrabold text-stone-100 tracking-tight">
          {group.name}
        </h3>
        <p className="text-xs text-stone-400 line-clamp-2 px-2">
          &quot;{group.motto || 'Looking out for each other. Building our cozy sanctuary.'}&quot;
        </p>
      </div>

      {/* Member Avatars & Stats */}
      <div className="flex items-center space-x-2 py-2 px-4 rounded-full bg-white/5 border border-white/10 text-xs text-stone-300">
        <div className="flex -space-x-2">
          {group.members.slice(0, 3).map((m, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-amber-600 border border-stone-900 flex items-center justify-center text-[10px] font-bold text-white">
              {m.initial}
            </div>
          ))}
        </div>
        <span className="font-semibold">{group.memberCount} / {group.maxMembers} Campers</span>
      </div>

      {error && (
        <p className="text-xs text-rose-400 font-600">{error}</p>
      )}

      {/* CTA Button */}
      <button
        onClick={handleJoin}
        disabled={isPending}
        className="w-full py-3 rounded-2xl bg-amber-500 text-stone-950 font-bold text-sm shadow-xl hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50"
      >
        {isPending ? 'Joining Camp...' : 'Join This Camp'}
      </button>

      {/* Footer Tagline */}
      <span className="text-[10px] text-stone-500 font-medium">
        It takes a village to stay cozy.
      </span>
    </div>
  );
}
