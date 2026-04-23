export default function DoresLatentes() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/40" />
      <div className="absolute top-[5vh] right-[6vw] flex items-center gap-[1vw]">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">02 / 09</span>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col px-[6vw] py-[5.5vh]">
        <div className="mb-[3vh] max-w-[78vw]">
          <p className="text-accent font-body text-[1.05vw] tracking-[0.35em] uppercase mb-[2vh]">
            A dor traduzida em reais
          </p>
          <h2
            className="font-display text-[3.4vw] leading-[1] text-ink font-light"
            style={{ textWrap: "balance" }}
          >
            O salão médio deixa entre <span className="italic text-primary">R$ 1.800 e R$ 3.000</span> na mesa todo mês.
          </h2>
          <p className="text-ink/70 font-body text-[1.1vw] mt-[1.8vh] leading-snug max-w-[68vw]">
            Glow Upi custa R$ 164,50/mês. O que se recupera com agenda
            inteligente e relacionamento ativo paga o software entre{" "}
            <span className="text-ink font-semibold">11 e 18 vezes</span> — todo mês.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-[1.5vw] flex-1">
          <div className="col-span-7 bg-cream p-[2.5vh_2vw] flex flex-col">
            <p className="text-accent font-body text-[0.95vw] tracking-[0.3em] uppercase mb-[1.5vh]">
              Como o cálculo é construído
            </p>

            <div className="grid grid-cols-[auto_1fr_auto] gap-x-[1.5vw] gap-y-[1.4vh] items-baseline">
              <p className="font-display text-[1.6vw] text-primary font-medium">a</p>
              <div>
                <p className="font-body text-[1.1vw] text-ink leading-snug">
                  Faturamento mensal do salão-alvo (3 a 5 profissionais)
                </p>
                <p className="font-body text-[0.85vw] text-muted italic">
                  Fonte: GG Contabilidade · Blog Trinks
                </p>
              </div>
              <p className="font-display text-[1.4vw] text-ink font-medium whitespace-nowrap">
                R$ 30.000
              </p>

              <p className="font-display text-[1.6vw] text-primary font-medium">b</p>
              <div>
                <p className="font-body text-[1.1vw] text-ink leading-snug">
                  Faltas e horários vagos (estimativa setorial: 10% da receita)
                </p>
                <p className="font-body text-[0.85vw] text-muted italic">
                  Receita perdida: R$ 3.000/mês
                </p>
              </div>
              <p className="font-display text-[1.4vw] text-ink/60 font-medium whitespace-nowrap">
                10%
              </p>

              <p className="font-display text-[1.6vw] text-primary font-medium">c</p>
              <div>
                <p className="font-body text-[1.1vw] text-ink leading-snug">
                  Recuperação com lembretes automáticos (até 30% das faltas)
                </p>
                <p className="font-body text-[0.85vw] text-muted italic">
                  Fonte: Sebrae citado por Frizzar
                </p>
              </div>
              <p className="font-display text-[1.4vw] text-deep font-medium whitespace-nowrap">
                + R$ 900
              </p>

              <p className="font-display text-[1.6vw] text-primary font-medium">d</p>
              <div>
                <p className="font-body text-[1.1vw] text-ink leading-snug">
                  Recompra ativa via histórico + app + e-mail (3 a 7% da receita)
                </p>
                <p className="font-body text-[0.85vw] text-muted italic">
                  Base: 46% dos clientes não voltaram pós-pandemia · Beauty Fair Summit
                </p>
              </div>
              <p className="font-display text-[1.4vw] text-deep font-medium whitespace-nowrap">
                + R$ 900 a 2.100
              </p>
            </div>

            <div className="border-t-2 border-ink mt-auto pt-[1.5vh] flex items-baseline justify-between">
              <p className="font-body text-[1.05vw] text-ink uppercase tracking-wide">
                Recuperável por mês com a Glow Upi
              </p>
              <p className="font-display text-[2vw] text-primary font-medium">
                R$ 1.800 a R$ 3.000
              </p>
            </div>
          </div>

          <div className="col-span-5 flex flex-col gap-[1.2vh]">
            <div className="bg-ink text-cream p-[2.5vh_1.8vw] flex-1 flex flex-col">
              <p className="text-primary font-body text-[0.85vw] tracking-[0.35em] uppercase mb-[1vh]">
                O que é no-show
              </p>
              <p className="font-body text-[1vw] text-cream/85 leading-snug">
                Termo do setor para o cliente que agenda e não comparece sem
                avisar. É a principal causa de perda silenciosa de receita em
                salões e barbearias — o horário foi reservado, recusou outro
                cliente, e ninguém pagou por ele.
              </p>
            </div>

            <div className="bg-cream p-[2vh_1.8vw]">
              <p className="text-accent font-body text-[0.85vw] tracking-[0.35em] uppercase mb-[0.8vh]">
                ROI sobre a mensalidade
              </p>
              <p className="font-display text-[2.2vw] text-ink font-medium leading-none">
                11× <span className="text-ink/40 text-[1.4vw]">a</span> 18×
              </p>
              <p className="font-body text-[0.95vw] text-ink/70 mt-[0.6vh]">
                Glow Upi (R$ 164,50) cabe entre 11 e 18 vezes dentro do que o
                salão recupera todo mês.
              </p>
            </div>

            <div className="bg-bg border border-ink/15 p-[1.4vh_1.5vw]">
              <p className="text-muted font-body text-[0.75vw] tracking-[0.3em] uppercase mb-[0.5vh]">
                Fontes do cálculo
              </p>
              <p className="font-body text-[0.85vw] text-ink/80 leading-snug">
                ggcontabilidade.com/quanto-fatura-um-salao-de-beleza-pequeno ·
                blog.trinks.com/faturamento-de-salao-de-beleza ·
                sebrae.com.br/.../como-cobrar-o-preco-correto · Beauty Fair
                Summit (negociosdebeleza.beautyfair.com.br)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
