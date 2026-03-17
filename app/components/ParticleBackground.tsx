'use client';

import { useMemo, useState, useEffect } from 'react';

export default function ParticleBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(
    () =>
      mounted
        ? Array.from({ length: 30 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            delay: `${Math.random() * 6}s`,
            duration: `${4 + Math.random() * 4}s`,
            size: `${2 + Math.random() * 3}px`,
          }))
        : [],
    [mounted]
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute inset-0 bg-linear-to-br from-[hsl(235,45%,5%)] via-[hsl(250,40%,8%)] to-[hsl(220,45%,6%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[hsl(var(--neon-blue)/0.04)] blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[hsl(var(--neon-purple)/0.04)] blur-3xl" />
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-neon-blue animate-float-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: 0,
          }}
        />
      ))}
      <div className="absolute inset-0 scanline opacity-30" />
    </div>
  );
}
