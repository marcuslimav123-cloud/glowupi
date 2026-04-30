export default function Slide5ClubeGlow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#FAFAFA] flex flex-col px-[8vw] py-[6vh] box-border" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background accents */}
      <div className="absolute top-[12vh] right-[8vw] w-[2.5vw] h-[2.5vw] rounded-full bg-[#F97316] opacity-20" />
      <div className="absolute bottom-[15vh] left-[6vw] w-[5vw] h-[5vw] rounded-full bg-[#4F46E5] opacity-[0.06]" />
      <div className="absolute top-[55vh] right-[30vw] w-[1vw] h-[1vw] rounded-[0.2vw] bg-[#F97316] opacity-30 rotate-45" />

      {/* Header */}
      <div className="flex justify-between items-start z-10 mb-[5vh]">
        <div className="max-w-[60vw]">
          <div className="inline-flex items-center gap-[0.5vw] px-[1vw] py-[0.5vh] bg-[#F97316]/15 rounded-[2vw] mb-[2vh]">
            <div className="w-[0.5vw] h-[0.5vw] bg-[#F97316] rounded-full" />
            <span className="text-[0.9vw] font-semibold text-[#F97316] uppercase tracking-wider">
              Sua ideia, refinada
            </span>
          </div>
          <h2 className="text-[3.2vw] font-extrabold text-[#111827] m-0 tracking-tighter leading-[1.05]" style={{ textWrap: "balance" }}>
            Cartão multi-serviço — virou
            <span className="block">ClubeGlow<span className="text-[#F97316]">.</span></span>
          </h2>
        </div>

        <div className="flex items-center gap-[1vw]">
          <div className="w-[1.5vw] h-[1.5vw] bg-[#4F46E5] rounded-[0.3vw]" />
          <div className="text-[1.2vw] font-bold text-[#111827] tracking-tight">Glow Upi</div>
        </div>
      </div>

      {/* Two-column comparison */}
      <div className="flex-1 grid grid-cols-2 gap-[3vw] z-10">
        <div className="bg-white rounded-[1vw] p-[3vw] flex flex-col justify-between" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div>
            <div className="text-[1vw] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-[1.5vh]">Sua ideia original</div>
            <h3 className="text-[2.2vw] font-bold text-[#111827] m-0 tracking-tight leading-tight">Cartão multi-academia regional</h3>
            <p className="text-[1.5vw] text-[#4B5563] mt-[2.5vh] m-0 leading-relaxed" style={{ textWrap: "pretty" }}>
              Modelo Wellhub/Gympass para academias do Piauí. O usuário paga uma assinatura e treina em qualquer lugar da rede.
            </p>
          </div>
          <div className="mt-[3vh]">
            <div className="w-[2.5vw] h-[0.3vh] bg-[#9CA3AF] mb-[1.5vh]" />
            <p className="text-[1.5vw] text-[#6B7280] m-0 leading-snug font-medium" style={{ textWrap: "pretty" }}>
              Marketplace de dois lados: academias e usuários. Precisa ativar os dois para crescer.
            </p>
          </div>
        </div>

        <div className="bg-[#4F46E5] rounded-[1vw] p-[3vw] flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-[-3vw] right-[-3vw] w-[12vw] h-[12vw] rounded-full bg-white/10" />
          <div className="absolute bottom-[-2vw] left-[-2vw] w-[8vw] h-[8vw] rounded-full bg-[#F97316]/30" />
          <div className="z-10">
            <div className="text-[1vw] font-semibold text-white/70 uppercase tracking-wider mb-[1.5vh]">Refinamento</div>
            <h3 className="text-[2.2vw] font-bold m-0 tracking-tight leading-tight">ClubeGlow — assinatura de beleza</h3>
            <p className="text-[1.5vw] mt-[2.5vh] m-0 leading-relaxed opacity-95" style={{ textWrap: "pretty" }}>
              Clube que dá acesso a salões e barbearias da rede Glow Upi. Mesma tese, ativando o lado da oferta que já estamos cadastrando.
            </p>
          </div>
          <div className="mt-[3vh] z-10">
            <div className="w-[2.5vw] h-[0.3vh] bg-[#F97316] mb-[1.5vh]" />
            <p className="text-[1.5vw] m-0 leading-snug font-medium opacity-95" style={{ textWrap: "pretty" }}>
              Não compete com Wellhub. Reaproveita 100% dos salões que já vamos ter na plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-[3vh] text-[0.85vw] text-[#9CA3AF] font-medium z-10">
        <div className="flex gap-[2vw]">
          <span>Glow Upi</span>
          <span>/</span>
          <span>Confidencial</span>
          <span>/</span>
          <span>2026</span>
        </div>
        <div>05</div>
      </div>
    </div>
  );
}
