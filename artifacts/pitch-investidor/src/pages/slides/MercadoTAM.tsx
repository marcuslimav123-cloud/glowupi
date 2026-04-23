export default function MercadoTAM() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/40" />

      <div className="relative w-full h-full flex flex-col px-[6vw] py-[5vh]">
        <div className="flex items-center justify-between mb-[3vh]">
          <p className="text-accent font-body text-[1.05vw] tracking-[0.35em] uppercase">
            05 · Dimensionamento do mercado
          </p>
          <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">
            05 / 09
          </span>
        </div>

        <h2
          className="font-display text-[3.4vw] leading-[1.05] text-ink font-light mb-[2vh]"
          style={{ textWrap: "balance" }}
        >
          TAM, SAM e SOM. <span className="italic text-primary">Com fonte primária.</span>
        </h2>

        <p className="text-ink/65 font-body text-[1.05vw] leading-snug max-w-[68vw] mb-[4vh]">
          O universo endereçável da Glow Upi é a praça conurbada{" "}
          <span className="text-ink font-semibold">Teresina + Timon</span>,
          separada apenas pelo Rio Parnaíba.
        </p>

        <div className="grid grid-cols-3 gap-[1.8vw] mb-[3vh]">
          <div className="bg-ink text-cream px-[1.8vw] py-[3vh] flex flex-col min-h-[26vh]">
            <p className="text-primary font-body text-[0.95vw] tracking-[0.35em] uppercase mb-[1.5vh]">
              TAM · ofertante
            </p>
            <p className="font-display text-[3.4vw] text-cream font-light leading-none mb-[1vh]">
              5.200
            </p>
            <p className="text-cream/55 font-body text-[0.9vw] mb-[2.5vh]">
              estabelecimentos formais
            </p>
            <p className="text-cream/80 font-body text-[1vw] leading-snug mt-auto">
              CNPJs ativos nos CNAEs 9602-5/01 e 9602-5/02 em Teresina (~4.700)
              e Timon (~500).
            </p>
          </div>

          <div className="bg-cream px-[1.8vw] py-[3vh] flex flex-col min-h-[26vh]">
            <p className="text-accent font-body text-[0.95vw] tracking-[0.35em] uppercase mb-[1.5vh]">
              SAM · qualificado
            </p>
            <p className="font-display text-[3.4vw] text-ink font-light leading-none mb-[1vh]">
              2.100
            </p>
            <p className="text-ink/55 font-body text-[0.9vw] mb-[2.5vh]">
              ~40% do TAM
            </p>
            <p className="text-ink/75 font-body text-[1vw] leading-snug mt-auto">
              Estabelecimentos com 3 a 5 profissionais e capacidade real de
              pagar mensalidade SaaS.
            </p>
          </div>

          <div className="bg-bg border-2 border-primary px-[1.8vw] py-[3vh] flex flex-col min-h-[26vh]">
            <p className="text-primary font-body text-[0.95vw] tracking-[0.35em] uppercase mb-[1.5vh]">
              SOM · alcançável 5 anos
            </p>
            <p className="font-display text-[3.4vw] text-ink font-light leading-none mb-[1vh]">
              525 a 630
            </p>
            <p className="text-ink/55 font-body text-[0.9vw] mb-[2.5vh]">
              ~10–12% do TAM
            </p>
            <p className="text-ink/75 font-body text-[1vw] leading-snug mt-auto">
              Captáveis em 5 anos por Meta Ads e indicação, descontada a
              concorrência (Trinks, Belezix, Programa Salão).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-y border-ink/15 py-[1.5vh] mb-[3vh]">
          <div className="flex items-baseline gap-[1.5vw]">
            <p className="text-accent font-body text-[0.78vw] tracking-[0.35em] uppercase">
              Perfil financeiro do estabelecimento alvo (SAM)
            </p>
            <p className="font-body text-[0.95vw] text-ink/70 italic">
              Salão de 3 a 5 profissionais
            </p>
          </div>
          <div className="flex items-baseline gap-[1vw]">
            <p className="font-display text-[1.6vw] text-ink font-medium leading-none">
              R$ 25k a R$ 50k<span className="text-[0.95vw] text-ink/55">/mês</span>
            </p>
            <p className="font-body text-[0.78vw] text-muted italic">
              fonte: GG Contabilidade · blog Trinks
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[3vw] flex-1">
          <div>
            <p className="text-muted font-body text-[0.85vw] tracking-[0.3em] uppercase mb-[1.5vh]">
              Demografia da praça · IBGE 2025
            </p>
            <div className="space-y-[1vh]">
              <div className="flex items-baseline justify-between">
                <p className="text-ink/75 font-body text-[1.05vw]">Teresina (PI)</p>
                <p className="text-ink font-display text-[1.25vw]">905.692 hab</p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-ink/75 font-body text-[1.05vw]">Timon (MA)</p>
                <p className="text-ink font-display text-[1.25vw]">182.711 hab</p>
              </div>
              <div className="border-t border-ink/15 pt-[1vh] flex items-baseline justify-between">
                <p className="text-ink font-body text-[1.05vw] font-semibold">Conurbação</p>
                <p className="text-primary font-display text-[1.4vw]">1.088.403 hab</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-muted font-body text-[0.85vw] tracking-[0.3em] uppercase mb-[1.5vh]">
              Premissas do recorte SAM · SOM
            </p>
            <div className="space-y-[1vh]">
              <p className="text-ink/75 font-body text-[0.95vw] leading-snug">
                · 35–40% dos CNPJs têm o dono como único profissional (perfil
                planilha, baixa conversão para SaaS).
              </p>
              <p className="text-ink/75 font-body text-[0.95vw] leading-snug">
                · 15–20% já usam algum software (Trinks, Belezix, Programa Salão,
                Simples Agenda) — concorrência direta.
              </p>
              <p className="text-ink/75 font-body text-[0.95vw] leading-snug">
                · ~10% têm faturamento abaixo do mínimo viável.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-ink/15 pt-[1.2vh] mt-[2vh] flex items-baseline justify-between">
          <p className="text-muted font-body text-[0.78vw] tracking-[0.3em] uppercase">
            Fontes primárias
          </p>
          <p className="font-body text-[0.85vw] text-ink/65">
            IBGE Cidades · Econodata / Receita Federal · IBGE Concla · Sebrae Nacional
          </p>
        </div>
      </div>
    </div>
  );
}
