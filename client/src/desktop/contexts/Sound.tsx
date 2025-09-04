import { useGameStore } from '@/stores/gameStore';
import { calculateLevel } from '@/utils/game';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const tracks: Record<string, string> = {
  Intro: "/audio/LS2_2.mp3",
  Death: "/audio/LS2_4.mp3",
  Battle: "/audio/LS2_3.mp3",
  Background: "/audio/background.mp3",
};

// Crossfade utility function
const crossfade = (
  fadeOutAudio: HTMLAudioElement,
  fadeInAudio: HTMLAudioElement,
  duration: number = 2000,
  targetVolume: number = 1
) => {
  // Ensure both audio elements are ready
  if (!fadeOutAudio || !fadeInAudio) return;
  
  // Ensure the fade-in audio is actually playing
  if (fadeInAudio.paused) {
    fadeInAudio.play().catch(() => {});
  }
  
  const startTime = Date.now();
  const fadeOutStartVolume = fadeOutAudio.volume;
  const fadeInStartVolume = fadeInAudio.volume;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-in-out curve for smoother transition
    const easeInOut = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Fade out the first audio
    fadeOutAudio.volume = fadeOutStartVolume * (1 - easeInOut);
    
    // Fade in the second audio
    fadeInAudio.volume = fadeInStartVolume + (targetVolume - fadeInStartVolume) * easeInOut;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Ensure final volumes are set correctly
      fadeOutAudio.volume = 0;
      fadeInAudio.volume = targetVolume;
      fadeOutAudio.pause();
    }
  };

  requestAnimationFrame(animate);
};

interface SoundContextType {
  muted: boolean;
  volume: number;
  musicVolume: number;
  musicMuted: boolean;
  hasInteracted: boolean;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setMusicVolume: (musicVolume: number) => void;
  setMusicMuted: (musicMuted: boolean) => void;
}

const SoundContext = createContext<SoundContextType>({
  muted: false,
  volume: 0.5,
  musicVolume: 0.25,
  musicMuted: false,
  hasInteracted: false,
  setMuted: () => { },
  setVolume: () => { },
  setMusicVolume: () => { },
  setMusicMuted: () => { },
});

