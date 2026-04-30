export default function Slide4Tese() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#FAFAFA] flex flex-col px-[8vw] py-[6vh] box-border" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background accents */}
      <div className="absolute top-[10vh] right-[6vw] w-[3vw] h-[3vw] rounded-full bg-[#F97316] opacity-15" />
      <div className="absolute bottom-[12vh] left-[4vw] w-[5vw] h-[5vw] rounded-full bg-[#4F46E5] opacity-[0.08]" />
      <div className="absolute top-[30vh] right-[40vw] w-[1vw] h-[1vw] rounded-[0.2vw] bg-[#4F46E5] opacity-60 rotate-45" />

      {/* Header */}
      <div className="flex justify-between items-end z-10 mb-[5vh]">
        <div className="max-w-[60vw]">
          <div className="inline-flex items-center gap-[0.5vw] px-[1vw] py-[0.5vh] bg-[#4F46E5]/10 rounded-[2vw] mb-[2vh]">
            <div className="w-[0.5vw] h-[0.5vw] bg-[#4F46E5] rounded-full" />
            <span className="text-[0.9vw] font-semibold text-[#4F46E5] uppercase tracking-wider">
              A tese
            </span>
          </div>
          <h2 className="text-[3.4vw] font-extrabold text-[#111827] m-0 tracking-tighter leading-[1.05]" style={{ textWrap: "balance" }}>
            Vertical SaaS Regional
            <span className="text-[#F97316]">.</span>
          </h2>
          <p className="text-[1.5vw] text-[#4B5563] mt-[2vh] m-0 leading-relaxed max-w-[42vw]" style={{ textWrap: "pretty" }}>
            Software para um setor específico, dentro de uma região, vendido para o poder público ou rede privada local.
          </p>
        </div>

        <div className="flex flex-col gap-[1vh] text-right">
          <div className="text-[1vw] font-semibold text-[#4F46E5] uppercase tracking-wider">Princípios</div>
          <div className="text-[1.5vw] text-[#111827] font-medium">Pouca concorrência</div>
          <div className="text-[1.5vw] text-[#111827] font-medium">Ticket alto</div>
          <div className="text-[1.5vw] text-[#111827] font-medium">Defensável</div>
        </div>
      </div>

      {/* Four vertical cards */}
      <div className="flex-1 grid grid-cols-4 gap-[1.6vw] z-10">
        <div className="bg-white rounded-[1vw] p-[2vw] flex flex-col justify-between" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div>
            <div className="w-[3vw] h-[3vw] rounded-[0.6vw] bg-[#4F46E5]/10 flex items-center justify-center mb-[2vh]">
              <div className="text-[1.6vw] font-extrabold text-[#4F46E5]">01</div>
            </div>
            <h3 className="text-[1.6vw] font-bold text-[#111827] m-0 tracking-tight leading-tight">Educação pública</h3>
          </div>
          <p className="text-[1.5vw] text-[#4B5563] mt-[2vh] m-0 leading-snug" style={{ textWrap: "pretty" }}>
            Modelo MobiEduca. Carteirinha, frequência e gestão por escola. Comprador: SEDUC e prefeitura.
          </p>
        </div>

        <div className="bg-white rounded-[1vw] p-[2vw] flex flex-col justify-between" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div>
            <div className="w-[3vw] h-[3vw] rounded-[0.6vw] bg-[#F97316]/10 flex items-center justify-center mb-[2vh]">
              <div className="text-[1.6vw] font-extrabold text-[#F97316]">02</div>
            </div>
            <h3 className="text-[1.6vw] font-bold text-[#111827] m-0 tracking-tight leading-tight">Segurança pública</h3>
          </div>
          <p className="text-[1.5vw] text-[#4B5563] mt-[2vh] m-0 leading-snug" style={{ textWrap: "pretty" }}>
            Registro integrado de ocorrências entre PM, GCM e Detran. Hoje cada órgão tem o seu.
          </p>
        </div>

        <div className="bg-white rounded-[1vw] p-[2vw] flex flex-col justify-between" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div>
            <div className="w-[3vw] h-[3vw] rounded-[0.6vw] bg-[#4F46E5]/10 flex items-center justify-center mb-[2vh]">
              <div className="text-[1.6vw] font-extrabold text-[#4F46E5]">03</div>
            </div>
            <h3 className="text-[1.6vw] font-bold text-[#111827] m-0 tracking-tight leading-tight">Saúde básica</h3>
          </div>
          <p className="text-[1.5vw] text-[#4B5563] mt-[2vh] m-0 leading-snug" style={{ textWrap: "pretty" }}>
            Fila e prontuário eletrônico em postos municipais. Comprador: secretaria de saúde.
          </p>
        </div>

        <div className="bg-[#111827] rounded-[1vw] p-[2vw] flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-[-2vw] right-[-2vw] w-[6vw] h-[6vw] rounded-full bg-white/10" />
          <div className="z-10">
            <div className="w-[3vw] h-[3vw] rounded-[0.6vw] bg-[#F97316]/30 flex items-center justify-center mb-[2vh]">
              <div className="text-[1.6vw] font-extrabold text-[#F97316]">04</div>
            </div>
            <h3 className="text-[1.6vw] font-bold m-0 tracking-tight leading-tight">Mulheres em risco</h3>
          </div>
          <p className="text-[1.5vw] text-white/80 mt-[2vh] m-0 leading-snug z-10" style={{ textWrap: "pretty" }}>
            Botão de pânico ligado à rede Maria da Penha. Demanda crescente, oferta fraca.
          </p>
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
        <div>04</div>
      </div>
    </div>
  );
}
