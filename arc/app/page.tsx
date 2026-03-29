'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useArcStore } from '@/lib/store';

export default function LandingPage() {
  const router = useRouter();
  const reset = useArcStore((s) => s.reset);
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-GB', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).toLowerCase()
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBegin = () => {
    reset();
    router.push('/chat');
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 relative"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #FAF7F2 0%, #E8DFD0 100%)',
      }}
    >
      <h1
        className="text-center leading-[1.4] tracking-[0.01em]"
        style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', maxWidth: '600px' }}
      >
        Every life has a shape.
        <br />
        Let&rsquo;s find yours.
      </h1>
      <button
        onClick={handleBegin}
        className="mt-12 font-ui text-text-primary cursor-pointer transition-all duration-300 ease-in-out hover:text-text-secondary"
        style={{ fontSize: '0.85rem', letterSpacing: '0.05em', background: 'none', border: 'none' }}
      >
        [ enter the clearing ]
      </button>

      {/* Ambient data */}
      <span
        className="absolute bottom-6 left-6 font-ui text-text-muted"
        style={{ fontSize: '0.7rem' }}
      >
        1,248 stories reflected
      </span>
      <span
        className="absolute bottom-6 right-6 font-ui text-text-muted"
        style={{ fontSize: '0.7rem' }}
      >
        {time}
      </span>
    </div>
  );
}
