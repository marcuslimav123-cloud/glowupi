export default function MercadoTAM() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute inset-0 px-[5vw] py-[6vh] flex flex-col">
        <div className="flex items-center justify-between mb-[2.5vh]">
          <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase">
            05 · Dimensionamento do mercado
          </p>
          <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">
            05 / 08
          </span>
        </div>

        <h2
          className="font-display text-[3.6vw] leading-[1] text-ink font-light mb-[2.5vh]"
          style={{ textWrap: "balance" }}
        >
          TAM, SAM e SOM. <span className="italic text-primary">Com fonte primária.</span>
        </h2>

        <p className="text-ink/75 font-body text-[1.15vw] leading-snug max-w-[68vw] mb-[3vh]">
          O universo endereçável da Glow Upi é a praça conurbada{" "}
          <span className="text-ink font-medium">Teresina + Timon</span>, separada
          apenas pelo Rio Parnaíba. Os números abaixo são extraídos de bases
          oficiais e auditáveis.
        </p>

        <div className="grid grid-cols-3 gap-[1.8vw] mb-[3vh]">
          <div className="bg-ink text-cream px-[1.8vw] py-[2.5vh] flex flex-col">
            <p className="text-primary font-body text-[1vw] tracking-[0.35em] uppercase mb-[1vh]">
              TAM · ofertante
            </p>
            <p className="font-display text-[3.2vw] font-light leading-none">
              5.200
            </p>
            <p className="text-cream/70 font-body text-[0.95vw] mt-[0.6vh] mb-[1.2vh]">
              estabelecimentos formais
            </p>
            <p className="text-cream/85 font-body text-[1vw] leading-snug">
              CNPJs ativos nos CNAEs 9602-5/01 e 9602-5/02 em Teresina (~4.700)
              e Timon (~500). Universo total endereçável.
            </p>
          </div>

          <div className="bg-bg border-2 border-ink/15 px-[1.8vw] py-[2.5vh] flex flex-col">
            <p className="text-accent font-body text-[1vw] tracking-[0.35em] uppercase mb-[1vh]">
              SAM · qualificado
            </p>
            <p className="font-display text-[3.2vw] text-ink font-light leading-none">
              2.100
            </p>
            <p className="text-ink/60 font-body text-[0.95vw] mt-[0.6vh] mb-[1.2vh]">
              ~40% do TAM
            </p>
            <p className="text-ink/80 font-body text-[1vw] leading-snug">
              Estabelecimentos com mais de um profissional e faturamento mensal
              acima de R$ 4 mil — perfil com capacidade real de pagar SaaS.
            </p>
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

        <div className="grid grid-cols-2 gap-[2vw] mb-[2.5vh]">
          <div>
            <p className="text-muted font-body text-[0.95vw] tracking-[0.3em] uppercase mb-[1vh]">
              Demografia da praça · IBGE 2025
            </p>
            <div className="grid grid-cols-2 gap-x-[1.5vw] gap-y-[0.6vh]">
              <p className="text-ink/80 font-body text-[1.05vw]">
                Teresina (PI)
              </p>
              <p className="text-ink font-display text-[1.2vw] text-right">
                905.692 hab
              </p>
              <p className="text-ink/80 font-body text-[1.05vw]">
                Timon (MA)
              </p>
              <p className="text-ink font-display text-[1.2vw] text-right">
                182.711 hab
              </p>
              <p className="text-ink font-body text-[1.05vw] font-semibold border-t border-ink/15 pt-[0.6vh]">
                Conurbação
              </p>
              <p className="text-primary font-display text-[1.2vw] text-right border-t border-ink/15 pt-[0.6vh]">
                1.088.403 hab
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted font-body text-[0.95vw] tracking-[0.3em] uppercase mb-[1vh]">
              TAM consumidor · gasto anual da praça
            </p>
            <p className="font-display text-[2.4vw] text-ink font-light leading-none">
              ≈ R$ 750 milhões<span className="text-[1.2vw] text-ink/60">/ano</span>
            </p>
            <p className="text-ink/70 font-body text-[1vw] mt-[1vh] leading-snug">
              ~420 mil consumidores endereçáveis × R$ 1.200–2.000/ano. Esse é o
              bolo capturado pelos nossos clientes — não é nossa receita, mas
              dimensiona a saúde financeira da praça.
            </p>
          </div>
        </div>

        <div className="bg-cream/70 border-l-4 border-primary px-[2vw] py-[1.8vh] mt-auto">
          <p className="text-muted font-body text-[0.85vw] tracking-[0.3em] uppercase mb-[0.6vh]">
            Fontes primárias
          </p>
          <p className="text-ink/80 font-body text-[0.95vw] leading-snug">
            <span className="text-ink font-medium">IBGE Cidades</span> (cidades.ibge.gov.br/brasil/pi/teresina e /ma/timon) ·{" "}
            <span className="text-ink font-medium">Econodata / Receita Federal</span> (econodata.com.br/empresas/pi-teresina/cabeleireiros-...) ·{" "}
            <span className="text-ink font-medium">IBGE Concla</span> (concla.ibge.gov.br · CNAEs 9602-5/01 e 9602-5/02) ·{" "}
            <span className="text-ink font-medium">Sebrae Nacional</span> (agenciasebrae.com.br · setor de beleza 2023–2025)
          </p>
        </div>
      </div>
    </div>
  );
}
