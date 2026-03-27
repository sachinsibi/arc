'use client';

import { useRouter } from 'next/navigation';
import { useArcStore } from '@/lib/store';

export default function LandingPage() {
  const router = useRouter();
  const reset = useArcStore((s) => s.reset);

  const handleBegin = () => {
    reset();
    router.push('/chat');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <h1
        className="text-center leading-[1.4] tracking-[0.01em]"
        style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', maxWidth: '600px' }}
      >
        Every life has an arc.
        <br />
        Let&rsquo;s find yours.
      </h1>
      <button
        onClick={handleBegin}
        className="mt-12 px-8 py-3 border border-accent bg-transparent text-text-primary cursor-pointer transition-all duration-300 ease-in-out hover:bg-accent hover:text-white"
        style={{ fontFamily: 'Georgia, serif', fontSize: '1rem' }}
      >
        Begin
      </button>
    </div>
  );
}
