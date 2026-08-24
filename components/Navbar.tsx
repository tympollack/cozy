import Link from 'next/link';
import { Home, Camera, User, Users } from 'lucide-react';
import { PointsBadge } from '@/components/PointsBadge';
import { VibePill } from '@/components/VibePill';
import { createServerClient } from '@/lib/supabase';

export async function Navbar() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="fixed top-0 inset-x-0 z-50 shrink-0 backdrop-blur-md bg-white/20 dark:bg-black/40 border-b border-white/20 shadow-lg">
      <nav
        className="mx-auto max-w-lg px-4 h-14 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <Link
          href="/feed"
          id="nav-brand"
          className="text-lg font-800 text-gradient tracking-tight"
          aria-label="Cozy — go to feed"
        >
          cozy
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/feed"
            id="nav-feed"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-500
              text-[--cozy-bark] hover:bg-amber-50 transition-colors duration-150"
            aria-label="Feed"
          >
            <Home size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Feed</span>
          </Link>

          <Link
            href={user ? "/camera" : "/login?next=/camera"}
            id="nav-camera"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-500
              text-[--cozy-bark] hover:bg-amber-50 transition-colors duration-150"
            aria-label="Upload a photo"
          >
            <Camera size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Upload</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/groups"
                id="nav-groups"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-500
                  text-[--cozy-bark] hover:bg-amber-50 transition-colors duration-150"
                aria-label="My Groups"
              >
                <Users size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Village</span>
              </Link>
              <Link
                href="/profile"
                id="nav-profile"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-500
                  text-[--cozy-bark] hover:bg-amber-50 transition-colors duration-150"
                aria-label="My Spaces"
              >
                <User size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Me</span>
              </Link>
              <VibePill />
              <PointsBadge />
            </>
          ) : (
            <Link
              href="/login?next=/feed"
              className="ml-2 text-sm font-700 bg-[--cozy-bark] text-white px-4 py-1.5 rounded-full hover:scale-105 transition-transform"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

