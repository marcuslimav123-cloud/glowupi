export default function FunilCenarios() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-cream">
      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw]">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">05 / 07</span>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col px-[6vw] py-[7vh]">
        <div className="grid grid-cols-12 gap-[3vw] mb-[4vh]">
          <div className="col-span-7">
            <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2vh]">
              Funil de aquisição · Russell Brunson
            </p>
            <h2
              className="font-display text-[3.8vw] leading-[0.98] text-ink font-light"
              style={{ textWrap: "balance" }}
            >
              Isca irresistível <span className="italic text-primary">→</span> trial assistido <span className="italic text-primary">→</span> assinatura.
            </h2>
          </div>
          <div className="col-span-5 flex flex-col justify-end">
            <p className="text-ink/75 font-body text-[1.2vw] leading-snug">
              <span className="text-ink font-medium">Produto gratuito:</span> mini-CRM
              de aniversariantes do mês com lembrete automático por WhatsApp.
              Captura, prova valor, e converte em assinatura paga.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-[1.2vw] mb-[3vh]">
          <div className="bg-bg p-[2vh_1.5vw] border-l-4 border-muted/40">
            <p className="text-muted font-body text-[0.95vw] tracking-[0.25em] uppercase mb-[0.8vh]">Topo</p>
            <p className="font-display text-[1.5vw] text-ink font-medium leading-tight">Anúncio Meta</p>
            <p className="text-ink/70 font-body text-[1vw] mt-[0.6vh]">Donas de salão Teresina</p>
          </div>
          <div className="bg-bg p-[2vh_1.5vw] border-l-4 border-primary/60">
            <p className="text-muted font-body text-[0.95vw] tracking-[0.25em] uppercase mb-[0.8vh]">Isca</p>
            <p className="font-display text-[1.5vw] text-ink font-medium leading-tight">CRM grátis</p>
            <p className="text-ink/70 font-body text-[1vw] mt-[0.6vh]">Aniversariantes do mês</p>
          </div>
          <div className="bg-bg p-[2vh_1.5vw] border-l-4 border-primary">
            <p className="text-muted font-body text-[0.95vw] tracking-[0.25em] uppercase mb-[0.8vh]">Trial</p>
            <p className="font-display text-[1.5vw] text-ink font-medium leading-tight">Onboarding 1:1</p>
            <p className="text-ink/70 font-body text-[1vw] mt-[0.6vh]">Agenda + ficha em 20 min</p>
          </div>
          <div className="bg-ink text-cream p-[2vh_1.5vw] border-l-4 border-primary">
            <p className="text-primary font-body text-[0.95vw] tracking-[0.25em] uppercase mb-[0.8vh]">Conversão</p>
            <p className="font-display text-[1.5vw] font-medium leading-tight">Assinatura</p>
            <p className="text-cream/75 font-body text-[1vw] mt-[0.6vh]">ARPA R$ 164,50</p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-[1.5vw]">
          <div className="bg-bg p-[3vh_2vw] flex flex-col justify-between">
            <div>
              <p className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">Cenário Pessimista</p>
              <p className="font-display text-[1.5vw] text-ink font-light italic mb-[2vh]">CAC R$ 200 · ARPA R$ 150</p>
              <div className="space-y-[1.2vh]">
                <div className="flex justify-between text-ink font-body text-[1.15vw]"><span>Clientes em dez/26</span><span className="font-semibold">40</span></div>
                <div className="flex justify-between text-ink font-body text-[1.15vw]"><span>MRR final</span><span className="font-semibold">R$ 6.000</span></div>
                <div className="flex justify-between text-ink font-body text-[1.15vw]"><span>ARR projetado</span><span className="font-semibold">R$ 72k</span></div>
              </div>
            </div>
            <p className="text-accent font-body text-[1vw] mt-[2vh] italic">Já cobre custo 28×.</p>
          </div>

          <div className="bg-ink text-cream p-[3vh_2vw] flex flex-col justify-between relative">
            <div className="absolute top-[1.5vh] right-[1vw] text-primary font-body text-[0.9vw] tracking-[0.3em] uppercase">Base</div>
            <div>
              <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">Cenário Previsível</p>
              <p className="font-display text-[1.5vw] font-light italic mb-[2vh]">CAC R$ 100 · ARPA R$ 164,50</p>
              <div className="space-y-[1.2vh]">
                <div className="flex justify-between font-body text-[1.15vw]"><span>Clientes em dez/26</span><span className="font-semibold">80</span></div>
                <div className="flex justify-between font-body text-[1.15vw]"><span>MRR final</span><span className="font-semibold">R$ 13.160</span></div>
                <div className="flex justify-between font-body text-[1.15vw]"><span>ARR projetado</span><span className="font-semibold text-primary">R$ 158k</span></div>
              </div>
            </div>
            <p className="text-primary font-body text-[1vw] mt-[2vh] italic">Payback do investimento em 90 dias.</p>
          </div>

          <div className="bg-bg p-[3vh_2vw] flex flex-col justify-between border-2 border-accent/40">
            <div>
              <p className="text-accent font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">Cenário Otimista</p>
              <p className="font-display text-[1.5vw] text-ink font-light italic mb-[2vh]">CAC R$ 70 · ARPA R$ 200</p>
              <div className="space-y-[1.2vh]">
                <div className="flex justify-between text-ink font-body text-[1.15vw]"><span>Clientes em dez/26</span><span className="font-semibold">130</span></div>
                <div className="flex justify-between text-ink font-body text-[1.15vw]"><span>MRR final</span><span className="font-semibold">R$ 26.000</span></div>
                <div className="flex justify-between text-ink font-body text-[1.15vw]"><span>ARR projetado</span><span className="font-semibold text-accent">R$ 312k</span></div>
              </div>
            </div>
            <p className="text-accent font-body text-[1vw] mt-[2vh] italic">17× o investimento em 9 meses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
