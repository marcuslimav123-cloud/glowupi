export default function Slide6Fechamento() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#111827] flex flex-col px-[8vw] py-[6vh] box-border text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background accents */}
      <div className="absolute top-[-15vw] right-[-5vw] w-[40vw] h-[40vw] rounded-full bg-[#4F46E5] opacity-20" style={{ filter: "blur(4vw)" }} />
      <div className="absolute bottom-[12vh] left-[8vw] w-[2vw] h-[2vw] rounded-full bg-[#F97316]" />
      <div className="absolute bottom-[20vh] left-[40vw] w-[1.5vw] h-[1.5vw] rounded-[0.2vw] bg-[#4F46E5] rotate-45" />

      {/* Header */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-[1vw]">
          <div className="w-[1.5vw] h-[1.5vw] bg-[#F97316] rounded-[0.3vw]" />
          <div className="text-[1.2vw] font-bold tracking-tight">Glow Upi</div>
        </div>
        <div className="inline-flex items-center gap-[0.5vw] px-[1vw] py-[0.5vh] bg-white/10 rounded-[2vw]">
          <span className="text-[0.9vw] font-semibold uppercase tracking-wider">Fechamento</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center z-10 mt-[2vh]">
        <h1 className="text-[5vw] font-extrabold leading-[1.05] m-0 tracking-tighter max-w-[75vw]" style={{ textWrap: "balance" }}>
          O que eu trago para
          <span className="block">essa parceria<span className="text-[#F97316]">.</span></span>
        </h1>

        <div className="grid grid-cols-3 gap-[3vw] mt-[7vh] max-w-[80vw]">
          <div>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.6vw] bg-[#4F46E5]/30 flex items-center justify-center mb-[2vh]">
              <div className="text-[1.4vw] font-extrabold text-white">01</div>
            </div>
            <h3 className="text-[1.8vw] font-bold m-0 tracking-tight">Visão</h3>
            <p className="text-[1.5vw] text-white/70 mt-[1.5vh] m-0 leading-relaxed" style={{ textWrap: "pretty" }}>
              Leio cenários de longo prazo e separo moda passageira de tese real.
            </p>
          </div>

          <div>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.6vw] bg-[#F97316]/30 flex items-center justify-center mb-[2vh]">
              <div className="text-[1.4vw] font-extrabold text-[#F97316]">02</div>
            </div>
            <h3 className="text-[1.8vw] font-bold m-0 tracking-tight">Foco</h3>
            <p className="text-[1.5vw] text-white/70 mt-[1.5vh] m-0 leading-relaxed" style={{ textWrap: "pretty" }}>
              Sei segurar adjacências para não matar o que importa agora.
            </p>
          </div>

          <div>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.6vw] bg-[#4F46E5]/30 flex items-center justify-center mb-[2vh]">
              <div className="text-[1.4vw] font-extrabold text-white">03</div>
            </div>
            <h3 className="text-[1.8vw] font-bold m-0 tracking-tight">Disciplina</h3>
            <p className="text-[1.5vw] text-white/70 mt-[1.5vh] m-0 leading-relaxed" style={{ textWrap: "pretty" }}>
              Construo o produto com mão e mente no detalhe, todos os dias.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[0.85vw] text-white/50 font-medium z-10">
        <div className="flex gap-[2vw]">
          <span>Marcos Vinícius</span>
          <span>/</span>
          <span>Glow Upi</span>
          <span>/</span>
          <span>2026</span>
        </div>
        <div>06</div>
      </div>
    </div>
  );
}
