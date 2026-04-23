const base = import.meta.env.BASE_URL;

export default function MercadoGlossario() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute inset-0 grid grid-cols-12">
        <div className="col-span-4 relative">
          <img
            src={`${base}teresina-aerial.png`}
            crossOrigin="anonymous"
            alt="Teresina vista aérea"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/30 to-ink/65" />
          <div className="absolute bottom-[5vh] left-[2.5vw] right-[1.5vw]">
            <p className="text-cream/80 font-body text-[1vw] tracking-[0.3em] uppercase mb-[1.5vh]">
              Praça de operação
            </p>
            <p className="text-cream font-display text-[2.4vw] font-light leading-none">
              Teresina <span className="text-primary italic">+ Timon</span>
            </p>
            <p className="text-cream/60 font-body text-[0.9vw] mt-[0.5vh] tracking-wide">
              Conurbação Piauí · Maranhão
            </p>
            <p className="text-cream/75 font-body text-[1.05vw] mt-[1.5vh] leading-snug">
              1,09 milhão de habitantes (IBGE 2025) e cerca de{" "}
              <span className="text-cream font-medium">5.200 estabelecimentos</span>{" "}
              formais nos CNAEs 9602-5/01 e 02. Mercado total dimensionado em
              detalhe na página seguinte.
            </p>
          </div>
        </div>

        <div className="col-span-8 px-[5vw] py-[7vh] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-[2.5vh]">
              <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase">
                04 · Mercado, margem e vocabulário
              </p>
              <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">04 / 08</span>
            </div>
            <h2
              className="font-display text-[3.8vw] leading-[1] text-ink font-light"
              style={{ textWrap: "balance" }}
            >
              Mercado verificável. <span className="italic text-primary">Margem de software.</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-[1.5vw]">
            <div className="border-t-2 border-primary pt-[1.5vh]">
              <p className="font-display text-[2.8vw] text-ink font-medium leading-none">
                5.200
              </p>
              <p className="text-muted font-body text-[0.95vw] mt-[0.8vh] tracking-wide uppercase">
                TAM Teresina + Timon
              </p>
              <p className="text-ink/70 font-body text-[1vw] mt-[1vh] leading-snug">
                Estabelecimentos formais na praça. Detalhamento TAM/SAM/SOM
                e fontes na página 05.
              </p>
            </div>
            <div className="border-t-2 border-primary pt-[1.5vh]">
              <p className="font-display text-[2.8vw] text-ink font-medium leading-none">
                R$ 164<span className="text-[1.5vw]">,50</span>
              </p>
              <p className="text-muted font-body text-[0.95vw] mt-[0.8vh] tracking-wide uppercase">
                ARPA — plano referência
              </p>
              <p className="text-ink/70 font-body text-[1vw] mt-[1vh] leading-snug">
                Average Revenue Per Account — receita média mensal por
                cliente ativo no plano "6 a 15 Profissionais".
              </p>
            </div>
            <div className="border-t-2 border-accent pt-[1.5vh]">
              <p className="font-display text-[2.8vw] text-accent font-medium leading-none">
                R$ 208
              </p>
              <p className="text-muted font-body text-[0.95vw] mt-[0.8vh] tracking-wide uppercase">
                Custo fixo / mês
              </p>
              <p className="text-ink/70 font-body text-[1vw] mt-[1vh] leading-snug">
                Replit (US$ 20) + Brevo (R$ 87) + Hostinger (R$ 11). Tudo
                contratado, tudo verificável.
              </p>
            </div>
          </div>

          <div className="bg-ink text-cream px-[2vw] py-[2.2vh]">
            <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase mb-[1.2vh]">
              Glossário das siglas usadas neste documento
            </p>
            <div className="grid grid-cols-2 gap-[0.8vh_2vw] font-body text-[1.05vw] leading-snug">
              <p><span className="text-primary font-semibold">MRR</span> · Monthly Recurring Revenue — receita recorrente mensal.</p>
              <p><span className="text-primary font-semibold">ARR</span> · Annual Recurring Revenue — receita recorrente anual (MRR × 12).</p>
              <p><span className="text-primary font-semibold">CAC</span> · Custo de Aquisição de Cliente.</p>
              <p><span className="text-primary font-semibold">LTV</span> · Lifetime Value — receita total esperada por cliente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
