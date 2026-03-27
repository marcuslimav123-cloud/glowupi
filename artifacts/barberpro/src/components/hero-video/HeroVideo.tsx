import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/useVideoPlayer';
import { ParticleCanvas } from './ParticleCanvas';
import { useState, useEffect } from 'react';

const SCENE_DURATIONS = {
  genesis: 8000,
  prosperity: 8000,
  success: 8000,
};

export default function HeroVideo() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
    loop: true,
  });

  return (
    <div className="relative w-full max-w-[540px] mx-auto lg:mx-0">
      <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-[32px] blur-3xl" />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/[0.06] w-full h-full flex items-center justify-center"
        style={{
          aspectRatio: '16/9',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1510 100%)',
        }}
      >
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

        <AnimatePresence>
          {currentScene > 0 && (
            <motion.div
              key="corner-logo"
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute z-50 flex items-center top-3 left-3 gap-2"
            >
              <img src={`${import.meta.env.BASE_URL}logo-icon.png`} alt="Glow Upi Logo" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
              <span className="text-[#c4a46a] tracking-wide text-xs sm:text-sm" style={{ fontFamily: "'DM Serif Display', serif" }}>Glow Upi</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(196, 164, 106, 0.08) 0%, transparent 60%)',
          }}
        />
      </div>
    </div>
  );
}

function SceneGenesis() {
  const [showSub, setShowSub] = useState(false);

  useEffect(() => {
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
            className="absolute tracking-widest uppercase text-[#d4b882]"
            style={{
              marginTop: '15%',
              fontSize: 'clamp(8px, 1.8vw, 16px)',
              textShadow: '0 0 20px rgba(196, 164, 106, 0.5), 0 2px 8px rgba(0,0,0,0.8)',
              letterSpacing: '0.3em',
            }}
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
      className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-4 sm:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
      transition={{ duration: 1.2 }}
    >
      <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)' }} />
      <div className="max-w-full relative z-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.h2
              key="text1"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-white leading-tight"
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(14px, 3.5vw, 36px)', textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)' }}
            >
              Transforme seu tempo em <span className="text-[#c4a46a]">prosperidade</span>
            </motion.h2>
          )}
          {step === 2 && (
            <motion.h2
              key="text2"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-white leading-tight"
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(14px, 3.5vw, 36px)', textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)' }}
            >
              Gestão <span className="text-[#c4a46a]">premium</span> para salões de beleza
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
      className="relative z-10 w-full h-full flex items-center justify-between px-4 sm:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 75%)' }} />
      <div className="flex flex-col justify-center z-20 relative" style={{ width: '55%' }}>
        <AnimatePresence>
          {showTagline && (
            <motion.div
              initial={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2
                className="text-white leading-tight mb-2"
                style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(11px, 3vw, 30px)', textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}
              >
                Organize sua agenda e <span className="text-[#c4a46a]">fidelize suas clientes</span>
              </h2>
              <div className="bg-[#c4a46a] rounded-full mb-2" style={{ width: '30%', height: 'clamp(1px, 0.3vh, 3px)' }} />
              <p className="text-[#d4b882] font-light" style={{ fontSize: 'clamp(8px, 1.5vw, 14px)', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
                O sucesso do seu negócio em suas mãos.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-full flex items-center justify-end relative z-20" style={{ width: '40%' }}>
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-square"
          style={{ height: '70%' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,164,106,0.2)_0%,transparent_70%)] animate-pulse" />
          <img
            src={`${import.meta.env.BASE_URL}silhouette.png`}
            alt="Businesswoman silhouette"
            className="w-full h-full object-contain"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(196, 164, 106, 0.4))',
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
