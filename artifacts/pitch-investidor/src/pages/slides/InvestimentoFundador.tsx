export default function InvestimentoFundador() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw]">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">07 / 10</span>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-center px-[8vw]">
        <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2.5vh]">
          Capital próprio já aplicado
        </p>
        <h2
          className="font-display text-[4.6vw] leading-[0.98] text-ink font-light mb-[5vh] max-w-[80vw]"
          style={{ textWrap: "balance" }}
        >
          Antes de pedir, eu já apliquei <span className="italic text-primary">R$ 4.828</span> e meses de trabalho integral.
        </h2>

        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="bg-cream p-[3vh_2.2vw] flex flex-col justify-between min-h-[32vh]">
            <div>
              <p className="text-muted font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Capital tangível
              </p>
              <p className="font-display text-[3.2vw] text-ink font-medium leading-none mb-[2vh]">
                R$ 4.828
              </p>
              <ul className="text-ink/80 font-body text-[1.1vw] leading-snug space-y-[1vh]">
                <li>US$ 923,45 (R$ 4.611) em ferramentas de desenvolvimento e infraestrutura</li>
                <li>R$ 130 em hospedagem Hostinger</li>
                <li>R$ 87/mês recorrente em e-mail marketing</li>
              </ul>
            </div>
            <p className="text-accent font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              Bolso do fundador
            </p>
          </div>

          <div className="bg-ink p-[3vh_2.2vw] flex flex-col justify-between min-h-[32vh] relative">
            <div>
              <p className="text-primary font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Trabalho aplicado
              </p>
              <p className="font-display text-[3.2vw] text-cream font-medium leading-none mb-[2vh]">
                Tempo integral
              </p>
              <p className="text-cream/85 font-body text-[1.1vw] leading-snug">
                Desenvolvimento fullstack do produto, arquitetura,
                design, integrações de pagamento e operação.
                Sem pro-labore, sem custo para a empresa desde
                a concepção.
              </p>
            </div>
            <p className="text-primary font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              Sem pro-labore
            </p>
          </div>

          <div className="bg-cream p-[3vh_2.2vw] flex flex-col justify-between min-h-[32vh] border border-primary/30">
            <div>
              <p className="text-muted font-body text-[1vw] tracking-[0.25em] uppercase mb-[1.5vh]">
                Conhecimento aplicado
              </p>
              <p className="font-display text-[3.2vw] text-ink font-medium leading-none mb-[2vh]">
                Dev + Marketing
              </p>
              <p className="text-ink/80 font-body text-[1.1vw] leading-snug">
                Sistema 100% próprio, sem agência ou CTO
                contratado. Estratégia de aquisição apoiada em
                repertório de Fórmula de Lançamento (Érico Rocha)
                — materializada neste deck e no funil planejado.
              </p>
            </div>
            <p className="text-accent font-body text-[1vw] tracking-[0.2em] uppercase mt-[2vh]">
              Capital intelectual
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-[2vw] border-t border-ink/15 mt-[4vh] pt-[2.5vh]">
          <div className="col-span-8">
            <p className="text-accent font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">
              Razão de comprometimento
            </p>
            <p className="font-display text-[1.5vw] text-ink font-light italic leading-tight">
              Aporte solicitado <span className="text-primary not-italic">R$ 19.700</span> = aproximadamente 4× o capital tangível já investido pelo fundador, somado a meses de trabalho integral não remunerado.
            </p>
          </div>
          <div className="col-span-4 text-right">
            <p className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase mb-[0.5vh]">
              Recorrente assumido
            </p>
            <p className="font-display text-[1.6vw] text-ink font-medium leading-none">
              R$ 87 / mês
            </p>
            <p className="text-ink/60 font-body text-[0.9vw] mt-[0.5vh]">
              E-mail marketing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
