import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { ParticleCanvas } from './ParticleCanvas';
import { useState, useEffect } from 'react';

const SCENE_DURATIONS = {
  genesis: 8000,
  prosperity: 8000,
  success: 8000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
    loop: true,
  });

  return (
    <div 
      className="w-full h-screen overflow-hidden relative flex items-center justify-center"
      style={{ 
        background: 'linear-gradient(135deg, var(--color-bg-dark1) 0%, var(--color-bg-dark2) 100%)',
      }}
    >
      {/* Background ambient gradient */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-30"
        animate={{
          background: [
            'radial-gradient(circle at 20% 30%, rgba(196, 164, 106, 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 70%, rgba(196, 164, 106, 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 30%, rgba(196, 164, 106, 0.15) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      <ParticleCanvas currentScene={currentScene} />

      <AnimatePresence mode="wait">
        {currentScene === 0 && <SceneGenesis key="genesis" />}
        {currentScene === 1 && <SceneProsperity key="prosperity" />}
        {currentScene === 2 && <SceneSuccess key="success" />}
      </AnimatePresence>
      
      {/* Persistent Logo in Corner (appears after Act 1) */}
      <AnimatePresence>
        {currentScene > 0 && (
          <motion.div
            key="corner-logo"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-8 left-8 z-50 flex items-center gap-3"
          >
            <img src={`${import.meta.env.BASE_URL}logo-icon.png`} alt="Glow Upi Logo" className="w-10 h-10 object-contain" />
            <span className="text-[var(--color-gold)] font-display text-2xl tracking-wide">Glow Upi</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SceneGenesis() {
  const [showSub, setShowSub] = useState(false);
  
  useEffect(() => {
    // The particle system takes ~6s to fully form the text. 
    // Let's bring in a subtle glow/subtitle right as it locks in.
    const timer = setTimeout(() => setShowSub(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      className="relative z-10 w-full h-full flex flex-col items-center justify-center"
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <AnimatePresence>
        {showSub && (
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            className="absolute mt-48 text-[var(--color-gold-light)] font-body tracking-widest uppercase text-sm md:text-xl"
            style={{ textShadow: '0 0 20px rgba(196, 164, 106, 0.5)' }}
          >
            O Futuro da Beleza
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SceneProsperity() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
      transition={{ duration: 1.2 }}
    >
      <div className="max-w-4xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.h2 
              key="text1"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-6xl lg:text-7xl font-display text-white leading-tight"
            >
              Transforme seu tempo em <span className="text-[var(--color-gold)]">prosperidade</span>
            </motion.h2>
          )}
          {step === 2 && (
            <motion.h2 
              key="text2"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-6xl lg:text-7xl font-display text-white leading-tight"
            >
              Gestão <span className="text-[var(--color-gold)]">premium</span> para salões de beleza
            </motion.h2>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SceneSuccess() {
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTagline(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      className="relative z-10 w-full h-full flex items-center justify-between px-10 md:px-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="w-1/2 flex flex-col justify-center max-w-2xl z-20">
        <AnimatePresence>
          {showTagline && (
            <motion.div
              initial={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-5xl md:text-7xl font-display text-white mb-6 leading-tight">
                Organize sua agenda e <span className="text-[var(--color-gold)]">fidelize suas clientes</span>
              </h2>
              <div className="w-24 h-1 bg-[var(--color-gold)] mb-6 rounded-full" />
              <p className="text-xl md:text-2xl text-[var(--color-gold-light)] font-body font-light opacity-90">
                O sucesso do seu negócio em suas mãos.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-1/2 h-full flex items-center justify-end relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-[80%] aspect-square"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,164,106,0.2)_0%,transparent_70%)] animate-pulse" />
          <img 
            src={`${import.meta.env.BASE_URL}silhouette.png`} 
            alt="Businesswoman silhouette" 
            className="w-full h-full object-contain opacity-90"
            style={{ 
              filter: 'drop-shadow(0 0 30px rgba(196, 164, 106, 0.4))',
            }} 
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
