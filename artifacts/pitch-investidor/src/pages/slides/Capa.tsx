const base = import.meta.env.BASE_URL;

export default function Capa() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-ink">
      <img
        src={`${base}hero-salon.png`}
        crossOrigin="anonymous"
        alt="Salão de beleza premium"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />

      <div className="relative z-10 w-full h-full flex flex-col justify-between px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[2.4vw] h-[2.4vw] rounded-full bg-primary" />
            <span className="text-cream font-body text-[1.4vw] tracking-[0.3em] uppercase">
              Glow Upi
            </span>
          </div>
          <span className="text-cream/70 font-body text-[1.1vw] tracking-[0.2em] uppercase">
            Pitch Investidor · 2026
          </span>
        </div>

        <div className="max-w-[68vw]">
          <p className="text-primary font-body text-[1.3vw] tracking-[0.35em] uppercase mb-[3vh]">
            Oportunidade de Sociedade
          </p>
          <h1
            className="font-display text-[6.4vw] leading-[0.95] text-cream font-light"
            style={{ textWrap: "balance" }}
          >
            A operação de beleza<br className="hidden" />
            <span className="italic font-normal text-primary"> vira software.</span>
          </h1>
          <p className="text-cream/85 font-body text-[1.7vw] mt-[3.5vh] max-w-[55vw] font-light leading-snug">
            50% da Glow Upi — o sistema que organiza, agenda e fideliza
            o mercado de estética em Teresina.
          </p>
        </div>

        <div className="flex items-end justify-between border-t border-cream/20 pt-[3vh]">
          <div>
            <p className="text-cream/60 font-body text-[1vw] tracking-[0.25em] uppercase mb-[0.8vh]">
              Proposta
            </p>
            <p className="text-cream font-display text-[2.2vw] font-light">
              R$ 18.300 <span className="text-cream/60 text-[1.3vw]">·</span>{" "}
              <span className="text-primary italic">50% equity</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-cream/60 font-body text-[1vw] tracking-[0.25em] uppercase mb-[0.8vh]">
              Apresentado por
            </p>
            <p className="text-cream font-display text-[1.6vw] font-light italic">
              Fundador & CTO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
