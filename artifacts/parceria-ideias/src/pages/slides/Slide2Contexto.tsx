export default function Slide2Contexto() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#FAFAFA] flex flex-col px-[8vw] py-[8vh] box-border" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background accents */}
      <div className="absolute top-[10vh] right-[10vw] w-[3vw] h-[3vw] rounded-full bg-[#F97316] opacity-15" />
      <div className="absolute bottom-[15vh] left-[5vw] w-[5vw] h-[5vw] rounded-full bg-[#4F46E5] opacity-[0.08]" />
      <div className="absolute top-[40vh] left-[4vw] w-[1vw] h-[1vw] rounded-[0.2vw] bg-[#4F46E5] opacity-60 rotate-45" />

      {/* Header */}
      <div className="z-10 mb-[6vh]">
        <div className="flex items-center gap-[1vw] mb-[2vh]">
          <div className="w-[1vw] h-[1vw] bg-[#4F46E5] rounded-full" />
          <h2 className="text-[1.5vw] font-bold text-[#4F46E5] m-0 uppercase tracking-widest">
            Contexto
          </h2>
        </div>
        <h1 className="text-[3.6vw] font-extrabold text-[#111827] m-0 tracking-tighter leading-[1.05] max-w-[70vw]" style={{ textWrap: "balance" }}>
          Esta conversa não é um plano
          <span className="block">de execução<span className="text-[#F97316]">.</span></span>
        </h1>
      </div>

      {/* Three cards */}
      <div className="flex-1 grid grid-cols-3 gap-[2.5vw] z-10">
        <div className="bg-white rounded-[1vw] p-[2.5vw] flex flex-col justify-between" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div className="text-[3.5vw] font-extrabold text-[#4F46E5] leading-none">01</div>
          <div>
            <div className="w-[2vw] h-[0.3vh] bg-[#F97316] mb-[1.5vh]" />
            <p className="text-[1.5vw] text-[#111827] font-medium leading-snug m-0" style={{ textWrap: "pretty" }}>
              Não estou propondo executar três startups ao mesmo tempo.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[1vw] p-[2.5vw] flex flex-col justify-between" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div className="text-[3.5vw] font-extrabold text-[#4F46E5] leading-none">02</div>
          <div>
            <div className="w-[2vw] h-[0.3vh] bg-[#F97316] mb-[1.5vh]" />
            <p className="text-[1.5vw] text-[#111827] font-medium leading-snug m-0" style={{ textWrap: "pretty" }}>
              O Glow Upi continua sendo o foco até o break-even.
            </p>
          </div>
        </div>

        <div className="bg-[#111827] rounded-[1vw] p-[2.5vw] flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-[-2vw] right-[-2vw] w-[8vw] h-[8vw] rounded-full bg-white/10" />
          <div className="text-[3.5vw] font-extrabold text-[#F97316] leading-none z-10">03</div>
          <div className="z-10">
            <div className="w-[2vw] h-[0.3vh] bg-white/80 mb-[1.5vh]" />
            <p className="text-[1.5vw] text-white font-medium leading-snug m-0" style={{ textWrap: "pretty" }}>
              Quero mostrar como leio o tabuleiro inteiro quando uma ideia sua chega.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-[4vh] text-[0.85vw] text-[#9CA3AF] font-medium z-10">
        <div className="flex gap-[2vw]">
          <span>Glow Upi</span>
          <span>/</span>
          <span>Confidencial</span>
          <span>/</span>
          <span>2026</span>
        </div>
        <div>02</div>
      </div>
    </div>
  );
}
