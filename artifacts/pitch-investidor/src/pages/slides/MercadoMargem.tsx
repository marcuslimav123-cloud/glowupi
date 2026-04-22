const base = import.meta.env.BASE_URL;

export default function MercadoMargem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute inset-0 grid grid-cols-12">
        <div className="col-span-5 relative">
          <img
            src={`${base}teresina-aerial.png`}
            crossOrigin="anonymous"
            alt="Teresina vista aérea"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/30 to-ink/60" />
          <div className="absolute bottom-[5vh] left-[3vw] right-[2vw]">
            <p className="text-cream/80 font-body text-[1vw] tracking-[0.3em] uppercase mb-[1.5vh]">
              Praça inicial
            </p>
            <p className="text-cream font-display text-[3.2vw] font-light leading-none">
              Teresina, PI
            </p>
            <p className="text-cream/75 font-body text-[1.15vw] mt-[1.5vh] leading-snug max-w-[22vw]">
              Capital com 870 mil habitantes, hub do consumo de
              estética no Meio-Norte do país.
            </p>
          </div>
        </div>

        <div className="col-span-7 px-[5vw] py-[7vh] flex flex-col justify-between">
          <div>
            <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2.5vh]">
              04 · Tamanho de mercado e margem
            </p>
            <h2
              className="font-display text-[4.4vw] leading-[0.95] text-ink font-light mb-[4vh]"
              style={{ textWrap: "balance" }}
            >
              5.000 estabelecimentos. <span className="italic text-primary">Margem de software.</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-[2vw]">
            <div className="border-t-2 border-primary pt-[2vh]">
              <p className="font-display text-[3.6vw] text-ink font-medium leading-none">
                5.000
              </p>
              <p className="text-muted font-body text-[1.05vw] mt-[1vh] tracking-wide uppercase">
                CNPJs Teresina
              </p>
              <p className="text-ink/70 font-body text-[1.1vw] mt-[1.2vh] leading-snug">
                Salões, clínicas e estúdios — TAM imediato.
              </p>
            </div>
            <div className="border-t-2 border-primary pt-[2vh]">
              <p className="font-display text-[3.6vw] text-ink font-medium leading-none">
                R$ 164<span className="text-[1.8vw]">,50</span>
              </p>
              <p className="text-muted font-body text-[1.05vw] mt-[1vh] tracking-wide uppercase">
                ARPA médio
              </p>
              <p className="text-ink/70 font-body text-[1.1vw] mt-[1.2vh] leading-snug">
                Plano "6 a 15 Profissionais", o ponto doce.
              </p>
            </div>
            <div className="border-t-2 border-primary pt-[2vh]">
              <p className="font-display text-[3.6vw] text-accent font-medium leading-none">
                97%
              </p>
              <p className="text-muted font-body text-[1.05vw] mt-[1vh] tracking-wide uppercase">
                Margem bruta
              </p>
              <p className="text-ink/70 font-body text-[1.1vw] mt-[1.2vh] leading-snug">
                Custo fixo R$ 208 contra MRR escalável.
              </p>
            </div>
          </div>

          <div className="bg-ink text-cream px-[2vw] py-[2.5vh] flex items-center justify-between">
            <div>
              <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase mb-[0.8vh]">
                Estrutura de custo mensal
              </p>
              <p className="font-display text-[1.7vw] font-light italic">
                Replit US$20 · Brevo R$87 · Hostinger R$11
              </p>
            </div>
            <div className="text-right">
              <p className="text-cream/60 font-body text-[0.95vw] tracking-[0.25em] uppercase">
                Total
              </p>
              <p className="font-display text-[2.4vw] font-medium text-primary">R$ 208</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
