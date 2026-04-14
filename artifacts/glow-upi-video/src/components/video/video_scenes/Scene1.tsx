import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import chaosImg from "@assets/Gemini_Generated_Image_eaqglxeaqglxeaqg_1776169909207.png";

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-black flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ scale: 1 }}
        animate={{ scale: 1.15 }}
        transition={{ duration: 4, ease: "linear" }}
      >
        <img 
          src={chaosImg} 
          alt="Chaos" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
      </motion.div>

      <div className="relative z-10 w-full px-8 flex flex-col items-center text-center" style={{ marginTop: '8vh' }}>
        <motion.h1 
          className="font-display leading-none text-red-600 tracking-tighter"
          style={{ fontSize: 'clamp(48px, 15vw, 120px)', textShadow: '0 4px 20px rgba(220, 38, 38, 0.8)' }}
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          O CAOS
        </motion.h1>

        <motion.div
          className="mt-6 bg-red-900/40 border border-red-500/50 p-4 rounded-xl backdrop-blur-md"
          initial={{ opacity: 0, y: 20, rotateX: 90 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 20, rotateX: 90 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <p className="font-medium leading-tight text-white" style={{ fontSize: 'clamp(16px, 4.5vw, 32px)' }}>
            Você ainda gerencia <br/><span className="text-red-400">seus clientes</span> assim?
          </p>
        </motion.div>
      </div>

      <motion.div 
        className="absolute inset-0 mix-blend-overlay opacity-20 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)' }}
        animate={{ opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 0.3, repeat: Infinity }}
      />
    </motion.div>
  );
}
