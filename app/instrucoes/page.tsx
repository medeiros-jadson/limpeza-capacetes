'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

type SearchParamsRecord = { [key: string]: string | string[] | undefined };

function getCleaningTypeId(searchParams: SearchParamsRecord): string | undefined {
  const raw = searchParams.cleaningTypeId;
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
}

function InstrucoesContent({
  searchParams,
}: {
  searchParams: SearchParamsRecord;
}) {
  const router = useRouter();
  const cleaningTypeId = getCleaningTypeId(searchParams);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cleaningTypeId: cleaningTypeId || undefined }),
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Erro ao criar sessão');
          return;
        }
        const { sessionId } = await res.json();
        const payRes = await fetch(`/api/sessions/${sessionId}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (cancelled) return;
        if (!payRes.ok) {
          setError('Erro ao gerar pagamento');
          return;
        }
        router.replace(`/pagamento/${sessionId}`);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro');
      }
    })();
    return () => { cancelled = true; };
  }, [cleaningTypeId, router]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10 gap-4">
        <p className="font-display text-lg text-destructive tracking-wider">{error}</p>
        <Link
          href="/"
          className="rounded-xl border border-[hsl(var(--neon-blue)/0.5)] bg-[hsl(var(--neon-blue)/0.1)] px-6 py-3 font-display text-primary uppercase tracking-wider"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
      <p className="font-display text-lg text-muted-foreground tracking-wider">Preparando pagamento...</p>
    </div>
  );
}

type PageProps = { searchParams: Promise<SearchParamsRecord> };

export default function Instrucoes({ searchParams }: PageProps) {
  const resolved = use(searchParams);
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
        <p className="font-display text-lg text-muted-foreground tracking-wider">Carregando...</p>
      </div>
    }>
      <InstrucoesContent searchParams={resolved} />
    </Suspense>
  );
}
