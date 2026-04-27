export default function ValidacaoAtual() {
  const validados = [
    {
      title: "Produto em produção",
      body: "SaaS multi-inquilino rodando hoje em Replit. Painel web responsivo e PWA instalável no celular. App nativo iOS/Android no roadmap pós-aporte.",
    },
    {
      title: "Infraestrutura quitada",
      body: "R$ 208/mês em custo fixo (Replit US$ 20 + Brevo R$ 87 + Hostinger R$ 11). Tudo contratado e verificável.",
    },
    {
      title: "TAM com fonte primária",
      body: "5.200 estabelecimentos formais em Teresina+Timon, auditáveis via Receita Federal/Econodata e IBGE.",
    },
    {
      title: "Concorrência mapeada",
      body: "Concorrência mapeada e verificada na web: Avec (negocios.avec.app), AppBeleza (appbeleza.com.br) e MinhaAgenda (minhaagendaapp.com.br).",
    },
  ];

  const descobrir = [
    {
      title: "CAC real (Custo de Aquisição)",
      body: "Meta Ads ainda não rodou em escala. Aporte de R$ 6.400 em mídia visa medir o custo real por cliente pagante na praça.",
    },
    {
      title: "Conversão do funil",
      body: "Sem visitas pagas em volume, não temos taxa real de visitante → trial → pagante. Os primeiros 30 a 50 clientes resolvem isso.",
    },
    {
      title: "Retenção e churn",
      body: "Sem coorte de pagantes ativa há 12 meses, churn ainda é estimativa. Dado real só após 6 meses de operação contínua.",
    },
    {
      title: "LTV verificado",
      body: "Lifetime Value depende de churn e ARPA observados. Será recalculado a cada trimestre com dados próprios.",
    },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute inset-0 px-[6vw] py-[5vh] flex flex-col">
        <div className="flex items-center justify-between mb-[3vh]">
          <p className="text-accent font-body text-[1.05vw] tracking-[0.35em] uppercase">
            06 · Onde estamos · honestidade ofensiva
          </p>
          <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">
            06 / 10
          </span>
        </div>

        <h2
          className="font-display text-[3.4vw] leading-[1.05] text-ink font-light mb-[2vh]"
          style={{ textWrap: "balance" }}
        >
          O que <span className="italic text-primary">já está validado</span> e o que o aporte vai descobrir.
        </h2>

        <p className="text-ink/65 font-body text-[1.05vw] leading-snug max-w-[72vw] mb-[3.5vh]">
          Métricas reais de SaaS — CAC, conversão, retenção — só existem com
          operação de aquisição rodando. Esse é exatamente o objetivo dos
          R$ 19.700.
        </p>

        <div className="grid grid-cols-2 gap-[2vw] flex-1">
          <div className="bg-deep text-cream px-[2.2vw] py-[3.5vh] flex flex-col">
            <div className="flex items-center gap-[0.8vw] mb-[3vh]">
              <div className="w-[1vw] h-[1vw] rounded-full bg-primary" />
              <p className="text-primary font-body text-[0.85vw] tracking-[0.35em] uppercase">
                Já validado · base do negócio
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              {validados.map((item, i) => (
                <div
                  key={item.title}
                  className={i > 0 ? "border-t border-cream/15 pt-[2vh] mt-[2vh]" : ""}
                >
                  <p className="font-display text-[1.3vw] font-medium leading-tight mb-[0.4vh]">
                    {item.title}
                  </p>
                  <p className="text-cream/70 font-body text-[0.95vw] leading-snug">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-cream border-2 border-primary/30 px-[2.2vw] py-[3.5vh] flex flex-col">
            <div className="flex items-center gap-[0.8vw] mb-[3vh]">
              <div className="w-[1vw] h-[1vw] rounded-full bg-accent" />
              <p className="text-accent font-body text-[0.85vw] tracking-[0.35em] uppercase">
                Ainda em descoberta · meta dos 6 meses
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              {descobrir.map((item, i) => (
                <div
                  key={item.title}
                  className={i > 0 ? "border-t border-ink/10 pt-[2vh] mt-[2vh]" : ""}
                >
                  <p className="font-display text-[1.3vw] text-ink font-medium leading-tight mb-[0.4vh]">
                    {item.title}
                  </p>
                  <p className="text-ink/70 font-body text-[0.95vw] leading-snug">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-ink text-cream px-[2vw] py-[1.8vh] mt-[2.5vh]">
          <p className="font-body text-[1vw] leading-snug">
            <span className="text-primary font-semibold tracking-[0.25em] uppercase text-[0.85vw] mr-[0.8vw]">
              Posicionamento honesto
            </span>
            O aporte de R$ 19.700 é capital de descoberta, não de escala.
            Existe para transformar premissas em métricas auditáveis nos
            próximos 6 meses — e destravar a próxima rodada com dados próprios.
          </p>
        </div>
      </div>
    </div>
  );
}
