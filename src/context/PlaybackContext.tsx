import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { AlgorithmStep } from '../types/algorithm';
import { Graph } from '../types/graph';
import { generateSteps } from '../engine/fordFulkerson';
import { cloneGraph } from '../engine/graphUtils';

interface PlaybackContextValue {
  steps: AlgorithmStep[];
  currentStepIndex: number;
  currentStep: AlgorithmStep | null;
  isPlaying: boolean;
  speed: number;
  isGenerated: boolean;
  generate: (graph: Graph) => void;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStep: (index: number) => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
}

const PlaybackCtx = createContext<PlaybackContextValue | null>(null);

const SPEED_OPTIONS = [0.5, 1, 2, 4];
const BASE_INTERVAL = 1200;

export { SPEED_OPTIONS };

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<number | null>(null);

  const currentStep = steps.length > 0 ? steps[currentStepIndex] ?? null : null;
  const isGenerated = steps.length > 0;

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const generate = useCallback((graph: Graph) => {
    clearTimer();
    setIsPlaying(false);
    const s = generateSteps(cloneGraph(graph));
    setSteps(s);
    setCurrentStepIndex(0);
  }, [clearTimer]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
  }, [clearTimer]);

  const stepForward = useCallback(() => {
    setCurrentStepIndex(i => {
      if (i >= steps.length - 1) {
        pause();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, pause]);

  const stepBackward = useCallback(() => {
    setCurrentStepIndex(i => Math.max(0, i - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    setCurrentStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
  }, [steps.length]);

  const play = useCallback(() => {
    if (steps.length === 0) return;
    setIsPlaying(true);
  }, [steps.length]);

  const reset = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIndex(0);
  }, [clearTimer]);

  useEffect(() => {
    clearTimer();
    if (isPlaying && steps.length > 0) {
      const interval = BASE_INTERVAL / speed;
      intervalRef.current = window.setInterval(() => {
        setCurrentStepIndex(i => {
          if (i >= steps.length - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, interval);
    }
    return clearTimer;
  }, [isPlaying, speed, steps.length, clearTimer]);

  return (
    <PlaybackCtx.Provider value={{
      steps, currentStepIndex, currentStep, isPlaying, speed, isGenerated,
      generate, play, pause, stepForward, stepBackward, goToStep, reset, setSpeed,
    }}>
      {children}
    </PlaybackCtx.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackCtx);
  if (!ctx) throw new Error('usePlayback must be used within PlaybackProvider');
  return ctx;
}
