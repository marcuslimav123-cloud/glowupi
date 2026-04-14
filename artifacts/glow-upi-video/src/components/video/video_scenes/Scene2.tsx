import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import chaosImg from "@assets/Gemini_Generated_Image_eaqglxeaqglxeaqg_1776169909207.png";

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', scale: 0.9 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 z-0 grid grid-cols-2 grid-rows-2 gap-1 p-2 opacity-40">
        <motion.div className="relative overflow-hidden rounded-lg" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <img src={chaosImg} className="w-full h-full object-cover scale-150 origin-top-left filter grayscale contrast-150" />
        </motion.div>
        <motion.div className="relative overflow-hidden rounded-lg" animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 2.2, repeat: Infinity }}>
          <img src={chaosImg} className="w-full h-full object-cover scale-150 origin-bottom-right filter grayscale contrast-150" />
        </motion.div>
        <motion.div className="relative overflow-hidden rounded-lg" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <img src={chaosImg} className="w-full h-full object-cover scale-150 origin-center filter grayscale contrast-150" />
        </motion.div>
        <motion.div className="relative overflow-hidden rounded-lg" animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <img src={chaosImg} className="w-full h-full object-cover scale-150 origin-bottom-left filter grayscale contrast-150" />
        </motion.div>
      </div>

      <div className="absolute inset-0 bg-black/70 z-0" />

      <div className="relative z-10 w-full px-6 flex flex-col gap-6 items-center">
        <PainPoint 
          text="WhatsApp às 23h" 
          active={phase >= 1} 
          delay={0} 
        />
        <PainPoint 
          text="Agenda no caderno" 
          active={phase >= 2} 
          delay={0} 
        />
        <PainPoint 
          text="Clientes perdidas" 
          active={phase >= 3} 
          delay={0} 
        />
      </div>
    </motion.div>
  );
}

function PainPoint({ text, active, delay }: { text: string, active: boolean, delay: number }) {
  return (
    <motion.div
      className="w-full bg-red-950/50 border-l-4 border-red-600 p-5 rounded-r-xl backdrop-blur-md"
      initial={{ opacity: 0, x: -50, scale: 0.9 }}
      animate={active ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -50, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay }}
    >
      <h3 className="text-[6vw] font-bold text-white tracking-wide">{text}</h3>
    </motion.div>
  );
}
