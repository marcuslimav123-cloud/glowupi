export default function Proposta() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-[40vw] h-full bg-ink" />
      <div className="absolute top-[35vh] left-[36vw] w-[8vw] h-[8vw] rounded-full bg-primary/20 blur-[4vw]" />
      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw] z-20">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">10 / 10</span>
      </div>

      <div className="relative z-10 w-full h-full grid grid-cols-12 px-[6vw] py-[7vh]">
        <div className="col-span-5 flex flex-col justify-between pr-[3vw]">
          <div>
            <img
              src={`${import.meta.env.BASE_URL}glow-upi-logo-card.png`}
              crossOrigin="anonymous"
              alt="Glow Upi"
              className="w-[7vw] h-[7vw] object-contain mb-[2vh]"
              style={{ filter: "drop-shadow(0 6px 24px rgba(196,164,106,0.4))" }}
            />
            <p className="text-primary font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[3vh]">
              A proposta formal
            </p>
            <h2
              className="font-display text-[4.4vw] leading-[0.98] text-cream font-light mb-[3.5vh]"
              style={{ textWrap: "balance" }}
            >
              50% da Glow Upi <span className="italic text-primary">por R$ 19.700.</span>
            </h2>
            <p className="text-cream/80 font-body text-[1.3vw] leading-snug font-light">
              O investidor adquire participação societária formal de
              metade da empresa, em SaaS já em produção, com infraestrutura
              quitada e roadmap definido até dezembro de 2026.
            </p>
          </div>

          <div className="border-t border-cream/20 pt-[2.5vh]">
            <p className="text-cream/60 font-body text-[1vw] tracking-[0.3em] uppercase mb-[1.8vh]">
              Cronograma de tração — primeiros 120 dias
            </p>
            <div className="space-y-[1.4vh]">
              <div className="flex items-baseline gap-[1.2vw]">
                <span className="text-primary font-display text-[1.4vw] font-medium w-[3.5vw] shrink-0">D+15</span>
                <span className="text-cream/85 font-body text-[1.05vw] leading-snug">
                  Primeira métrica real de CAC com 5–10 conversões piloto.
                </span>
              </div>
              <div className="flex items-baseline gap-[1.2vw]">
                <span className="text-primary font-display text-[1.4vw] font-medium w-[3.5vw] shrink-0">D+60</span>
                <span className="text-cream/85 font-body text-[1.05vw] leading-snug">
                  25 clientes ativos pagantes — validação de CAC e churn iniciais.
                </span>
              </div>
              <div className="flex items-baseline gap-[1.2vw]">
                <span className="text-primary font-display text-[1.4vw] font-medium w-[3.5vw] shrink-0">D+120</span>
                <span className="text-cream/85 font-body text-[1.05vw] leading-snug">
                  80 clientes ativos · MRR R$ 14.000 (cenário base).
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-7 pl-[5vw] flex flex-col justify-between">
          <div>
            <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2.5vh]">
              O que o investidor recebe
            </p>
            <div className="space-y-[2.2vh]">
              <div className="flex items-start gap-[1.5vw] border-b border-ink/10 pb-[2.2vh]">
                <span className="font-display text-[1.7vw] text-primary font-medium leading-none w-[2.8vw]">01</span>
                <div>
                  <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">50% de equity formal</p>
                  <p className="text-ink/70 font-body text-[1.1vw] mt-[0.4vh]">Contrato social registrado em junta comercial, com governança e regras de saída claras.</p>
                </div>
              </div>
              <div className="flex items-start gap-[1.5vw] border-b border-ink/10 pb-[1.6vh]">
                <span className="font-display text-[1.7vw] text-primary font-medium leading-none w-[2.8vw]">02</span>
                <div>
                  <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">Produto em produção</p>
                  <p className="text-ink/70 font-body text-[1.1vw] mt-[0.4vh]">Painel web responsivo instalável como PWA, com agenda, ficha digital, e-mail marketing nativo e cobrança recorrente.</p>
                </div>
              </div>
              <div className="flex items-start gap-[1.5vw] border-b border-ink/10 pb-[2.2vh]">
                <span className="font-display text-[1.7vw] text-primary font-medium leading-none w-[2.8vw]">03</span>
                <div>
                  <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">Operação técnica integralmente coberta</p>
                  <p className="text-ink/70 font-body text-[1.1vw] mt-[0.4vh]">O fundador responde pela engenharia, infraestrutura e produto. O sócio conduz estratégia comercial e marketing.</p>
                </div>
              </div>
              <div className="flex items-start gap-[1.5vw]">
                <span className="font-display text-[1.7vw] text-primary font-medium leading-none w-[2.8vw]">04</span>
                <div>
                  <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">Tração mensurável em 90 dias</p>
                  <p className="text-ink/70 font-body text-[1.1vw] mt-[0.4vh]">R$ 17.439 alocados em tráfego pago e orgânico geram MRR antes do encerramento de 2026.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ink text-cream px-[2vw] py-[2.5vh] flex items-center justify-between gap-[2vw] mt-[3vh]">
            <div className="min-w-0">
              <p className="text-primary font-body text-[0.95vw] tracking-[0.3em] uppercase mb-[0.5vh]">Composição do aporte</p>
              <p className="font-display text-[1.25vw] font-light italic leading-snug whitespace-nowrap">R$ 11.400 em capital · R$ 8.300 em tráfego orgânico</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-cream/55 font-body text-[0.9vw] tracking-[0.25em] uppercase">Total</p>
              <p className="font-display text-[2vw] font-medium text-primary leading-none whitespace-nowrap">R$ 19.700</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
