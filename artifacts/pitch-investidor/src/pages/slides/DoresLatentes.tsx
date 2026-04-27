export default function DoresLatentes() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/40" />
      <div className="absolute top-[5vh] right-[6vw] flex items-center gap-[1vw] z-10">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">02 / 10</span>
      </div>
      <div className="relative z-10 w-full h-full flex flex-col px-[6vw] py-[6vh]">
        <div className="mb-[5vh]">
          <p className="text-accent font-body text-[1.05vw] tracking-[0.35em] uppercase mb-[2vh]">
            A dor traduzida em reais
          </p>
          <h2
            className="font-display text-[3.4vw] leading-[1] text-ink font-light max-w-[78vw]"
            style={{ textWrap: "balance" }}
          >
            O salão médio deixa entre <span className="italic text-primary">R$ 1.800 e R$ 3.000</span> na mesa todo mês.
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-[2.5vw] flex-1">
          <div className="col-span-7 bg-cream px-[2.6vw] py-[4vh] flex flex-col">
            <p className="text-accent font-body text-[0.78vw] tracking-[0.35em] uppercase mb-[3vh]">
              Como o cálculo é construído
            </p>

            <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-[2vw_1fr_auto] gap-x-[1.4vw] items-baseline pb-[2.2vh] border-b border-ink/10">
                <p className="font-display text-[1.5vw] text-primary font-medium">a</p>
                <div>
                  <p className="font-body text-[1.1vw] text-ink leading-tight">
                    Faturamento mensal do salão-alvo
                  </p>
                  <p className="font-body text-[0.85vw] text-muted italic mt-[0.5vh]">
                    Perfil 3–5 profissionais · GG Contabilidade
                  </p>
                </div>
                <p className="font-display text-[1.5vw] text-ink font-medium whitespace-nowrap">
                  R$ 30.000
                </p>
              </div>

              <div className="grid grid-cols-[2vw_1fr_auto] gap-x-[1.4vw] items-baseline py-[2.2vh] border-b border-ink/10">
                <p className="font-display text-[1.5vw] text-primary font-medium">b</p>
                <div>
                  <p className="font-body text-[1.1vw] text-ink leading-tight">
                    Faltas e horários vagos no setor
                  </p>
                  <p className="font-body text-[0.85vw] text-muted italic mt-[0.5vh]">
                    Estimativa setorial declarada — 10% da receita
                  </p>
                </div>
                <p className="font-display text-[1.5vw] text-ink/55 font-medium whitespace-nowrap">
                  − R$ 3.000
                </p>
              </div>

              <p className="text-deep font-body text-[0.78vw] tracking-[0.35em] uppercase mt-[3.5vh] mb-[1.5vh]">
                Receita recuperada com a Glow Upi
              </p>

              <div className="grid grid-cols-[2vw_1fr_auto] gap-x-[1.4vw] items-baseline py-[2.2vh] border-b border-ink/10">
                <p className="font-display text-[1.5vw] text-primary font-medium">c</p>
                <div>
                  <p className="font-body text-[1.1vw] text-ink leading-tight">
                    Lembretes automáticos reduzem faltas em até 30%
                  </p>
                  <p className="font-body text-[0.85vw] text-muted italic mt-[0.5vh]">
                    Sebrae citado por Frizzar
                  </p>
                </div>
                <p className="font-display text-[1.5vw] text-deep font-medium whitespace-nowrap">
                  + R$ 900
                </p>
              </div>

              <div className="grid grid-cols-[2vw_1fr_auto] gap-x-[1.4vw] items-baseline pt-[2.2vh]">
                <p className="font-display text-[1.5vw] text-primary font-medium">d</p>
                <div>
                  <p className="font-body text-[1.1vw] text-ink leading-tight">
                    Recompra ativa via histórico, app e e-mail (3–7%)
                  </p>
                  <p className="font-body text-[0.85vw] text-muted italic mt-[0.5vh]">
                    Base: 46% mudaram de salão pós-pandemia · Beauty Fair Summit
                  </p>
                </div>
                <p className="font-display text-[1.5vw] text-deep font-medium whitespace-nowrap">
                  + R$ 900 a 2.100
                </p>
              </div>
            </div>

            <div className="border-t-2 border-ink mt-[4vh] pt-[2.2vh] flex items-baseline justify-between">
              <p className="font-body text-[0.95vw] text-ink uppercase tracking-[0.2em]">
                Total recuperável por mês
              </p>
              <p className="font-display text-[2vw] text-primary font-medium">
                R$ 1.800 a R$ 3.000
              </p>
            </div>
          </div>

          <div className="col-span-5 flex flex-col gap-[2vh]">
            <div className="bg-deep text-cream px-[2vw] py-[3.5vh] flex-1 flex flex-col justify-center">
              <p className="text-primary font-body text-[0.78vw] tracking-[0.35em] uppercase mb-[2.5vh]">
                Decisão lógica do empresário
              </p>

              <p className="font-display text-[1.3vw] font-light leading-tight text-cream/70 mb-[1.5vh]">
                Ele paga
              </p>
              <p className="font-display text-[3.6vw] font-medium leading-none mb-[0.8vh]">
                R$ 164,<span className="text-[2.2vw]">50</span>
              </p>
              <p className="font-body text-[0.95vw] text-cream/55 mb-[4vh]">
                pela mensalidade da Glow Upi
              </p>

              <p className="font-display text-[1.3vw] font-light leading-tight text-cream/70 mb-[1.5vh]">
                E recupera
              </p>
              <p className="font-display text-[3vw] text-primary font-medium leading-none mb-[1.2vh]">
                11× a 18×
              </p>
              <p className="font-body text-[0.95vw] text-cream/70 leading-snug">
                esse valor todo mês — em receita que hoje simplesmente evapora.
              </p>
            </div>

            <div className="bg-cream border-l-4 border-primary px-[1.6vw] py-[1.8vh]">
              <p className="text-accent font-body text-[0.72vw] tracking-[0.35em] uppercase mb-[0.6vh]">
                O que é no-show
              </p>
              <p className="font-body text-[0.92vw] text-ink/75 leading-snug">Termo do setor para o cliente que agenda e não comparece sem avisar — horário reservado, outro cliente recusado, ninguém pagou por esse horário.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-ink/15 mt-[2.5vh] pt-[1.4vh] flex items-baseline justify-between">
          <p className="text-muted font-body text-[0.78vw] tracking-[0.3em] uppercase">
            Fontes do cálculo
          </p>
          <p className="font-body text-[0.82vw] text-ink/60">
            ggcontabilidade.com · blog.trinks.com · sebrae.com.br · barbeiro.app · negociosdebeleza.beautyfair.com.br
          </p>
        </div>
      </div>
    </div>
  );
}
