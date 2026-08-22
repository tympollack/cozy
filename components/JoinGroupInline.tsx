'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Key, AlertCircle } from 'lucide-react';
import { joinGroup } from '@/app/actions/groupActions';

export function JoinGroupInline() {
  const [code, setCode] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter an invite code.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await joinGroup(code);
      if (!result.success) {
        setError(result.error ?? 'Failed to join group.');
        return;
      }
      router.refresh();
      if (result.groupId) {
        router.push(`/groups/${result.groupId}`);
      }
    });
  }

  return (
    <form onSubmit={handleJoin} className="space-y-3 w-full">
      <div className="space-y-1">
        <input
          type="text"
          placeholder="Enter 8-digit invite code"
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase())}
          maxLength={8}
          className="w-full rounded-2xl px-4 py-3 text-center text-sm font-800 tracking-widest outline-none bg-white dark:bg-zinc-900 border border-amber-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 placeholder:font-500 placeholder:tracking-normal shadow-sm"
        />
        {error && (
          <p className="text-xs text-rose-500 font-600 flex items-center justify-center gap-1 pt-1">
            <AlertCircle size={13} />
            <span>{error}</span>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || code.trim().length === 0}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-800 text-white shadow-md transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
        }}
      >
        <Key size={15} />
        <span>{isPending ? 'Joining…' : 'Join with Invite Code'}</span>
      </button>
    </form>
  );
}