export const SoundProvider = ({ children }: PropsWithChildren) => {
  const { gameId, adventurer, beast, showOverlay } = useGameStore();
  const location = useLocation();

  const savedVolume = typeof window !== 'undefined' ? localStorage.getItem('soundVolume') : null;
  const savedMuted = typeof window !== 'undefined' ? localStorage.getItem('soundMuted') : null;
  const savedMusicVolume = typeof window !== 'undefined' ? localStorage.getItem('musicVolume') : null;
  const savedMusicMuted = typeof window !== 'undefined' ? localStorage.getItem('musicMuted') : null;

  const [hasInteracted, setHasInteracted] = useState(false)
  const [volume, setVolumeState] = useState(savedVolume ? parseFloat(savedVolume) : 0.5);
  const [muted, setMutedState] = useState(savedMuted === 'true');
  const [musicVolume, setMusicVolumeState] = useState(savedMusicVolume ? parseFloat(savedMusicVolume) : 0.25);
  const [musicMuted, setMusicMutedState] = useState(savedMusicMuted === 'true');
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [isCrossfading, setIsCrossfading] = useState(false);

  const audioRef = useRef(new Audio(tracks.Intro));
  audioRef.current.loop = true;

  const audioBackgroundRef = useRef(new Audio(tracks.Background));
  audioBackgroundRef.current.loop = true;

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundVolume', newVolume.toString());
    }
  };

  const setMuted = (newMuted: boolean) => {
    setMutedState(newMuted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundMuted', newMuted.toString());
    }
  };

  const setMusicVolume = (newVolume: number) => {
    setMusicVolumeState(newVolume);
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicVolume', newVolume.toString());
    }
  };

  const setMusicMuted = (newMuted: boolean) => {
    setMusicMutedState(newMuted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicMuted', newMuted.toString());
    }
  };

  useEffect(() => {
    audioRef.current.volume = musicVolume;
    audioBackgroundRef.current.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);

      if (!musicMuted) {
        audioRef.current.play().catch(() => { });
        audioBackgroundRef.current.play().catch(() => { });
      }

      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [musicMuted]);

  useEffect(() => {
    if (!musicMuted) {
      audioRef.current.play().catch(() => { });
      audioBackgroundRef.current.play().catch(() => { });
    } else {
      audioRef.current.pause();
      audioBackgroundRef.current.pause();
    }
  }, [musicMuted]);

  useEffect(() => {
    if (isCrossfading) return; // Prevent overlapping crossfades

    let newTrack = null;
    if (location.pathname !== '/survivor/play') {
      newTrack = tracks.Intro;
      audioBackgroundRef.current.src = "";
      setStartTimestamp(0);
    } else {
      if (new URL(audioBackgroundRef.current.src).pathname !== tracks.Background) {
        audioBackgroundRef.current.src = tracks.Background;
      }

      if (startTimestamp === 0) {
        setStartTimestamp(Date.now());
      }

      if (!gameId || !adventurer) {
        newTrack = null;
      } else if (adventurer.health === 0) {
        newTrack = tracks.Death;
      } else if (Date.now() - startTimestamp < 122000) {
        newTrack = null;
      } else if (beast) {
        newTrack = tracks.Battle;
      }
    }

    if (!newTrack) {
      // Switch to background music
      if (!musicMuted) {
        const currentAudioSrc = audioRef.current.src;
        const backgroundAudioSrc = audioBackgroundRef.current.src;
        
        if (currentAudioSrc && backgroundAudioSrc) {
          // Crossfade from current track to background
          setIsCrossfading(true);
          audioBackgroundRef.current.play().catch(() => { });
          crossfade(audioRef.current, audioBackgroundRef.current, 2000, musicVolume);
          setTimeout(() => setIsCrossfading(false), 2000);
        } else {
          audioBackgroundRef.current.play().catch(() => { });
          audioRef.current.pause();
        }
      }
      audioRef.current.src = "";
    } else if (newTrack !== new URL(audioRef.current.src).pathname) {
      // Switch to a specific track
      audioRef.current.src = newTrack;
      if (!musicMuted) {
        const currentAudioSrc = audioBackgroundRef.current.src;
        
        if (currentAudioSrc) {
          // Crossfade from background to new track
          setIsCrossfading(true);
          audioRef.current.load();
          
          // Wait for the new track to be ready before starting crossfade
          audioRef.current.addEventListener('canplaythrough', () => {
            audioRef.current.play().catch(() => { });
            crossfade(audioBackgroundRef.current, audioRef.current, 2000, musicVolume);
            setTimeout(() => setIsCrossfading(false), 2000);
          }, { once: true });
          
          // Fallback in case canplaythrough doesn't fire
          setTimeout(() => {
            if (isCrossfading) {
              audioRef.current.play().catch(() => { });
              crossfade(audioBackgroundRef.current, audioRef.current, 2000, musicVolume);
              setTimeout(() => setIsCrossfading(false), 2000);
            }
          }, 1000);
        } else {
          audioRef.current.load();
          audioRef.current.play().catch(() => { });
        }
      }
    }
  }, [gameId, adventurer, beast, musicMuted, showOverlay, location.pathname, isCrossfading]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
      }

      if (audioBackgroundRef.current) {
        audioBackgroundRef.current.pause();
        audioBackgroundRef.current.src = '';
        audioBackgroundRef.current.load();
      }
    };
  }, []);

  return (
    <SoundContext.Provider value={{
      muted,
      musicVolume,
      musicMuted,
      volume,
      hasInteracted,
      setMuted,
      setMusicVolume,
      setMusicMuted,
      setVolume,
    }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  return useContext(SoundContext);
}; 