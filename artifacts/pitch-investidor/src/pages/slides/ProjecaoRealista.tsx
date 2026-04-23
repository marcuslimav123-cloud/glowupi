const base = import.meta.env.BASE_URL;

export default function ProjecaoRealista() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-deep">
      <img
        src={`${base}growth-abstract.png`}
        crossOrigin="anonymous"
        alt="Projeção de crescimento"
        className="absolute inset-0 w-full h-full object-cover opacity-12"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep/95 to-ink" />

      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw] z-20">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-cream/60 font-body text-[1vw] tracking-[0.3em] uppercase">07 / 08</span>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col px-[6vw] py-[6vh]">
        <div className="mb-[3.5vh]">
          <p className="text-primary font-body text-[1.05vw] tracking-[0.35em] uppercase mb-[1.8vh]">
            Projeção realista · somente Teresina · sem expansão
          </p>
          <h2
            className="font-display text-[3.6vw] leading-[1] text-cream font-light max-w-[88vw]"
            style={{ textWrap: "balance" }}
          >
            O que cada patamar de clientes representa em receita.
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.8vw] mb-[3vh]">
          <div className="bg-cream/5 border border-cream/15 p-[2.8vh_1.8vw] flex flex-col">
            <p className="text-cream/55 font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">Marco 01</p>
            <p className="font-display text-[2.6vw] text-cream font-light leading-none mb-[1.8vh]">
              200 clientes ativos
            </p>
            <div className="space-y-[1vh]">
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">MRR</span>
                <span className="font-semibold">R$ 32.900</span>
              </div>
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">ARR</span>
                <span className="font-semibold">R$ 394.800</span>
              </div>
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">Penetração TAM</span>
                <span className="font-semibold">4%</span>
              </div>
            </div>
            <p className="text-primary font-body text-[1vw] mt-[1.5vh] italic leading-snug">
              Atingível em 18 meses · 11 novos clientes/mês líquidos.
            </p>
          </div>

          <div className="bg-primary/15 border border-primary/40 p-[2.8vh_1.8vw] flex flex-col relative">
            <div className="absolute -top-[1.5vh] left-[1.5vw] bg-primary text-deep px-[1vw] py-[0.5vh] font-body text-[0.85vw] tracking-[0.3em] uppercase font-semibold">
              Marco-chave
            </div>
            <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh] mt-[1.5vh]">Marco 02</p>
            <p className="font-display text-[2.6vw] text-cream font-light leading-none mb-[1.8vh]">
              500 clientes ativos
            </p>
            <div className="space-y-[1vh]">
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">MRR</span>
                <span className="font-semibold text-primary">R$ 82.250</span>
              </div>
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">ARR</span>
                <span className="font-semibold text-primary">R$ 987.000</span>
              </div>
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">Penetração TAM</span>
                <span className="font-semibold">10%</span>
              </div>
            </div>
            <p className="text-cream font-body text-[1vw] mt-[1.5vh] italic leading-snug">
              Atingível em 36 meses · 14 novos clientes/mês líquidos.
            </p>
          </div>

          <div className="bg-cream/5 border border-cream/15 p-[2.8vh_1.8vw] flex flex-col">
            <p className="text-cream/55 font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">Horizonte 5 anos</p>
            <p className="font-display text-[2.6vw] text-cream font-light leading-none mb-[1.8vh]">
              600 clientes Teresina
            </p>
            <div className="space-y-[1vh]">
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">MRR</span>
                <span className="font-semibold">R$ 98.700</span>
              </div>
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">ARR</span>
                <span className="font-semibold">R$ 1,18M</span>
              </div>
              <div className="flex justify-between text-cream font-body text-[1.1vw]">
                <span className="text-cream/70">Penetração TAM</span>
                <span className="font-semibold">12%</span>
              </div>
            </div>
            <p className="text-primary font-body text-[1vw] mt-[1.5vh] italic leading-snug">
              Teto realista sem sair de Teresina. Comparáveis: Trinks (BR), Belezix (BR).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-[2vw] border-t border-cream/15 pt-[2.5vh]">
          <div className="col-span-8">
            <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">
              Valuation no horizonte 5 anos · cenário base Teresina
            </p>
            <p className="font-display text-[2.2vw] text-cream font-light italic leading-tight">
              ARR R$ 1,18M × múltiplo conservador 5× = <span className="text-primary not-italic font-medium">R$ 5,9 milhões</span>
            </p>
            <p className="text-cream/70 font-body text-[1.05vw] mt-[1vh] leading-snug">
              Múltiplo abaixo da média de SaaS vertical brasileiro (5–8× ARR conforme
              relatórios Distrito e Atlas Latam). 50% do equity equivale a R$ 2,95M.
            </p>
          </div>
          <div className="col-span-4 bg-primary/15 border border-primary/30 p-[2vh_1.5vw] flex flex-col justify-center">
            <p className="text-primary/80 font-body text-[0.95vw] tracking-[0.3em] uppercase mb-[0.5vh]">
              Retorno sobre R$ 19.700
            </p>
            <p className="font-display text-[2.6vw] text-primary font-medium leading-none">
              ≈ 150×
            </p>
            <p className="text-cream/75 font-body text-[1vw] mt-[1vh] italic leading-snug">
              Projeção sem nenhuma cidade nova. Risco real, retorno mensurável.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
