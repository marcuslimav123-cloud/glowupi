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
        <div className="flex items-start justify-between">
          <img
            src={`${base}glow-upi-logo-card.png`}
            crossOrigin="anonymous"
            alt="Glow Upi"
            className="w-[8vw] h-[8vw] object-contain"
            style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }}
          />
          <span className="text-cream/70 font-body text-[1.1vw] tracking-[0.3em] uppercase mt-[2vh]">
            Documento de Sociedade · 2026
          </span>
        </div>

        <div className="max-w-[68vw]">
          <p className="text-primary font-body text-[1.3vw] tracking-[0.35em] uppercase mb-[3vh]">
            Apresentação Confidencial ao Investidor
          </p>
          <h1
            className="font-display text-[6vw] leading-[0.95] text-cream font-light"
            style={{ textWrap: "balance" }}
          >
            A beleza não cabe mais
            <span className="italic font-normal text-primary"> no caderno.</span>
          </h1>
          <p className="text-cream/85 font-body text-[1.6vw] mt-[3.5vh] max-w-[58vw] font-light leading-snug">
            Convite formal para aquisição de 50% de participação societária na
            Glow Upi — plataforma SaaS dedicada ao mercado de estética em Teresina.
          </p>
        </div>

        <div className="flex items-end justify-between border-t border-cream/20 pt-[3vh]">
          <div>
            <p className="text-cream/60 font-body text-[1vw] tracking-[0.25em] uppercase mb-[0.8vh]">
              Aporte solicitado
            </p>
            <p className="text-cream font-display text-[2.2vw] font-light">
              R$ 19.700 <span className="text-cream/60 text-[1.3vw]">·</span>{" "}
              <span className="text-primary italic">50% de equity</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-cream/60 font-body text-[1vw] tracking-[0.25em] uppercase mb-[0.8vh]">
              Apresentado por
            </p>
            <p className="text-cream font-display text-[1.6vw] font-light italic leading-tight">
              Fundador & Diretor de Tecnologia
            </p>
            <p className="text-primary font-body text-[1.1vw] tracking-[0.15em] uppercase mt-[0.6vh]">
              Marcus Vinícius Lima Silva
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
