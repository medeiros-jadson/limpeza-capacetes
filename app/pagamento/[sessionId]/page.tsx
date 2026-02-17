'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type PaymentState = 'pending' | 'approved' | 'expired' | 'loading' | 'error';

export default function PagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [status, setStatus] = useState<PaymentState>('loading');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'event' && data.event === 'PAID') {
          setStatus('approved');
          es.close();
        }
      } catch { }
    };
    es.onerror = () => es.close();

    async function init() {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const session = await res.json();
      if (session.status === 'PAID' || session.status === 'RUNNING') {
        setStatus('approved');
        return;
      }
      const payRes = await fetch(`/api/sessions/${sessionId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!payRes.ok) {
        setStatus('error');
        return;
      }
      const pay = await payRes.json();
      setQrCode(pay.qrCode ?? null);
      setExpiresAt(pay.expiresAt ?? null);
      setStatus(pay.status === 'approved' ? 'approved' : 'pending');
    }
    init();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [sessionId]);

  useEffect(() => {
    if (status !== 'approved') return;
    router.push(`/progresso/${sessionId}`);
  }, [status, sessionId, router]);

  useEffect(() => {
    if (!expiresAt || status !== 'pending') return;
    const t = new Date(expiresAt).getTime() - Date.now();
    if (t <= 0) {
      setStatus('expired');
      return;
    }
    const id = setTimeout(() => setStatus('expired'), t);
    return () => clearTimeout(id);
  }, [expiresAt, status]);

  if (status === 'loading' || status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
        <p className="text-lg text-slate-600">
          {status === 'error' ? 'Erro ao carregar pagamento.' : 'Carregando...'}
        </p>
        <Link href="/instrucoes" className="mt-4 text-emerald-600 underline">Voltar</Link>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
        <p className="text-lg font-medium text-green-600">Pagamento confirmado! Redirecionando...</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-6">
        <p className="text-lg text-amber-700">Pagamento expirado.</p>
        <Link href="/instrucoes" className="rounded-xl bg-emerald-600 px-6 py-3 text-white">Tentar novamente</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-100 p-6">
      <main className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-xl font-bold text-slate-800">Pague com PIX</h1>
        <p className="text-slate-600">Escaneie o QR Code no app do seu banco.</p>
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-4">
          {qrCode ? (
            <p className="break-all text-xs text-slate-500">Código PIX (copiar e colar): {qrCode.slice(0, 60)}...</p>
          ) : (
            <p className="text-slate-400">QR Code será exibido aqui (integre um gerador de QR no front)</p>
          )}
        </div>
        <p className="text-center text-sm text-slate-500">Aguardando pagamento...</p>
        {expiresAt && (
          <p className="text-center text-xs text-slate-400">
            Expira em {new Date(expiresAt).toLocaleTimeString('pt-BR')}
          </p>
        )}
        <Link href="/instrucoes" className="text-center text-slate-500 underline">Cancelar</Link>

        <button
          type="button"
          onClick={async () => {
            await fetch(`/api/sessions/${sessionId}/simulate-payment`, { method: 'POST' });
            setStatus('approved');
          }}
          className="rounded border border-amber-500 bg-amber-50 py-2 text-amber-800"
        >
          Simular pagamento
        </button>
      </main>
    </div>
  );
}
