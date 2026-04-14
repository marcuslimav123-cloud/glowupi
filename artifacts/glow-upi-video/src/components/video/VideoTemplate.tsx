import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  scene1: 4000,
  scene2: 4000,
  scene3: 4000,
  scene4: 8000,
  scene5: 10000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
    loop: true,
  });

  return (
    <div className="w-full h-screen overflow-hidden bg-[var(--color-bg-dark1)] relative text-white font-body">
      {/* Aspect Ratio Container for 9:16 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-full h-full max-w-full max-h-full sm:max-w-[56.25vh] sm:w-[56.25vh] aspect-[9/16] bg-black overflow-hidden shadow-2xl">
          <AnimatePresence mode="popLayout">
            {currentScene === 0 && <Scene1 key="scene1" />}
            {currentScene === 1 && <Scene2 key="scene2" />}
            {currentScene === 2 && <Scene3 key="scene3" />}
            {currentScene === 3 && <Scene4 key="scene4" />}
            {currentScene === 4 && <Scene5 key="scene5" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
