const base = import.meta.env.BASE_URL;

export default function Slide1Capa() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#FAFAFA] flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background geometric accents */}
      <div className="absolute top-[15vh] left-[8vw] w-[2vw] h-[2vw] rounded-full bg-[#F97316] opacity-20" />
      <div className="absolute bottom-[20vh] left-[40vw] w-[4vw] h-[4vw] rounded-full bg-[#4F46E5] opacity-10" />
      <div className="absolute top-[10vh] right-[45vw] w-[1.5vw] h-[1.5vw] rounded-[0.2vw] bg-[#4F46E5] opacity-80 rotate-45" />

      {/* Left content */}
      <div className="w-[45vw] h-screen px-[8vw] py-[6vh] flex flex-col justify-between z-10 box-border">
        <div className="flex items-center gap-[1vw]">
          <div className="w-[1.5vw] h-[1.5vw] bg-[#4F46E5] rounded-[0.3vw]" />
          <div className="text-[1.2vw] font-bold text-[#111827] tracking-tight">Glow Upi</div>
        </div>

        <div className="flex flex-col gap-[3vh] mt-[-10vh]">
          <div className="inline-flex items-center gap-[0.5vw] px-[1vw] py-[0.5vh] bg-[#4F46E5]/10 rounded-[2vw] w-fit">
            <div className="w-[0.5vw] h-[0.5vw] bg-[#4F46E5] rounded-full" />
            <span className="text-[0.9vw] font-semibold text-[#4F46E5] uppercase tracking-wider">
              Reflexões estratégicas
            </span>
          </div>

          <h1 className="text-[5.5vw] font-extrabold leading-[1.05] text-[#111827] m-0 tracking-tighter" style={{ textWrap: "balance" }}>
            Ideias para
            <span className="block">nossa parceria<span className="text-[#F97316]">.</span></span>
          </h1>

          <p className="text-[1.5vw] text-[#4B5563] leading-relaxed m-0 max-w-[30vw] font-normal" style={{ textWrap: "pretty" }}>
            Visão de longo prazo e oportunidades adjacentes ao que estamos construindo juntos.
          </p>

          <div className="w-[4vw] h-[0.3vh] bg-[#111827] mt-[1vh]" />
        </div>

        <div className="flex gap-[2vw] text-[0.85vw] text-[#9CA3AF] font-medium">
          <span>Marcos Vinícius</span>
          <span>/</span>
          <span>Co-fundador, Glow Upi</span>
          <span>/</span>
          <span>2026</span>
        </div>
      </div>

      {/* Right illustration */}
      <div className="w-[55vw] h-screen relative flex items-center justify-center">
        <div className="absolute w-[45vw] h-[45vw] bg-[#4F46E5]/[0.04] rounded-full z-[1]" style={{ right: "-10vw", top: "50%", transform: "translateY(-50%)" }} />
        <img
          src={`${base}illust-strategy-conversation.png`}
          alt="Ilustração de conversa estratégica"
          crossOrigin="anonymous"
          className="w-[85%] h-[85%] object-contain z-[2] relative"
          style={{ marginRight: "4vw" }}
        />
      </div>
    </div>
  );
}
