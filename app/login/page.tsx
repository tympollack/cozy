import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — Cozy',
  description: 'Sign in to share your space and earn points on Cozy.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 50%, #fae8d4 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4" role="img" aria-label="House with heart">🏡</div>
          <h1 className="text-4xl font-800 text-gradient mb-2">cozy</h1>
          <p className="text-[--cozy-muted] text-base leading-relaxed">
            Share your space. Earn good vibes.<br/>
            A positivity-only home community.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
