'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const faqs = [
  { q: 'Como funciona a limpeza do capacete?', a: 'Nossa máquina realiza uma higienização completa em várias etapas automáticas. O capacete passa por esterilização UV, desinfecção, secagem e aromatização, eliminando odores e microrganismos.' },
  { q: 'A higienização realmente funciona?', a: 'Sim. O processo elimina até 99% dos germes e bactérias, ajudando a manter o capacete mais limpo, seguro e livre de odores.' },
  { q: 'Qual a diferença entre os modos de limpeza?', a: 'A diferença entre os modos é apenas o tempo de duração. Todos passam pelas mesmas etapas: Esterilização UV, Desinfecção, Secagem e Aromatização. Quanto maior o tempo, mais intensa será a higienização.' },
  { q: 'Posso limpar qualquer tipo de capacete?', a: 'Sim. A máquina foi projetada para higienizar a maioria dos capacetes, incluindo capacetes de moto, bicicleta e esportivos. Evite colocar objetos soltos dentro do capacete.' },
  { q: 'A limpeza molha o capacete?', a: 'Não. O processo utiliza tecnologias de desinfecção e secagem controlada, garantindo que o capacete saia seco e pronto para uso.' },
  { q: 'O capacete pode ser danificado?', a: 'Não. A máquina foi desenvolvida para higienizar capacetes com segurança, utilizando métodos apropriados para materiais internos e externos.' },
  { q: 'Posso limpar mais de um capacete ao mesmo tempo?', a: 'Não. A máquina foi projetada para um capacete por ciclo de limpeza.' },
  { q: 'Como faço o pagamento?', a: 'Atualmente aceitamos pagamento via PIX. Basta escanear o QR Code exibido na tela e realizar o pagamento.' },
  { q: 'O que acontece depois do pagamento?', a: 'Após a confirmação do pagamento: Abra o compartimento, Coloque o capacete dentro, Feche a porta. A máquina iniciará automaticamente o processo de higienização.' },
  { q: 'Preciso esperar a limpeza terminar?', a: 'Sim. O processo leva apenas alguns minutos dependendo do modo escolhido. Ao finalizar, a tela irá informar quando retirar o capacete.' },
  { q: 'Meu pagamento não foi reconhecido, o que fazer?', a: 'Verifique se o pagamento foi concluído no seu aplicativo bancário. Caso o problema persista, procure o suporte indicado na máquina.' },
  { q: 'Posso usar a máquina todos os dias?', a: 'Sim. É recomendado higienizar o capacete regularmente, principalmente para quem utiliza diariamente para trabalho ou viagens.' },
];

export default function FAQPage() {
  return (
    <div className="flex-1 flex flex-col items-center px-8 py-6 relative z-10 overflow-auto">
      <div className="w-full max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded border border-[hsl(var(--neon-blue)/0.3)] bg-[hsl(var(--neon-blue)/0.05)] hover:bg-[hsl(var(--neon-blue)/0.15)] transition-all duration-300 font-display text-sm tracking-wider text-primary uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <h1 className="font-display text-2xl font-bold tracking-wider text-foreground text-glow-blue uppercase mb-8 text-center">
          Perguntas Frequentes
        </h1>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group border border-[hsl(var(--neon-blue)/0.2)] rounded-lg bg-surface overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_15px_hsl(var(--neon-blue)/0.2)] open:glow-blue"
            >
              <summary className="font-display text-base tracking-wide text-foreground hover:text-primary py-4 px-5 cursor-pointer list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="text-muted-foreground text-base pb-4 px-5 leading-relaxed border-t border-[hsl(var(--neon-blue)/0.1)] pt-2">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
