export default function SolucaoGlowUpi() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div className="absolute top-0 right-0 w-[45vw] h-full bg-cream" />
      <div className="absolute top-[6vh] right-[6vw] flex items-center gap-[1vw] z-20">
        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary" />
        <span className="text-muted font-body text-[1vw] tracking-[0.3em] uppercase">03 / 08</span>
      </div>

      <div className="relative z-10 w-full h-full grid grid-cols-12 px-[6vw] py-[7vh] gap-[3vw]">
        <div className="col-span-5 flex flex-col justify-between pr-[2vw]">
          <div>
            <p className="text-accent font-body text-[1.1vw] tracking-[0.35em] uppercase mb-[2.5vh]">
              Plataforma Glow Upi
            </p>
            <h2
              className="font-display text-[4.4vw] leading-[0.98] text-ink font-light mb-[3.5vh]"
              style={{ textWrap: "balance" }}
            >
              Um sistema. <span className="italic text-primary">Toda a operação.</span>
            </h2>
            <p className="text-ink/75 font-body text-[1.4vw] leading-snug font-light">
              SaaS multi-inquilino — cada estabelecimento opera em ambiente
              isolado, com dados próprios, identidade visual própria e sua
              base de clientes protegida. A escala é técnica: novos
              clientes não exigem novo desenvolvimento.
            </p>
          </div>

          <div className="border-t border-ink/15 pt-[2.5vh]">
            <p className="text-primary font-body text-[1vw] tracking-[0.3em] uppercase mb-[1vh]">
              Estado atual
            </p>
            <p className="font-display text-[1.7vw] text-ink font-light italic leading-tight">
              Em produção. Em loja.
              <span className="text-primary not-italic"> Pronto para escalar.</span>
            </p>
            <p className="text-muted font-body text-[1vw] mt-[0.8vh] tracking-wide">
              SaaS · Software como Serviço (assinatura mensal recorrente)
            </p>
          </div>
        </div>

        <div className="col-span-7 grid grid-cols-2 gap-[1.5vh_1.8vw] content-center">
          <div className="border-l-2 border-primary pl-[1.4vw]">
            <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">Agenda inteligente</p>
            <p className="text-ink/70 font-body text-[1.1vw] mt-[0.6vh] leading-snug">
              Confirmações e lembretes automáticos por WhatsApp e e-mail.
              Reduz falta e dobra ocupação.
            </p>
          </div>
          <div className="border-l-2 border-primary pl-[1.4vw]">
            <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">Ficha digital</p>
            <p className="text-ink/70 font-body text-[1.1vw] mt-[0.6vh] leading-snug">
              Histórico completo de cada cliente, anamnese, fotos de antes
              e depois, alergias e preferências.
            </p>
          </div>
          <div className="border-l-2 border-primary pl-[1.4vw]">
            <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">Aplicativo nativo</p>
            <p className="text-ink/70 font-body text-[1.1vw] mt-[0.6vh] leading-snug">
              iOS e Android para a profissional e para o cliente final.
              Marca a presença digital que faltava.
            </p>
          </div>
          <div className="border-l-2 border-primary pl-[1.4vw]">
            <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">Pagamentos integrados</p>
            <p className="text-ink/70 font-body text-[1.1vw] mt-[0.6vh] leading-snug">
              Cobrança recorrente via Stripe com gestão de inadimplência
              embutida no painel.
            </p>
          </div>
          <div className="border-l-2 border-primary pl-[1.4vw]">
            <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">E-mail marketing</p>
            <p className="text-ink/70 font-body text-[1.1vw] mt-[0.6vh] leading-snug">
              Campanhas nativas, segmentação por histórico, reativação
              de clientes inativos sem ferramenta externa.
            </p>
          </div>
          <div className="border-l-2 border-primary pl-[1.4vw]">
            <p className="font-display text-[1.55vw] text-ink font-medium leading-tight">Painel financeiro</p>
            <p className="text-ink/70 font-body text-[1.1vw] mt-[0.6vh] leading-snug">
              Comissões automáticas, fluxo de caixa, relatório por serviço
              e por profissional. Decisão baseada em dado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
