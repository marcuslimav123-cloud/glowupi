export default function VeiculoTracao() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw]">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">07 / 09</span>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-center px-[8vw]">
        <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2.5vh]">
          Destinação do aporte
        </p>
        <h2
          className="font-display text-[4.6vw] leading-[0.98] text-ink font-light mb-[5vh] max-w-[80vw]"
          style={{ textWrap: "balance" }}
        >
          R$ 19.700 alocados como <span className="italic text-primary">veículo de tração</span> — não como custeio.
        </h2>

        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="bg-cream p-[3vh_2.2vw] flex flex-col justify-between min-h-[32vh]">
            <div>
              <p className="text-muted font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Saneamento operacional
              </p>
              <p className="font-display text-[3.2vw] text-ink font-medium leading-none mb-[2vh]">
                R$ 2.261
              </p>
              <p className="text-ink/80 font-body text-[1.2vw] leading-snug">
                Quitação da fatura do cartão usada na finalização do
                sistema em abril — encerramento do capital próprio
                aplicado na construção do produto.
              </p>
            </div>
            <p className="text-accent font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              Liquidez · imediato
            </p>
          </div>

          <div className="bg-ink p-[3vh_2.2vw] flex flex-col justify-between min-h-[32vh] relative">
            <div>
              <p className="text-primary font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Aquisição · Meta Ads
              </p>
              <p className="font-display text-[3.2vw] text-cream font-medium leading-none mb-[2vh]">
                R$ 9.139
              </p>
              <p className="text-cream/85 font-body text-[1.2vw] leading-snug">
                Campanha de performance segmentada para profissionais e
                proprietárias de salão em Teresina, com CAC projetado
                entre R$ 90 e R$ 160.
              </p>
            </div>
            <p className="text-primary font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              Crescimento · 90 dias
            </p>
          </div>

          <div className="bg-cream p-[3vh_2.2vw] flex flex-col justify-between min-h-[32vh] border border-primary/30">
            <div>
              <p className="text-muted font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Tráfego orgânico
              </p>
              <p className="font-display text-[3.2vw] text-ink font-medium leading-none mb-[2vh]">
                R$ 8.300
              </p>
              <p className="text-ink/80 font-body text-[1.2vw] leading-snug">
                Produção de vídeo vertical profissional, conteúdo
                recorrente, demonstrações do aplicativo e provas sociais
                reais com clientes — combustível do canal orgânico.
              </p>
            </div>
            <p className="text-accent font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              Conteúdo · 90 dias
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-[2vw] border-t border-ink/15 mt-[4vh] pt-[2.5vh]">
          <div className="col-span-7">
            <p className="text-accent font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">
              Funil de aquisição
            </p>
            <p className="font-display text-[1.5vw] text-ink font-light italic leading-tight">
              Anúncio Meta <span className="text-primary not-italic">→</span> isca gratuita <span className="text-primary not-italic">→</span> onboarding 1:1 <span className="text-primary not-italic">→</span> assinatura ARPA R$ 164,50.
            </p>
          </div>
          <div className="col-span-5 text-right">
            <p className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase mb-[0.5vh]">
              Custo fixo de operação
            </p>
            <p className="font-display text-[1.7vw] text-ink font-medium">R$ 208 / mês</p>
          </div>
        </div>
      </div>
    </div>
  );
}
