export default function Proposta() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-[38vw] h-full bg-ink" />
      <div className="absolute top-[35vh] left-[34vw] w-[8vw] h-[8vw] rounded-full bg-primary/20 blur-[4vw]" />

      <div className="relative z-10 w-full h-full grid grid-cols-12 px-[6vw] py-[7vh]">
        <div className="col-span-5 flex flex-col justify-between pr-[3vw]">
          <div>
            <p className="text-primary font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[3vh]">
              07 · A Proposta
            </p>
            <h2
              className="font-display text-[5vw] leading-[0.95] text-cream font-light mb-[4vh]"
              style={{ textWrap: "balance" }}
            >
              50% da Glow Upi <span className="italic text-primary">por R$ 18.300.</span>
            </h2>
            <p className="text-cream/80 font-body text-[1.4vw] leading-snug font-light">
              Você entra como sócio fundador de um SaaS pronto, em
              produção, com infraestrutura paga e roadmap claro até
              dezembro de 2026.
            </p>
          </div>

          <div className="border-t border-cream/20 pt-[2.5vh]">
            <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">Próximo passo</p>
            <p className="font-display text-[1.7vw] text-cream font-light italic leading-tight">
              Reunião de 30 minutos<br className="hidden" />
              <span className="text-primary not-italic"> esta semana.</span>
            </p>
          </div>
        </div>

        <div className="col-span-7 pl-[5vw] flex flex-col justify-between">
          <div>
            <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2.5vh]">
              O que você recebe
            </p>
            <div className="space-y-[2vh]">
              <div className="flex items-start gap-[1.5vw] border-b border-ink/10 pb-[2vh]">
                <span className="font-display text-[1.8vw] text-primary font-medium leading-none w-[3vw]">01</span>
                <div>
                  <p className="font-display text-[1.7vw] text-ink font-medium leading-tight">50% de equity formal</p>
                  <p className="text-ink/70 font-body text-[1.15vw] mt-[0.5vh]">Contrato social registrado, com governança clara entre sócios.</p>
                </div>
              </div>
              <div className="flex items-start gap-[1.5vw] border-b border-ink/10 pb-[2vh]">
                <span className="font-display text-[1.8vw] text-primary font-medium leading-none w-[3vw]">02</span>
                <div>
                  <p className="font-display text-[1.7vw] text-ink font-medium leading-tight">Produto pronto e em produção</p>
                  <p className="text-ink/70 font-body text-[1.15vw] mt-[0.5vh]">Web, app iOS/Android, agenda, ficha digital, e-mail marketing nativo.</p>
                </div>
              </div>
              <div className="flex items-start gap-[1.5vw] border-b border-ink/10 pb-[2vh]">
                <span className="font-display text-[1.8vw] text-primary font-medium leading-none w-[3vw]">03</span>
                <div>
                  <p className="font-display text-[1.7vw] text-ink font-medium leading-tight">Operação técnica garantida</p>
                  <p className="text-ink/70 font-body text-[1.15vw] mt-[0.5vh]">Eu cuido de toda engenharia. Você decide estratégia comercial e marketing.</p>
                </div>
              </div>
              <div className="flex items-start gap-[1.5vw]">
                <span className="font-display text-[1.8vw] text-primary font-medium leading-none w-[3vw]">04</span>
                <div>
                  <p className="font-display text-[1.7vw] text-ink font-medium leading-tight">Tração imediata em 90 dias</p>
                  <p className="text-ink/70 font-body text-[1.15vw] mt-[0.5vh]">R$ 5k em mídia + iPhone para conteúdo geram MRR antes do fim de 2026.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ink text-cream px-[2vw] py-[2.5vh] flex items-center justify-between mt-[3vh]">
            <div>
              <p className="text-primary font-body text-[0.95vw] tracking-[0.3em] uppercase mb-[0.6vh]">Composição</p>
              <p className="font-display text-[1.5vw] font-light italic">R$ 10.000 em dinheiro · iPhone 17 Pro Max (R$ 8.300)</p>
            </div>
            <div className="text-right">
              <p className="text-cream/55 font-body text-[0.9vw] tracking-[0.25em] uppercase">Total</p>
              <p className="font-display text-[2.4vw] font-medium text-primary leading-none">R$ 18.300</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
