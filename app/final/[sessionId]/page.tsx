'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const EMOTIONS = [
  { id: 'excelente', label: 'Excelente', emoji: '😃' },
  { id: 'bom', label: 'Bom', emoji: '🙂' },
  { id: 'regular', label: 'Regular', emoji: '😐' },
  { id: 'ruim', label: 'Ruim', emoji: '🙁' },
];

export default function FinalPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendFeedback(emotion: string) {
    if (loading || sent) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion }),
      });
      if (res.ok) setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 p-6">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-xl font-bold text-slate-800">Limpeza concluída</h1>
        <p className="text-slate-600">Retire seu capacete e feche a porta.</p>
        <p className="text-slate-600">Como foi sua experiência?</p>
        <div className="grid grid-cols-2 gap-3">
          {EMOTIONS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => sendFeedback(e.id)}
              disabled={loading || sent}
              className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 py-4 text-lg transition hover:bg-slate-50 disabled:opacity-50"
            >
              <span>{e.emoji}</span>
              <span className="text-sm font-medium">{e.label}</span>
            </button>
          ))}
        </div>
        {sent && <p className="text-center text-green-600">Obrigado pelo feedback!</p>}
        <Link
          href="/"
          className="mt-auto w-full rounded-xl bg-emerald-600 py-4 text-center text-lg font-semibold text-white"
        >
          Iniciar nova limpeza
        </Link>
      </main>
    </div>
  );
}
