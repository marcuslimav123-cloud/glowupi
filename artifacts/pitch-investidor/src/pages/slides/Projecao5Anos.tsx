const base = import.meta.env.BASE_URL;

export default function Projecao5Anos() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-deep">
      <img
        src={`${base}growth-abstract.png`}
        crossOrigin="anonymous"
        alt="Crescimento abstrato"
        className="absolute inset-0 w-full h-full object-cover opacity-15"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep/95 to-ink" />

      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw]">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-cream/60 font-body text-[1vw] tracking-[0.3em] uppercase">06 / 07</span>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col px-[6vw] py-[7vh]">
        <div className="mb-[4.5vh]">
          <p className="text-primary font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2vh]">
            Horizonte 5 anos · 50% de equity
          </p>
          <h2
            className="font-display text-[4.2vw] leading-[0.98] text-cream font-light max-w-[80vw]"
            style={{ textWrap: "balance" }}
          >
            O que <span className="italic text-primary">R$ 18.300</span> compra em 2031.
          </h2>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-[2vw]">
          <div className="col-span-4 bg-cream/5 border border-cream/15 p-[3vh_2vw] flex flex-col justify-between">
            <div>
              <p className="text-cream/55 font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">Pessimista</p>
              <p className="font-display text-[1.4vw] text-cream/80 font-light italic mb-[2.5vh]">5% do TAM Teresina</p>
              <div className="space-y-[1.5vh]">
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>Clientes</span><span className="font-semibold">250</span></div>
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>ARR</span><span className="font-semibold">R$ 450k</span></div>
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>Valuation 4× ARR</span><span className="font-semibold">R$ 1,8M</span></div>
              </div>
            </div>
            <div className="border-t border-cream/15 pt-[2vh] mt-[2vh]">
              <p className="text-cream/55 font-body text-[0.95vw] tracking-[0.25em] uppercase">50% sócio</p>
              <p className="font-display text-[2.4vw] text-cream font-medium leading-none mt-[0.8vh]">R$ 900k</p>
              <p className="text-primary font-body text-[1.1vw] mt-[1vh] italic">ROI 49× sobre R$ 18,3k</p>
            </div>
          </div>

          <div className="col-span-4 bg-primary/15 border border-primary/40 p-[3vh_2vw] flex flex-col justify-between relative">
            <div className="absolute -top-[1.5vh] left-[2vw] bg-primary text-deep px-[1vw] py-[0.6vh] font-body text-[0.85vw] tracking-[0.3em] uppercase font-semibold">Cenário Base</div>
            <div>
              <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh] mt-[2vh]">Previsível</p>
              <p className="font-display text-[1.4vw] text-cream font-light italic mb-[2.5vh]">10% Teresina + início Nordeste</p>
              <div className="space-y-[1.5vh]">
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>Clientes</span><span className="font-semibold">600</span></div>
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>ARR</span><span className="font-semibold">R$ 1,18M</span></div>
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>Valuation 6× ARR</span><span className="font-semibold">R$ 7,1M</span></div>
              </div>
            </div>
            <div className="border-t border-primary/30 pt-[2vh] mt-[2vh]">
              <p className="text-primary/80 font-body text-[0.95vw] tracking-[0.25em] uppercase">50% sócio</p>
              <p className="font-display text-[2.8vw] text-primary font-medium leading-none mt-[0.8vh]">R$ 3,55M</p>
              <p className="text-cream font-body text-[1.1vw] mt-[1vh] italic">ROI 194× sobre R$ 18,3k</p>
            </div>
          </div>

          <div className="col-span-4 bg-cream/5 border border-cream/15 p-[3vh_2vw] flex flex-col justify-between">
            <div>
              <p className="text-cream/55 font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">Otimista</p>
              <p className="font-display text-[1.4vw] text-cream/80 font-light italic mb-[2.5vh]">15% TAM Nordeste consolidado</p>
              <div className="space-y-[1.5vh]">
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>Clientes</span><span className="font-semibold">1.500</span></div>
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>ARR</span><span className="font-semibold">R$ 3,6M</span></div>
                <div className="flex justify-between text-cream font-body text-[1.15vw]"><span>Valuation 8× ARR</span><span className="font-semibold">R$ 28,8M</span></div>
              </div>
            </div>
            <div className="border-t border-cream/15 pt-[2vh] mt-[2vh]">
              <p className="text-cream/55 font-body text-[0.95vw] tracking-[0.25em] uppercase">50% sócio</p>
              <p className="font-display text-[2.4vw] text-cream font-medium leading-none mt-[0.8vh]">R$ 14,4M</p>
              <p className="text-primary font-body text-[1.1vw] mt-[1vh] italic">ROI 786× sobre R$ 18,3k</p>
            </div>
          </div>
        </div>

        <p className="text-cream/55 font-body text-[1vw] italic mt-[3vh] tracking-wide">
          Múltiplos baseados em comparáveis de SaaS vertical brasileiro (Trinks, Belezix). Projeções não constituem garantia de retorno.
        </p>
      </div>
    </div>
  );
}
