import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import glowImg from "@assets/Gemini_Generated_Image_qo29svqo29svqo29_1776169909207.png";

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[var(--color-bg-dark1)] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1.2 }}
    >
      <motion.div
        className="absolute inset-0 z-0 opacity-30 mix-blend-screen"
        initial={{ scale: 1.2, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 4, ease: "easeOut" }}
      >
        <img 
          src={glowImg} 
          alt="Glow Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-dark1)] via-[var(--color-bg-dark1)]/80 to-transparent" />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center text-center px-8">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          className="mb-12 flex flex-col items-center"
        >
          <img src={`${import.meta.env.BASE_URL}logo-icon.png`} alt="Glow Upi Logo" className="w-[20vw] h-[20vw] object-contain mb-6 drop-shadow-[0_0_15px_rgba(196,164,106,0.5)]" />
          <h1 className="font-display text-[14vw] text-[var(--color-gold)] leading-none">
            Glow Upi
          </h1>
        </motion.div>

        <motion.div
          className="bg-[var(--color-gold)] text-[var(--color-bg-dark1)] px-8 py-4 rounded-full font-bold tracking-widest text-[5vw] mb-6 shadow-[0_0_30px_rgba(196,164,106,0.4)]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          7 DIAS GRÁTIS
        </motion.div>

        <motion.p
          className="text-[4vw] text-[var(--color-gold-light)]/80 uppercase tracking-widest mb-16"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Sem cartão
        </motion.p>

        <motion.div
          className="text-[5vw] font-medium text-white tracking-wider"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1 }}
        >
          glowupi.com.br
        </motion.div>
      </div>

      <motion.div 
        className="absolute top-[-20%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-[var(--color-gold)]/15 blur-[100px] pointer-events-none"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
