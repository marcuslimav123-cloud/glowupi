export default function Slide3MobiEduca() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#FAFAFA] flex flex-col px-[8vw] py-[6vh] box-border" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background accents */}
      <div className="absolute top-[15vh] right-[8vw] w-[2vw] h-[2vw] rounded-full bg-[#F97316] opacity-20" />
      <div className="absolute bottom-[10vh] left-[5vw] w-[6vw] h-[6vw] rounded-full bg-[#4F46E5] opacity-[0.05]" />
      <div className="absolute top-[40vh] left-[45vw] w-[1.5vw] h-[1.5vw] rounded-[0.2vw] bg-[#4F46E5] opacity-10 rotate-45" />

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div>
          <div className="inline-flex items-center gap-[0.5vw] px-[1vw] py-[0.5vh] bg-[#4F46E5]/10 rounded-[2vw] mb-[2vh]">
            <div className="w-[0.5vw] h-[0.5vw] bg-[#4F46E5] rounded-full" />
            <span className="text-[0.9vw] font-semibold text-[#4F46E5] uppercase tracking-wider">
              Caso de inspiração
            </span>
          </div>
          <h2 className="text-[3.2vw] font-extrabold text-[#111827] m-0 tracking-tighter leading-[1.1] max-w-[55vw]" style={{ textWrap: "balance" }}>
            MobiEduca.me — vertical SaaS
            <span className="block">feito no Piauí<span className="text-[#F97316]">.</span></span>
          </h2>
        </div>

        <div className="flex items-center gap-[1vw]">
          <div className="w-[1.5vw] h-[1.5vw] bg-[#4F46E5] rounded-[0.3vw]" />
          <div className="text-[1.2vw] font-bold text-[#111827] tracking-tight">Glow Upi</div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 mt-[5vh] gap-[3vw] z-10">
        {/* Left: stats */}
        <div className="flex-1 flex flex-col gap-[1.5vh]">
          <div className="bg-white rounded-[1vw] p-[1.8vw] flex flex-col justify-center flex-1" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div className="w-[2vw] h-[0.3vh] bg-[#F97316] mb-[1vh]" />
            <h4 className="text-[3vw] font-extrabold text-[#111827] m-0 leading-none">338</h4>
            <p className="text-[1.5vw] text-[#4B5563] mt-[0.8vh] m-0 font-medium">Escolas estaduais no Piauí</p>
          </div>

          <div className="bg-white rounded-[1vw] p-[1.8vw] flex flex-col justify-center flex-1" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div className="w-[2vw] h-[0.3vh] bg-[#F97316] mb-[1vh]" />
            <h4 className="text-[3vw] font-extrabold text-[#111827] m-0 leading-none">~120k</h4>
            <p className="text-[1.5vw] text-[#4B5563] mt-[0.8vh] m-0 font-medium">Alunos atendidos</p>
          </div>

          <div className="bg-[#4F46E5] rounded-[1vw] p-[1.8vw] flex flex-col justify-center flex-1 relative overflow-hidden text-white">
            <div className="absolute top-[-2vw] right-[-2vw] w-[8vw] h-[8vw] rounded-full bg-white/10" />
            <div className="w-[2vw] h-[0.3vh] bg-white/80 mb-[1vh] z-10" />
            <h4 className="text-[3vw] font-extrabold m-0 leading-none z-10">150+</h4>
            <p className="text-[1.5vw] mt-[0.8vh] m-0 font-medium opacity-90 z-10">Municípios atendidos</p>
          </div>
        </div>

        {/* Right: description */}
        <div className="flex-[1.4] bg-white rounded-[1vw] p-[3vw] flex flex-col justify-between" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div>
            <h3 className="text-[1.8vw] font-bold text-[#111827] m-0 tracking-tight">O que é</h3>
            <p className="text-[1.5vw] text-[#4B5563] mt-[2vh] m-0 leading-relaxed" style={{ textWrap: "pretty" }}>
              SaaS de gestão escolar criado em Teresina. Carteirinha eletrônica registra a frequência dos alunos da rede pública. A escola combate a evasão; o município maximiza o repasse do FUNDEB.
            </p>
          </div>

          <div>
            <div className="w-[3vw] h-[0.3vh] bg-[#F97316] mb-[2vh]" />
            <h3 className="text-[1.4vw] font-bold text-[#4F46E5] m-0 uppercase tracking-wider">Por que funcionou</h3>
            <p className="text-[1.5vw] text-[#111827] mt-[1.5vh] m-0 leading-snug font-medium" style={{ textWrap: "pretty" }}>
              Problema concreto, região delimitada, pouca concorrência nacional. A base virou referência local antes de qualquer player grande aparecer.
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
        <div>03</div>
      </div>
    </div>
  );
}
