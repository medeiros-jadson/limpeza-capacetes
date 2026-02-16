'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

const STEPS = [
  { id: 'prep', label: 'Preparação', events: ['STARTED'] },
  { id: 'lock', label: 'Travamento / segurança', events: ['PORTA_ABERTA', 'PORTA_FECHADA'] },
  { id: 'uv', label: 'Limpeza UV', events: ['UV_ON', 'UV_OFF'] },
  { id: 'finish', label: 'Finalização', events: ['FINISHED'] },
];

export default function ProgressoPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [currentStep, setCurrentStep] = useState(0);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsSeen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'event') {
          const ev = data.event as string;
          if (ev === 'PAID') setPaid(true);
          if (eventsSeen.current.has(ev)) return;
          eventsSeen.current.add(ev);
          for (let i = 0; i < STEPS.length; i++) {
            if (STEPS[i].events.includes(ev)) {
              setCurrentStep((s) => Math.max(s, i + 1));
              break;
            }
          }
          if (ev === 'FINISHED') {
            es.close();
            router.push(`/final/${sessionId}`);
          }
          if (ev === 'ERROR') setError('Ocorreu um erro no ciclo.');
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
    <div className="flex min-h-screen flex-col bg-slate-100 p-6">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-xl font-bold text-slate-800">Progresso</h1>
        {!paid && (
          <p className="text-amber-700">Aguardando confirmação do pagamento e início da máquina...</p>
        )}
        {error && <p className="text-red-600">{error}</p>}
        <ul className="space-y-4">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              className={`flex items-center gap-3 rounded-lg border p-4 ${i < currentStep ? 'border-emerald-500 bg-emerald-50' : i === currentStep ? 'border-emerald-300 bg-slate-50' : 'border-slate-200'
                }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium">
                {i < currentStep ? '✓' : i + 1}
              </span>
              <span className={i <= currentStep ? 'font-medium text-slate-800' : 'text-slate-500'}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
