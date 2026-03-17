'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

const EMOTIONS = [
  { id: 'excelente', label: 'Excelente', emoji: '😃' },
  { id: 'bom', label: 'Bom', emoji: '🙂' },
  { id: 'regular', label: 'Regular', emoji: '😐' },
  { id: 'ruim', label: 'Ruim', emoji: '🙁' },
];

const FEEDBACK_REDIRECT_MS = 1500;
const NO_FEEDBACK_TIMEOUT_MS = 2 * 60 * 1000;

type PageProps = { params: Promise<{ sessionId: string }> };

export default function FinalPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      router.replace('/');
    }, NO_FEEDBACK_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  async function sendFeedback(emotion: string) {
    if (loading || sent) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion }),
      });
      if (res.ok) {
        setSent(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setTimeout(() => router.replace('/'), FEEDBACK_REDIRECT_MS);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10 overflow-auto">
      <div className="max-w-xl text-center w-full">
        <div className="relative mx-auto w-36 h-36 mb-8">
          <div
            className="absolute inset-0 rounded-full border-2 border-[hsl(var(--neon-blue)/0.3)] animate-rotate-ring"
            style={{ borderTopColor: 'hsl(var(--neon-blue))' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle className="w-16 h-16 text-primary animate-pulse-glow" />
          </div>
          <div className="absolute inset-0 rounded-full bg-[hsl(var(--neon-blue)/0.06)] blur-xl" />
        </div>

        <h1 className="font-display text-2xl font-bold tracking-wider text-foreground text-glow-blue uppercase mb-4">
          Limpeza finalizada
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          Por favor retire o capacete e feche a porta.
        </p>
        <p className="text-foreground font-display tracking-wide mb-4">Como foi sua experiência?</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {EMOTIONS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => sendFeedback(e.id)}
              disabled={loading || sent}
              className="flex flex-col items-center gap-1 rounded-xl border border-[hsl(var(--neon-blue)/0.3)] bg-surface py-4 text-lg transition hover:bg-[hsl(var(--neon-blue)/0.08)] disabled:opacity-50"
            >
              <span>{e.emoji}</span>
              <span className="text-sm font-display tracking-wider">{e.label}</span>
            </button>
          ))}
        </div>
        {sent && (
          <p className="text-primary font-display tracking-wider mb-6">Obrigado pelo feedback! Redirecionando...</p>
        )}
      </div>
    </div>
  );
}
