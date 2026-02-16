'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type MachineStatus = {
  id: string;
  name: string;
  status: string;
  available: boolean;
  offline: boolean;
  priceCents: number;
};

export default function Home() {
  const [status, setStatus] = useState<MachineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/machines');
        if (!res.ok) throw new Error('Máquinas indisponíveis');
        const machines: { id: string; name: string; status: string; lastSeenAt: string | null; priceCents: number }[] = await res.json();
        if (machines.length === 0) {
          setError('Nenhuma máquina cadastrada');
          setLoading(false);
          return;
        }
        const machine = machines[0];
        const statusRes = await fetch(`/api/machines/${machine.id}/status`);
        if (!statusRes.ok) throw new Error('Status indisponível');
        const data = await statusRes.json();
        setStatus(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
        <p className="text-lg text-slate-600">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
        <p className="text-lg text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
      <main className="flex w-full max-w-md flex-col items-center gap-8 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Limpeza de Capacetes</h1>
          <p className="mt-2 text-slate-600">Higienize seu capacete em poucos minutos.</p>
        </div>

        <div className="flex gap-4 text-sm text-slate-500">
          <span className={status?.offline === false ? 'text-green-600' : ''}>
            {status?.offline === false ? '● Conectado' : '○ Sem conexão'}
          </span>
          <span className={status?.available ? 'text-green-600' : 'text-amber-600'}>
            {status?.available ? '● Máquina disponível' : '○ Máquina ocupada'}
          </span>
        </div>

        <Link
          href="/instrucoes"
          className="w-full rounded-xl bg-emerald-600 py-4 text-center text-lg font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
          style={{ minHeight: '56px' }}
        >
          Iniciar limpeza
        </Link>
      </main>
    </div>
  );
}
