'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Radiation, CheckCircle2 } from 'lucide-react';

/** Só exibe etapas após a porta fechada (ciclo e porta já foram na tela de sucesso). */
const STEPS = [
  { id: 'uv', label: 'Limpeza UV', desc: 'Esterilização em andamento', events: ['UV_ON', 'UV_OFF'], icon: Radiation },
  { id: 'finish', label: 'Finalização', desc: 'Concluído', events: ['FINISHED'], icon: CheckCircle2 },
];

type PageProps = { params: Promise<{ sessionId: string }> };

export default function ProgressoPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsSeen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    eventSourceRef.current = es;

    if (process.env.NODE_ENV === 'development') {
      fetch(`/api/sessions/${sessionId}/simulate-cycle-complete`, { method: 'POST' }).catch(() => {});
    }

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'event') {
          const ev = data.event as string;
          if (ev === 'PAID') setPaid(true);
          if (ev === 'FINISHED') {
            es.close();
            router.push(`/final/${sessionId}`);
            return;
          }
          if (ev === 'ERROR') {
            setError('Ocorreu um erro no ciclo.');
            return;
          }
          if (eventsSeen.current.has(ev)) return;
          eventsSeen.current.add(ev);
          if (ev === 'UV_ON') setCurrentStep(0);
          else if (ev === 'UV_OFF') setCurrentStep(1);
        }
      } catch { }
    };
    es.onerror = () => es.close();

    async function checkSession() {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) return;
      const s = await res.json();
      if (s.status === 'PAID' || s.status === 'RUNNING') setPaid(true);
      if (s.status === 'FINISHED') router.push(`/final/${sessionId}`);
    }
    checkSession();

    return () => eventSourceRef.current?.close();
  }, [sessionId, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10 overflow-auto">
      <div className="relative w-32 h-32 mb-6">
        <div
          className="absolute inset-0 rounded-full border-2 border-[hsl(var(--neon-blue)/0.2)] animate-rotate-ring"
          style={{ borderTopColor: 'hsl(var(--neon-blue))', borderRightColor: 'hsl(var(--neon-blue)/0.5)' }}
        />
        <div
          className="absolute inset-3 rounded-full border border-[hsl(var(--neon-purple)/0.3)] animate-rotate-ring"
          style={{ animationDirection: 'reverse', animationDuration: '3s', borderBottomColor: 'hsl(var(--neon-purple))' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Image src="/helmet-icon.png" alt="Capacete" width={96} height={96} className="w-16 h-16 object-contain" />
        </div>
        <div className="absolute inset-0 rounded-full bg-[hsl(var(--neon-blue)/0.06)] blur-2xl animate-pulse-glow" aria-hidden />
      </div>

      <h2 className="font-display text-xl font-bold tracking-wider text-foreground text-glow-blue uppercase mb-6">
        Limpeza em andamento
      </h2>

      {error && <p className="text-destructive font-display text-sm mb-4">{error}</p>}

      <div className="flex gap-5 w-full max-w-4xl flex-wrap justify-center">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;

          return (
            <div
              key={step.id}
              className={`flex-1 min-w-[140px] flex flex-col items-center p-6 pt-7 rounded-xl border transition-all duration-500 ${
                isActive
                  ? 'border-[hsl(var(--neon-blue)/0.6)] bg-[hsl(var(--neon-blue)/0.08)] glow-blue'
                  : isDone
                    ? 'border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.04)]'
                    : 'border-[hsl(var(--border))] bg-surface'
              }`}
            >
              <Icon
                className={`w-12 h-12 mb-3 transition-opacity duration-300 ${
                  isActive ? 'text-primary opacity-100' : isDone ? 'text-primary opacity-60' : 'text-muted-foreground opacity-40'
                }`}
              />
              <span
                className={`font-display text-xs tracking-wider uppercase whitespace-nowrap text-center ${
                  isActive ? 'text-primary' : isDone ? 'text-primary opacity-60' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
              <span className={`text-[10px] tracking-wide text-center mt-1 mb-2 max-w-[120px] leading-tight ${
                isActive ? 'text-primary/80' : isDone ? 'text-primary/50' : 'text-muted-foreground'
              }`}>
                {step.desc}
              </span>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-auto">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDone ? 'bg-primary w-full' : isActive ? 'bg-primary animate-progress-glow animate-progress-bar' : 'w-0'
                  }`}
                  style={isDone ? { width: '100%' } : isActive ? {} : { width: 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
