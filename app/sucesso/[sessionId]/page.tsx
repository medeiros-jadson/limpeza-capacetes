'use client';

import { use, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

type PageProps = { params: Promise<{ sessionId: string }> };

export default function SucessoPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'event' && data.event === 'PORTA_FECHADA') {
          es.close();
          router.replace(`/progresso/${sessionId}`);
        }
      } catch { }
    };
    es.onerror = () => es.close();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [sessionId, router]);

  async function handleSimularFechamento() {
    await fetch(`/api/sessions/${sessionId}/simulate-door-closed`, { method: 'POST' });
    router.replace(`/progresso/${sessionId}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
      <div className="max-w-xl text-center">
        <div className="relative mx-auto w-40 h-40 mb-8">
          <div
            className="absolute inset-0 rounded-full border-2 border-[hsl(var(--neon-blue)/0.3)] animate-rotate-ring"
            style={{ borderTopColor: 'hsl(var(--neon-blue))' }}
          />
          <div
            className="absolute inset-3 rounded-full border border-[hsl(var(--neon-purple)/0.2)] animate-rotate-ring"
            style={{ animationDirection: 'reverse', animationDuration: '3s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle className="w-16 h-16 text-primary animate-pulse-glow" />
          </div>
          <div className="absolute inset-0 rounded-full bg-[hsl(var(--neon-blue)/0.08)] blur-xl" />
        </div>

        <h1 className="font-display text-2xl font-bold tracking-wider text-foreground text-glow-blue uppercase mb-4">
          Pagamento efetuado com sucesso
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          Coloque o capacete dentro do compartimento e feche a porta.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <button
            type="button"
            onClick={handleSimularFechamento}
            className="px-6 py-2.5 rounded border border-[hsl(var(--neon-purple)/0.3)] bg-[hsl(var(--neon-purple)/0.08)] hover:bg-[hsl(var(--neon-purple)/0.2)] transition-all duration-300 font-display text-xs tracking-wider text-muted-foreground uppercase opacity-60 hover:opacity-100"
          >
            Simular fechamento
          </button>
        )}
      </div>
    </div>
  );
}
