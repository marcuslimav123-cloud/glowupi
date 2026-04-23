export default function DoresLatentes() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/40" />
      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw]">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">02 / 08</span>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col px-[6vw] py-[7vh]">
        <div className="mb-[4vh] max-w-[78vw]">
          <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2.5vh]">
            O verdadeiro custo da informalidade
          </p>
          <h2
            className="font-display text-[4vw] leading-[1] text-ink font-light"
            style={{ textWrap: "balance" }}
          >
            A profissional de beleza não perde apenas horários.
            <span className="italic text-primary"> Perde dinheiro, perde cliente, perde mercado.</span>
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-[1.5vw] flex-1">
          <div className="bg-cream p-[3vh_1.8vw] flex flex-col">
            <p className="font-display text-[2.6vw] text-primary font-medium leading-none mb-[1.5vh]">01</p>
            <p className="font-display text-[1.5vw] text-ink font-medium leading-tight mb-[1.5vh]">
              Receita que evapora
            </p>
            <p className="text-ink/75 font-body text-[1.1vw] leading-snug">
              Cliente que não recebe lembrete falta. Cliente que falta uma vez,
              raramente retorna. Sem histórico, não há reativação. O caixa
              encolhe sem que ela perceba a causa.
            </p>
          </div>

          <div className="bg-cream p-[3vh_1.8vw] flex flex-col">
            <p className="font-display text-[2.6vw] text-primary font-medium leading-none mb-[1.5vh]">02</p>
            <p className="font-display text-[1.5vw] text-ink font-medium leading-tight mb-[1.5vh]">
              Tempo virando custo
            </p>
            <p className="text-ink/75 font-body text-[1.1vw] leading-snug">
              Duas a três horas por dia respondendo WhatsApp, conferindo agenda
              em caderno, recalculando comissões manualmente. Tempo de atendimento
              transformado em tempo de administração improdutiva.
            </p>
          </div>

          <div className="bg-cream p-[3vh_1.8vw] flex flex-col">
            <p className="font-display text-[2.6vw] text-primary font-medium leading-none mb-[1.5vh]">03</p>
            <p className="font-display text-[1.5vw] text-ink font-medium leading-tight mb-[1.5vh]">
              Atraso tecnológico
            </p>
            <p className="text-ink/75 font-body text-[1.1vw] leading-snug">
              Enquanto redes de barbearia e franquias adotam aplicativos, agenda
              online e marketing automatizado, o salão independente segue no
              analógico — e se torna a alternativa menos profissional aos olhos
              do cliente jovem.
            </p>
          </div>

          <div className="bg-ink text-cream p-[3vh_1.8vw] flex flex-col">
            <p className="font-display text-[2.6vw] text-primary font-medium leading-none mb-[1.5vh]">04</p>
            <p className="font-display text-[1.5vw] font-medium leading-tight mb-[1.5vh]">
              Negócio sem dados
            </p>
            <p className="text-cream/85 font-body text-[1.1vw] leading-snug">
              Não sabe qual serviço dá mais lucro, qual cliente vale mais, qual
              profissional rende. Sem informação, decide por intuição — e perde
              poder de barganha com fornecedores, bancos e investidores.
            </p>
          </div>
        </div>

        <div className="border-t border-ink/15 pt-[2.5vh] mt-[3vh] flex items-center justify-between">
          <p className="text-muted font-body text-[1.15vw] italic">
            Não é um problema de agendamento. É um problema de gestão financeira disfarçado de planilha esquecida.
          </p>
          <p className="text-ink font-display text-[1.4vw] italic">
            <span className="text-primary not-italic">→</span> Glow Upi resolve no produto.
          </p>
        </div>
      </div>
    </div>
  );
}
