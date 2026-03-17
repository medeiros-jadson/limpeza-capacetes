'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wifi, HelpCircle } from 'lucide-react';

export default function StatusBar() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(() => new Date(0));
  const [offline, setOffline] = useState<boolean | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const machinesRes = await fetch('/api/machines');
        if (!machinesRes.ok || cancelled) return;
        const machines: { id: string }[] = await machinesRes.json();
        if (machines.length === 0) {
          if (!cancelled) {
            setOffline(true);
            setAvailable(null);
          }
          return;
        }
        const statusRes = await fetch(`/api/machines/${machines[0].id}/status`);
        if (!statusRes.ok || cancelled) return;
        const data = await statusRes.json();
        if (!cancelled) {
          setOffline(data.offline === true);
          setAvailable(typeof data.available === 'boolean' ? data.available : null);
        }
      } catch {
        if (!cancelled) {
          setOffline(true);
          setAvailable(null);
        }
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const formattedDate = mounted
    ? time.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';
  const formattedTime = mounted
    ? time.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '00:00:00';

  const showFaq = pathname === '/' || (pathname?.startsWith('/pagamento/') ?? false);
  const connected = offline === false;
  const machineAvailable = available === true;
  const statusLabel = offline === null ? '...' : connected ? 'Conectado' : 'Sem conexão';
  const availableLabel = available === null ? '...' : machineAvailable ? 'Disponível' : 'Ocupada';

  return (
    <div className="relative z-50 flex items-center justify-between px-8 py-3 bg-[hsl(235,40%,6%/0.9)] backdrop-blur-md border-b border-[hsl(var(--neon-blue)/0.2)]">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-neon-blue to-transparent opacity-50" />
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Wifi className={`w-5 h-5 ${connected ? 'text-neon-blue' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-display tracking-wider uppercase ${connected ? 'text-primary' : 'text-muted-foreground'}`}>
            {statusLabel}
          </span>
        </div>
        <span className={`text-sm font-display tracking-wider uppercase ${machineAvailable ? 'text-primary' : 'text-muted-foreground'}`}>
          {machineAvailable ? '●' : '○'} {availableLabel}
        </span>
      </div>
      <div className="flex items-center gap-2 font-display">
        <span className="text-sm tracking-wider text-muted-foreground capitalize">{formattedDate}</span>
        <span className="text-sm text-primary font-semibold tracking-widest text-glow-blue">{formattedTime}</span>
      </div>
      {showFaq ? (
        <Link
          href="/faq"
          className="flex items-center gap-2 px-4 py-1.5 rounded border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.05)] font-display text-sm tracking-wider uppercase transition-all duration-300 text-primary hover:bg-[hsl(var(--neon-blue)/0.15)] hover:glow-blue cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          Perguntas Frequentes
        </Link>
      ) : (
        <span className="flex items-center gap-2 px-4 py-1.5 rounded border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.05)] font-display text-sm tracking-wider uppercase text-muted-foreground opacity-30 cursor-not-allowed">
          <HelpCircle className="w-4 h-4" />
          Perguntas Frequentes
        </span>
      )}
    </div>
  );
}
