export default function MercadoTAM() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/40" />

      <div className="relative w-full h-full flex flex-col px-[6vw] py-[5.5vh]">
        <div className="flex items-center justify-between mb-[2vh]">
          <p className="text-accent font-body text-[1.05vw] tracking-[0.35em] uppercase">
            05 · Dimensionamento do mercado
          </p>
          <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">
            05 / 09
          </span>
        </div>

        <h2
          className="font-display text-[3.4vw] leading-[1.05] text-ink font-light mb-[1.5vh]"
          style={{ textWrap: "balance" }}
        >
          TAM, SAM e SOM. <span className="italic text-primary">Com fonte primária.</span>
        </h2>

        <p className="text-ink/70 font-body text-[1.05vw] leading-snug max-w-[68vw] mb-[3vh]">
          O universo endereçável da Glow Upi é a praça conurbada{" "}
          <span className="text-ink font-semibold">Teresina + Timon</span>,
          separada apenas pelo Rio Parnaíba. Os números abaixo são extraídos de
          bases oficiais e auditáveis.
        </p>

        <div className="grid grid-cols-3 gap-[1.5vw] mb-[2.5vh]">
          <div className="bg-ink text-cream px-[1.8vw] py-[2.5vh] flex flex-col">
            <p className="text-primary font-body text-[1vw] tracking-[0.35em] uppercase mb-[1vh]">
              TAM · ofertante
            </p>
            <p className="font-display text-[3.2vw] text-cream font-light leading-none">
              5.200
            </p>
            <p className="text-cream/60 font-body text-[0.95vw] mt-[0.6vh] mb-[1.2vh]">
              estabelecimentos formais
            </p>
            <p className="text-cream/85 font-body text-[1vw] leading-snug">
              CNPJs ativos nos CNAEs 9602-5/01 e 9602-5/02 em Teresina (~4.700) e
              Timon (~500).
            </p>
          </div>

          <div className="bg-cream px-[1.8vw] py-[2.5vh] flex flex-col">
            <p className="text-accent font-body text-[1vw] tracking-[0.35em] uppercase mb-[1vh]">
              SAM · qualificado
            </p>
            <p className="font-display text-[3.2vw] text-ink font-light leading-none">
              2.100
            </p>
            <p className="text-ink/60 font-body text-[0.95vw] mt-[0.6vh] mb-[1.2vh]">
              ~40% do TAM
            </p>
            <p className="text-ink/80 font-body text-[1vw] leading-snug mb-[1vh]">
              3 a 5 profissionais e capacidade de pagar SaaS.
            </p>
            <div className="border-t border-ink/15 pt-[1vh] mt-auto">
              <p className="text-muted font-body text-[0.7vw] tracking-[0.3em] uppercase">
                Faturamento típico
              </p>
              <p className="font-display text-[1.4vw] text-ink font-medium leading-tight">
                R$ 25k a R$ 50k<span className="text-[0.95vw] text-ink/55">/mês</span>
              </p>
              <p className="text-muted font-body text-[0.78vw] italic mt-[0.2vh]">
                GG Contabilidade · blog Trinks
              </p>
            </div>
          </div>

          <div className="bg-bg border-2 border-primary px-[1.8vw] py-[2.5vh] flex flex-col">
            <p className="text-primary font-body text-[1vw] tracking-[0.35em] uppercase mb-[1vh]">
              SOM · alcançável 5 anos
            </p>
            <p className="font-display text-[3.2vw] text-ink font-light leading-none">
              525 a 630
            </p>
            <p className="text-ink/60 font-body text-[0.95vw] mt-[0.6vh] mb-[1.2vh]">
              ~10–12% do TAM
            </p>
            <p className="text-ink/80 font-body text-[1vw] leading-snug">
              Captáveis em 5 anos por Meta Ads e indicação, descontada a
              concorrência (Trinks, Belezix, Programa Salão).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[2vw] flex-1">
          <div>
            <p className="text-muted font-body text-[0.9vw] tracking-[0.3em] uppercase mb-[1.2vh]">
              Demografia da praça · IBGE 2025
            </p>
            <div className="grid grid-cols-2 gap-x-[1.5vw] gap-y-[0.8vh]">
              <p className="text-ink/80 font-body text-[1.05vw]">
                Teresina (PI)
              </p>
              <p className="text-ink font-display text-[1.25vw] text-right">
                905.692 hab
              </p>
              <p className="text-ink/80 font-body text-[1.05vw]">
                Timon (MA)
              </p>
              <p className="text-ink font-display text-[1.25vw] text-right">
                182.711 hab
              </p>
              <p className="text-ink font-body text-[1.05vw] font-semibold border-t border-ink/15 pt-[0.8vh]">
                Conurbação
              </p>
              <p className="text-primary font-display text-[1.4vw] text-right border-t border-ink/15 pt-[0.8vh]">
                1.088.403 hab
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted font-body text-[0.9vw] tracking-[0.3em] uppercase mb-[1.2vh]">
              Premissas do recorte SAM · SOM
            </p>
            <p className="text-ink/80 font-body text-[0.98vw] leading-snug mb-[0.8vh]">
              · 35–40% dos CNPJs têm o dono como único profissional (perfil
              planilha, baixa conversão para SaaS).
            </p>
            <p className="text-ink/80 font-body text-[0.98vw] leading-snug mb-[0.8vh]">
              · 15–20% já usam algum software (Trinks, Belezix, Programa Salão,
              Simples Agenda) — concorrência direta.
            </p>
            <p className="text-ink/80 font-body text-[0.98vw] leading-snug">
              · ~10% têm faturamento abaixo do mínimo viável para mensalidade.
            </p>
          </div>
        </div>

        <div className="bg-cream/70 border-l-4 border-primary px-[1.8vw] py-[1.4vh] mt-[2vh]">
          <p className="text-muted font-body text-[0.78vw] tracking-[0.3em] uppercase mb-[0.4vh]">
            Fontes primárias
          </p>
          <p className="font-body text-[0.85vw] text-ink/80 leading-snug">
            <span className="font-semibold text-ink">IBGE Cidades</span> · <span className="font-semibold text-ink">Econodata / Receita Federal</span> · <span className="font-semibold text-ink">IBGE Concla</span> (CNAEs 9602-5/01 e 02) · <span className="font-semibold text-ink">Sebrae Nacional</span> (setor de beleza 2023–2025)
          </p>
        </div>
      </div>
    </div>
  );
}
