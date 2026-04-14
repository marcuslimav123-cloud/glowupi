import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import glowImg from "@assets/Gemini_Generated_Image_qo29svqo29svqo29_1776169909207.png";

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[var(--color-bg-dark2)] flex flex-col items-center justify-start pt-24 px-6 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 z-0">
        <img 
          src={glowImg} 
          alt="Glow Background" 
          className="w-full h-full object-cover opacity-20 filter blur-xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark1)] via-[var(--color-bg-dark1)]/90 to-transparent" />
      </div>

      <motion.div
        className="relative z-10 w-full mb-12"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
      >
        <h2 className="font-display text-[10vw] text-[var(--color-gold-light)] leading-tight">
          O Controle<br/>
          <span className="text-white">Em Suas Mãos</span>
        </h2>
      </motion.div>

      <div className="relative z-10 w-full flex flex-col gap-6">
        <FeatureCard 
          icon="✨" 
          title="Agenda Inteligente" 
          active={phase >= 1} 
          delay={0}
        />
        <FeatureCard 
          icon="📊" 
          title="Controle Financeiro Real" 
          active={phase >= 2} 
          delay={0}
        />
        <FeatureCard 
          icon="🔥" 
          title="+3 na lista de espera" 
          active={phase >= 3} 
          delay={0}
        />
      </div>

      <motion.div 
        className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-[var(--color-gold)]/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

function FeatureCard({ icon, title, active, delay }: { icon: string, title: string, active: boolean, delay: number }) {
  return (
    <motion.div
      className="w-full bg-white/5 border border-[var(--color-gold)]/20 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay }}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-gold)]/20 flex items-center justify-center text-2xl">
        {icon}
      </div>
      <h3 className="text-[5.5vw] font-medium text-white tracking-wide">{title}</h3>
    </motion.div>
  );
}
