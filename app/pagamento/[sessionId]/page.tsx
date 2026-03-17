'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Clock, Tag } from 'lucide-react';

type PaymentState = 'pending' | 'approved' | 'expired' | 'loading' | 'error';

type PageProps = { params: Promise<{ sessionId: string }> };

export default function PagamentoPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<PaymentState>('loading');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionPrice, setSessionPrice] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
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
      setSessionPrice(session.price != null ? Number(session.price) : null);
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
    router.push(`/sucesso/${sessionId}`);
  }, [status, sessionId, router]);

  useEffect(() => {
    if (!expiresAt || status !== 'pending') return;
    const update = () => {
      const t = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setCountdown(t);
      if (t <= 0) setStatus('expired');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt, status]);

  // Polling automático do status (quando não há webhook, ex.: uso por IP)
  useEffect(() => {
    if (status !== 'pending' || !qrCode) return;
    const check = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/payment-status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'approved') setStatus('approved');
      } catch { }
    };
    const t0 = setTimeout(check, 1500);
    const interval = setInterval(check, 4000);
    return () => {
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [sessionId, status, qrCode]);

  useEffect(() => {
    if (status !== 'expired') return;
    const t = setTimeout(() => router.replace('/'), 2000);
    return () => clearTimeout(t);
  }, [status, router]);

  if (status === 'loading' || status === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
        <p className="font-display text-lg text-muted-foreground tracking-wider">
          {status === 'error' ? 'Erro ao carregar pagamento.' : 'Carregando...'}
        </p>
        <Link href="/" className="mt-4 font-display text-sm text-primary uppercase tracking-wider underline">
          Voltar
        </Link>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
        <p className="font-display text-lg text-primary tracking-wider">Pagamento confirmado! Redirecionando...</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-6 relative z-10">
        <p className="font-display text-lg text-destructive tracking-wider">Pagamento expirado.</p>
        <p className="text-sm text-muted-foreground">Redirecionando para a tela inicial...</p>
      </div>
    );
  }

  const priceFormatted =
    sessionPrice != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sessionPrice)
      : '';
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground text-glow-blue uppercase">
            Pagamento PIX
          </h1>
          <p className="mt-1 font-display text-sm tracking-wider text-muted-foreground uppercase">
            Limpeza de capacetes — {priceFormatted}
          </p>
        </div>

        <div
          className="relative p-2 rounded-xl mb-6 animate-progress-glow border-2 border-[hsl(var(--neon-blue)/0.5)]"
        >
          <div className="hud-corner bg-surface rounded-lg p-6 flex flex-col items-center">
            {qrCode ? (
              <div className="rounded-lg overflow-hidden bg-white p-3">
                <QRCodeSVG value={qrCode} size={220} level="M" includeMargin={false} />
              </div>
            ) : (
              <div className="w-52 h-52 grid grid-cols-11 gap-0.5">
                {Array.from({ length: 121 }, (_, i) => (
                  <div
                    key={i}
                    className={`rounded-sm ${i % 3 === 0 || (i + Math.floor(i / 11)) % 2 === 0 ? 'bg-foreground' : 'bg-transparent'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center mb-6 space-y-2">
          <p className="text-foreground font-display tracking-wide">
            Escaneie o QR Code com seu aplicativo de banco
          </p>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Clock className="w-5 h-5" />
            <span className="font-display text-xl font-bold tracking-widest text-glow-blue">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Tempo restante para pagamento</p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-2.5 rounded border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.05)] hover:bg-[hsl(var(--neon-blue)/0.15)] transition-all duration-300 font-display text-sm tracking-wider text-primary uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <button
            type="button"
            onClick={() => setCouponOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.05)] hover:bg-[hsl(var(--neon-blue)/0.15)] transition-all duration-300 font-display text-sm tracking-wider text-primary uppercase"
          >
            <Tag className="w-4 h-4" />
            Inserir Cupom
          </button>
        </div>
      </div>

      {couponOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => { setCouponOpen(false); setCouponError(null); }}>
          <div
            className="bg-surface border border-[hsl(var(--neon-blue)/0.3)] rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display tracking-wider text-foreground uppercase mb-2">Cupom Promocional</h3>
            <p className="text-muted-foreground text-sm mb-4">Insira seu código de cupom abaixo</p>
            {couponError && (
              <p className="text-destructive text-sm mb-3">{couponError}</p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                placeholder="Digite o cupom"
                className="flex-1 rounded border border-[hsl(var(--neon-blue)/0.3)] bg-background px-3 py-2 text-foreground font-display tracking-wider uppercase placeholder:text-muted-foreground"
              />
              <button
                type="button"
                disabled={applyingCoupon || !couponCode.trim()}
                onClick={async () => {
                  setCouponError(null);
                  setApplyingCoupon(true);
                  try {
                    const res = await fetch(`/api/sessions/${sessionId}/apply-coupon`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: couponCode.trim() }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setCouponError(data.error || 'Erro ao aplicar cupom');
                      return;
                    }
                    if (data.applied && data.redirectToProgress) {
                      setStatus('approved');
                      setCouponOpen(false);
                      return;
                    }
                    if (data.applied && data.qrCode) {
                      setQrCode(data.qrCode);
                      setExpiresAt(data.expiresAt ?? null);
                      if (data.finalPriceReais != null) setSessionPrice(data.finalPriceReais);
                      setCouponCode('');
                      setCouponOpen(false);
                      return;
                    }
                    setCouponError(data.error || 'Cupom inválido');
                  } catch {
                    setCouponError('Erro ao aplicar cupom');
                  } finally {
                    setApplyingCoupon(false);
                  }
                }}
                className="px-4 py-2 rounded border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.1)] hover:bg-[hsl(var(--neon-blue)/0.2)] transition-all duration-300 font-display text-sm tracking-wider text-primary uppercase whitespace-nowrap disabled:opacity-50"
              >
                {applyingCoupon ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
