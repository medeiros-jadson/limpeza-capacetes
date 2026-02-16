'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Instrucoes() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePagar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao criar sessão');
      }
      const { sessionId } = await res.json();
      const payRes = await fetch(`/api/sessions/${sessionId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!payRes.ok) throw new Error('Erro ao gerar pagamento');
      router.push(`/pagamento/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 p-6">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-xl font-bold text-slate-800">Instruções</h1>
        <ol className="list-inside list-decimal space-y-3 text-slate-700">
          <li>Abra a porta da máquina.</li>
          <li>Coloque o capacete no suporte.</li>
          <li>Feche a porta até ouvir o travamento.</li>
          <li>O processo leva cerca de 1 minuto.</li>
        </ol>
        <p className="text-sm text-slate-500">Tempo estimado: ~1 minuto</p>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handlePagar}
          disabled={loading}
          className="mt-auto w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
          style={{ minHeight: '56px' }}
        >
          {loading ? 'Preparando...' : 'Pagar com PIX'}
        </button>
        <Link
          href="/"
          className="text-center text-slate-500 underline"
        >
          Voltar
        </Link>
      </main>
    </div>
  );
}
