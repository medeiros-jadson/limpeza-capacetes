import type { Metadata } from 'next';
import './globals.css';
import ParticleBackground from './components/ParticleBackground';
import StatusBar from './components/StatusBar';

export const metadata: Metadata = {
  title: 'Limpeza de Capacetes',
  description: 'Serviço de limpeza de capacetes com pagamento PIX',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <div className="h-screen flex flex-col overflow-hidden relative">
          <ParticleBackground />
          <StatusBar />
          {children}
        </div>
      </body>
    </html>
  );
}
