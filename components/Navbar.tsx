import Link from 'next/link';
import { Home, Camera, User, Users, Settings } from 'lucide-react';
import { PointsBadge } from '@/components/PointsBadge';
import { VibePill } from '@/components/VibePill';
import { createServerClient } from '@/lib/supabase';

export async function Navbar() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="fixed top-0 inset-x-0 z-50 shrink-0 backdrop-blur-md bg-[#faf7f2]/90 dark:bg-[#16110e]/95 border-b border-amber-900/10 dark:border-amber-500/20 shadow-xs transition-colors">
      <nav
        className="mx-auto max-w-lg px-4 h-14 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <Link
          href="/feed"
          id="nav-brand"
          className="text-xl font-900 text-[var(--cozy-rust)] dark:text-[var(--cozy-amber)] tracking-tight hover:opacity-90 transition-opacity"
          aria-label="Cozy — go to feed"
        >
          cozy
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/feed"
            id="nav-feed"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-700
              text-[var(--cozy-text-secondary)] hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-colors duration-150"
            aria-label="Feed"
          >
            <Home size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Feed</span>
          </Link>

          <Link
            href={user ? "/camera" : "/login?next=/camera"}
            id="nav-camera"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-700
              text-[var(--cozy-text-secondary)] hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-colors duration-150"
            aria-label="Upload a photo"
          >
            <Camera size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Upload</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/groups"
                id="nav-groups"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-700
                  text-[var(--cozy-text-secondary)] hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-colors duration-150"
                aria-label="My Groups"
              >
                <Users size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Village</span>
              </Link>
              <Link
                href="/profile"
                id="nav-profile"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-700
                  text-[var(--cozy-text-secondary)] hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-colors duration-150"
                aria-label="My Spaces"
              >
                <User size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Me</span>
              </Link>
              <VibePill />
              <PointsBadge />
              <Link
                href="/settings"
                id="nav-settings"
                className="p-2 rounded-xl text-[var(--cozy-text-secondary)] hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-colors duration-150"
                aria-label="Settings"
                title="Settings & Hub Options"
              >
                <Settings size={16} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <Link
              href="/login?next=/feed"
              className="ml-2 text-xs font-800 bg-[var(--cozy-rust)] text-white px-4 py-2 rounded-full hover:scale-105 transition-transform shadow-xs"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

