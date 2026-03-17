import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-10">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-foreground text-glow-blue mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Página não encontrada.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.05)] hover:bg-[hsl(var(--neon-blue)/0.15)] font-display text-sm tracking-wider text-primary uppercase transition-all duration-300"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
