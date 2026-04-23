export default function ValidacaoAtual() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute inset-0 px-[6vw] py-[6vh] flex flex-col">
        <div className="flex items-center justify-between mb-[2.5vh]">
          <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase">
            06 · Onde estamos · honestidade ofensiva
          </p>
          <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">
            06 / 09
          </span>
        </div>

        <h2
          className="font-display text-[3.6vw] leading-[1] text-ink font-light mb-[2vh]"
          style={{ textWrap: "balance" }}
        >
          O que <span className="italic text-primary">já está validado</span> e o que o aporte vai descobrir.
        </h2>

        <p className="text-ink/75 font-body text-[1.15vw] leading-snug max-w-[72vw] mb-[3vh]">
          Métricas reais de SaaS — CAC, conversão, retenção — só existem com
          operação de aquisição rodando. Esse é exatamente o objetivo dos
          R$ 19.700: gerar os primeiros dados para destravar a próxima rodada.
        </p>

        <div className="grid grid-cols-2 gap-[2vw] flex-1">
          <div className="bg-deep text-cream p-[3vh_2vw] flex flex-col">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[1.2vw] h-[1.2vw] rounded-full bg-primary" />
              <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase">
                Já validado · base do negócio
              </p>
            </div>

            <div className="space-y-[1.6vh] flex-1">
              <div>
                <p className="font-display text-[1.35vw] font-medium leading-tight">
                  Produto em produção
                </p>
                <p className="text-cream/75 font-body text-[1vw] leading-snug">
                  SaaS multi-inquilino rodando hoje em Replit. Web responsiva
                  e app nativo iOS/Android publicáveis nas lojas.
                </p>
              </div>

              <div>
                <p className="font-display text-[1.35vw] font-medium leading-tight">
                  Infraestrutura quitada
                </p>
                <p className="text-cream/75 font-body text-[1vw] leading-snug">
                  R$ 208/mês em custo fixo (Replit US$ 20 + Brevo R$ 87 +
                  Hostinger R$ 11). Tudo contratado e verificável.
                </p>
              </div>

              <div>
                <p className="font-display text-[1.35vw] font-medium leading-tight">
                  TAM com fonte primária
                </p>
                <p className="text-cream/75 font-body text-[1vw] leading-snug">
                  5.200 estabelecimentos formais em Teresina+Timon, auditáveis
                  via Receita Federal/Econodata e IBGE.
                </p>
              </div>

              <div>
                <p className="font-display text-[1.35vw] font-medium leading-tight">
                  Concorrência mapeada
                </p>
                <p className="text-cream/75 font-body text-[1vw] leading-snug">
                  Faixa de preço (R$ 39 a R$ 199/mês) calibrada com Trinks,
                  Belezix, Programa Salão e Simples Agenda.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-cream border-2 border-primary/40 p-[3vh_2vw] flex flex-col">
            <div className="flex items-center gap-[0.8vw] mb-[2vh]">
              <div className="w-[1.2vw] h-[1.2vw] rounded-full bg-accent" />
              <p className="text-accent font-body text-[1vw] tracking-[0.3em] uppercase">
                Ainda em descoberta · meta dos 6 meses
              </p>
            </div>

            <div className="space-y-[1.6vh] flex-1">
              <div>
                <p className="font-display text-[1.35vw] text-ink font-medium leading-tight">
                  CAC real (Custo de Aquisição)
                </p>
                <p className="text-ink/75 font-body text-[1vw] leading-snug">
                  Meta Ads ainda não rodou em escala. Aporte de R$ 6.400 em
                  mídia visa medir o custo real por cliente pagante na praça.
                </p>
              </div>

              <div>
                <p className="font-display text-[1.35vw] text-ink font-medium leading-tight">
                  Conversão do funil
                </p>
                <p className="text-ink/75 font-body text-[1vw] leading-snug">
                  Sem visitas pagas em volume, não temos taxa real de
                  visitante → trial → pagante. Os primeiros 30 a 50 clientes
                  resolvem isso.
                </p>
              </div>

              <div>
                <p className="font-display text-[1.35vw] text-ink font-medium leading-tight">
                  Retenção e churn
                </p>
                <p className="text-ink/75 font-body text-[1vw] leading-snug">
                  Sem coorte de pagantes ativa há 12 meses, churn ainda é
                  estimativa. Dado real só após 6 meses de operação contínua.
                </p>
              </div>

              <div>
                <p className="font-display text-[1.35vw] text-ink font-medium leading-tight">
                  LTV verificado
                </p>
                <p className="text-ink/75 font-body text-[1vw] leading-snug">
                  Lifetime Value depende de churn e ARPA observados. Será
                  recalculado a cada trimestre com dados próprios.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-ink text-cream px-[2vw] py-[1.8vh] mt-[2vh]">
          <p className="font-body text-[1.05vw] leading-snug">
            <span className="text-primary font-semibold tracking-wide uppercase text-[0.9vw]">
              Posicionamento honesto
            </span>{" "}
            · O aporte de R$ 19.700 é capital de descoberta, não de escala.
            Existe para transformar premissas em métricas auditáveis nos
            próximos 6 meses — e destravar a próxima rodada com dados próprios.
          </p>
        </div>
      </div>
    </div>
  );
}
