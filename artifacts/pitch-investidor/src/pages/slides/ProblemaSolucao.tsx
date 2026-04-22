export default function ProblemaSolucao() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 right-0 w-[42vw] h-full bg-cream" />
      <div className="absolute top-[6vh] left-[6vw] w-[3vw] h-[3vw] rounded-full border border-primary/40" />

      <div className="relative z-10 w-full h-full grid grid-cols-2 px-[6vw] py-[8vh]">
        <div className="flex flex-col justify-between pr-[4vw]">
          <div>
            <p className="text-primary font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[3vh]">
              01 · O Mercado Hoje
            </p>
            <h2
              className="font-display text-[4.8vw] leading-[0.95] text-ink font-light mb-[4vh]"
              style={{ textWrap: "balance" }}
            >
              Caderno, WhatsApp <span className="italic text-muted">e</span> esquecimento.
            </h2>
            <p className="text-ink/75 font-body text-[1.5vw] leading-snug max-w-[36vw] font-light">
              Salões e clínicas de estética em Teresina perdem clientes
              todos os dias por agenda manual, falta de lembrete e zero histórico.
              Quem some, some — não há resgate.
            </p>
          </div>

          <div className="flex gap-[3vw] border-t border-ink/15 pt-[3vh]">
            <div>
              <p className="font-display text-[3.2vw] text-primary font-medium leading-none">
                73%
              </p>
              <p className="text-muted font-body text-[1.1vw] mt-[1vh] max-w-[12vw] leading-tight">
                não retornam após 1ª visita sem follow-up
              </p>
            </div>
            <div>
              <p className="font-display text-[3.2vw] text-primary font-medium leading-none">
                R$ 0
              </p>
              <p className="text-muted font-body text-[1.1vw] mt-[1vh] max-w-[12vw] leading-tight">
                investido em CRM pela maioria dos salões
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between pl-[4vw] border-l border-primary/30">
          <div>
            <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[3vh]">
              02 · A Glow Upi
            </p>
            <h2
              className="font-display text-[4.8vw] leading-[0.95] text-ink font-light mb-[4vh]"
              style={{ textWrap: "balance" }}
            >
              SaaS multi-tenant <span className="italic text-accent">pronto.</span>
            </h2>
            <p className="text-ink/75 font-body text-[1.5vw] leading-snug font-light">
              Agenda inteligente, ficha digital, lembretes automáticos por
              WhatsApp e e-mail marketing nativo. Cada estabelecimento é uma
              conta isolada — escala sem refazer nada.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-[2vh] border-t border-ink/15 pt-[3vh]">
            <div className="flex items-center gap-[1vw]">
              <span className="text-primary text-[1.4vw]">→</span>
              <p className="text-ink font-body text-[1.3vw] font-medium">App nativo iOS/Android</p>
            </div>
            <div className="flex items-center gap-[1vw]">
              <span className="text-primary text-[1.4vw]">→</span>
              <p className="text-ink font-body text-[1.3vw] font-medium">Painel web completo</p>
            </div>
            <div className="flex items-center gap-[1vw]">
              <span className="text-primary text-[1.4vw]">→</span>
              <p className="text-ink font-body text-[1.3vw] font-medium">Pagamentos integrados</p>
            </div>
            <div className="flex items-center gap-[1vw]">
              <span className="text-primary text-[1.4vw]">→</span>
              <p className="text-ink font-body text-[1.3vw] font-medium">E-mail marketing nativo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
