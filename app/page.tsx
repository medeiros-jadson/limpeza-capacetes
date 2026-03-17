'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';

const CARD_THEMES = [
  {
    borderColor: 'hsl(var(--neon-blue) / 0.4)',
    priceColor: 'hsl(var(--neon-blue) / 1)',
    gradient: 'linear-gradient(to bottom, hsl(190 100% 50% / 0.1), hsl(210 100% 40% / 0.05))',
  },
  {
    borderColor: 'hsl(var(--neon-purple) / 0.4)',
    priceColor: 'hsl(var(--neon-purple) / 1)',
    gradient: 'linear-gradient(to bottom, hsl(270 60% 50% / 0.15), hsl(250 60% 40% / 0.05))',
  },
  {
    borderColor: 'hsl(var(--neon-cyan) / 0.4)',
    priceColor: 'hsl(var(--neon-cyan) / 1)',
    gradient: 'linear-gradient(to bottom, hsl(180 100% 50% / 0.12), hsl(190 100% 40% / 0.05))',
  },
] as const;

type CleaningTypeItem = {
  id: string;
  name: string;
  price: number;
  durationSeconds: number;
};

type MachineStatus = {
  id: string;
  name: string;
  status: string;
  available: boolean;
  offline: boolean;
  price: number;
};

export default function Home() {
  const [cleaningTypes, setCleaningTypes] = useState<CleaningTypeItem[]>([]);
  const [machineStatus, setMachineStatus] = useState<MachineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [typesRes, machinesRes] = await Promise.all([
          fetch('/api/cleaning-types'),
          fetch('/api/machines'),
        ]);
        if (!typesRes.ok) throw new Error('Tipos indisponíveis');
        const types: CleaningTypeItem[] = await typesRes.json();
        setCleaningTypes(types);

        if (!machinesRes.ok) throw new Error('Máquinas indisponíveis');
        const machines: { id: string; name: string; status: string; lastSeenAt: string | null; price: number }[] = await machinesRes.json();
        if (machines.length === 0) {
          setError('Nenhuma máquina cadastrada');
          setLoading(false);
          return;
        }
        const machine = machines[0];
        const statusRes = await fetch(`/api/machines/${machine.id}/status`);
        if (!statusRes.ok) throw new Error('Status indisponível');
        const data = await statusRes.json();
        setMachineStatus(data);
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
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
        <p className="font-display text-lg text-muted-foreground tracking-wider">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
        <p className="font-display text-lg text-destructive tracking-wider">{error}</p>
      </div>
    );
  }

  const hasTypes = cleaningTypes.length > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10 overflow-auto">
      <div className="flex flex-col items-center w-full max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wider text-foreground text-glow-blue uppercase">
            CLEANCAP
          </h1>
          <p className="mt-2 text-muted-foreground font-display text-sm tracking-widest uppercase">
            {hasTypes ? 'Selecione o modo de limpeza' : 'Higienize seu capacete em poucos minutos'}
          </p>
        </div>

        {hasTypes ? (
          <div className="flex flex-col gap-4 w-full items-center">
            <div className="flex flex-nowrap gap-8 justify-center items-stretch overflow-x-auto pb-2 w-full px-6 py-6">
              {cleaningTypes.map((type, index) => {
                const theme = CARD_THEMES[index % CARD_THEMES.length];
                const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(type.price);
                const minutes = Math.round(type.durationSeconds / 60);
                return (
                  <Link
                    key={type.id}
                    href={`/instrucoes?cleaningTypeId=${encodeURIComponent(type.id)}`}
                    className="group relative flex-shrink-0 flex-1 max-w-xs flex flex-col items-center p-8 rounded-xl border bg-surface transition-all duration-300 hud-corner hover:scale-[1.03]"
                    style={{
                      borderColor: theme.borderColor,
                      background: theme.gradient,
                      boxShadow: `0 0 20px ${theme.borderColor}, inset 0 0 20px hsl(var(--neon-blue) / 0.03)`,
                    }}
                  >
                    {/* Área do ícone (estilo do outro repo) */}
                    <div className="relative mb-6">
                      <div className="w-28 h-28 flex items-center justify-center">
                        <Image src="/helmet-icon.png" alt="Capacete" width={96} height={96} className="w-24 h-24 object-contain" />
                      </div>
                      <div
                        className="absolute inset-0 rounded-full animate-pulse-glow"
                        style={{ boxShadow: `0 0 30px ${theme.borderColor}`, opacity: 0.3 }}
                        aria-hidden
                      />
                    </div>
                    <h2 className="font-display text-lg font-bold tracking-wider text-foreground uppercase mb-3">
                      {type.name}
                    </h2>
                    <p
                      className="font-display text-3xl font-bold tracking-wide mb-2"
                      style={{ color: theme.priceColor }}
                    >
                      {priceFormatted}
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground font-display text-sm tracking-wider">
                      <Clock className="w-4 h-4" />
                      <span>{minutes} minutos</span>
                    </div>
                    {/* Linha de brilho no hover (estilo do outro repo) */}
                    <div
                      className="absolute bottom-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${theme.borderColor}, transparent)` }}
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-md mx-auto">
            <div
              className="group relative w-full flex flex-col items-center p-8 rounded-xl border hud-corner transition-all duration-300 hover:scale-[1.03]"
              style={{
                borderColor: CARD_THEMES[0].borderColor,
                background: CARD_THEMES[0].gradient,
                boxShadow: `0 0 20px ${CARD_THEMES[0].borderColor}, inset 0 0 20px hsl(var(--neon-blue) / 0.03)`,
              }}
            >
              <div className="relative mb-6">
                <div className="w-28 h-28 flex items-center justify-center">
                  <Image src="/helmet-icon.png" alt="Capacete" width={96} height={96} className="w-24 h-24 object-contain" />
                </div>
                <div
                  className="absolute inset-0 rounded-full animate-pulse-glow"
                  style={{ boxShadow: `0 0 30px ${CARD_THEMES[0].borderColor}`, opacity: 0.3 }}
                  aria-hidden
                />
              </div>
              <h2 className="font-display text-lg font-bold tracking-wider text-foreground uppercase mb-3">
                Limpeza de Capacetes
              </h2>
              <p
                className="font-display text-3xl font-bold tracking-wide mb-6"
                style={{ color: CARD_THEMES[0].priceColor }}
              >
                {machineStatus ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(machineStatus.price) : ''}
              </p>
              <div
                className="absolute bottom-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${CARD_THEMES[0].borderColor}, transparent)` }}
                aria-hidden
              />
              <Link
                href="/instrucoes"
                className="w-full rounded-xl py-4 text-center font-display text-lg font-semibold tracking-wider uppercase border border-[hsl(var(--neon-blue)/0.5)] bg-[hsl(var(--neon-blue)/0.1)] text-primary hover:bg-[hsl(var(--neon-blue)/0.2)] transition-all duration-300 glow-blue"
                style={{ minHeight: '56px' }}
              >
                Iniciar limpeza
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
