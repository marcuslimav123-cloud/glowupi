export default function VeiculoTracao() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw]">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">03 / 07</span>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-center px-[8vw]">
        <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2.5vh]">
          Para onde vai o capital
        </p>
        <h2
          className="font-display text-[5vw] leading-[0.95] text-ink font-light mb-[6vh] max-w-[70vw]"
          style={{ textWrap: "balance" }}
        >
          R$ 18.300 — <span className="italic text-primary">veículo de tração</span>, não custeio.
        </h2>

        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="bg-cream p-[3.5vh_2.5vw] flex flex-col justify-between min-h-[34vh]">
            <div>
              <p className="text-muted font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Operação Limpa
              </p>
              <p className="font-display text-[3.4vw] text-ink font-medium leading-none mb-[2vh]">
                R$ 5.000
              </p>
              <p className="text-ink/80 font-body text-[1.25vw] leading-snug">
                Quitação da fatura do cartão (vence dia 10) que sustenta
                a infraestrutura atual. Zera custo histórico.
              </p>
            </div>
            <p className="text-accent font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              Liquidez · imediato
            </p>
          </div>

          <div className="bg-ink p-[3.5vh_2.5vw] flex flex-col justify-between min-h-[34vh] relative">
            <div className="absolute top-[2vh] right-[1.5vw] w-[2vw] h-[2vw] border border-primary/60" />
            <div>
              <p className="text-primary font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Aquisição · Meta Ads
              </p>
              <p className="font-display text-[3.4vw] text-cream font-medium leading-none mb-[2vh]">
                R$ 5.000
              </p>
              <p className="text-cream/85 font-body text-[1.25vw] leading-snug">
                Campanha de performance segmentada para donas de salão
                em Teresina. CAC projetado entre R$ 70 e R$ 200.
              </p>
            </div>
            <p className="text-primary font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              Crescimento · 90 dias
            </p>
          </div>

          <div className="bg-cream p-[3.5vh_2.5vw] flex flex-col justify-between min-h-[34vh] border border-primary/30">
            <div>
              <p className="text-muted font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Presença Digital
              </p>
              <p className="font-display text-[3.4vw] text-ink font-medium leading-none mb-[2vh]">
                iPhone 17 <span className="text-[1.6vw] text-muted">Pro Max</span>
              </p>
              <p className="text-ink/80 font-body text-[1.25vw] leading-snug">
                Vídeo vertical de qualidade profissional para conteúdo
                orgânico, demos do app e provas sociais reais.
              </p>
            </div>
            <p className="text-accent font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              R$ 8.300 · ativo de marca
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-ink/15 mt-[5vh] pt-[2.5vh]">
          <p className="text-muted font-body text-[1.2vw] italic">
            Custo operacional fixo: <span className="text-ink font-medium not-italic">R$ 208/mês</span> (Replit + Brevo + Hostinger).
          </p>
          <p className="text-ink font-display text-[1.6vw] italic">
            Cada real entra como tração — não como sobrevivência.
          </p>
        </div>
      </div>
    </div>
  );
}
