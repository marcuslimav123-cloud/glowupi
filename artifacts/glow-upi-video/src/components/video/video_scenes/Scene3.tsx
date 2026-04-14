import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import glowImg from "@assets/Gemini_Generated_Image_qo29svqo29svqo29_1776169909207.png";

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[var(--color-bg-dark1)] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 1.2 }}
    >
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <img 
          src={glowImg} 
          alt="Glow Transformation" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[var(--color-bg-dark1)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-[var(--color-bg-dark1)]/50" />
      </motion.div>

      <motion.div 
        className="absolute inset-0 z-10 bg-[var(--color-gold)] mix-blend-color"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 2 }}
      />

      <div className="relative z-20 w-full px-8 mt-auto mb-24 text-center">
        <motion.p
          className="text-[5vw] text-[var(--color-gold-light)] font-light tracking-widest uppercase mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1 }}
        >
          Até que você descobre
        </motion.p>
        
        <motion.h2
          className="font-display text-[12vw] text-white leading-none drop-shadow-2xl"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
          transition={{ duration: 1.2, delay: 0.3, type: "spring", bounce: 0.4 }}
        >
          O <span className="text-[var(--color-gold)]">Glow Upi.</span>
        </motion.h2>
      </div>
    </motion.div>
  );
}
