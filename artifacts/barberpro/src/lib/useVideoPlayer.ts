import { useState, useEffect, useRef } from 'react';

export interface SceneDurations {
  [key: string]: number;
}

export interface UseVideoPlayerOptions {
  durations: SceneDurations;
  loop?: boolean;
}

export interface UseVideoPlayerReturn {
  currentScene: number;
  totalScenes: number;
  currentSceneKey: string;
}

export function useVideoPlayer(options: UseVideoPlayerOptions): UseVideoPlayerReturn {
  const { durations, loop = true } = options;

  const sceneKeys = useRef(Object.keys(durations)).current;
  const totalScenes = sceneKeys.length;
  const durationsArray = useRef(Object.values(durations)).current;

  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const currentDuration = durationsArray[currentScene];

    const timer = setTimeout(() => {
      if (currentScene >= totalScenes - 1) {
        if (loop) {
          setCurrentScene(0);
        }
      } else {
        setCurrentScene(prev => prev + 1);
      }
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [currentScene, totalScenes, durationsArray, loop]);

  return {
    currentScene,
    totalScenes,
    currentSceneKey: sceneKeys[currentScene],
  };
}
