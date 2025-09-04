import { useGameStore } from '@/stores/gameStore';
import { calculateLevel } from '@/utils/game';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const tracks: Record<string, string> = {
  Intro: "/audio/LS2_2.mp3",
  Death: "/audio/LS2_4.mp3",
  Beginning: "/audio/LS2_1.mp3",
  Battle: "/audio/LS2_3.mp3",
  Background: "/audio/LS2_6.mp3",
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
    let newTrack = null;
    if (location.pathname !== '/survivor/play') {
      newTrack = tracks.Intro;
      audioBackgroundRef.current.src = "";
    } else {
      if (new URL(audioBackgroundRef.current.src).pathname !== tracks.Background) {
        audioBackgroundRef.current.src = tracks.Background;
      }

      if (!gameId || !adventurer || adventurer.xp < 4) {
        newTrack = tracks.Beginning;
      } else if (adventurer.health === 0) {
        newTrack = tracks.Death;
      } else {
        if (beast && showOverlay) {
          newTrack = tracks.Battle;
        } else {
          newTrack = null;
        }
      }
    }

    if (!newTrack) {
      if (!musicMuted) {
        audioBackgroundRef.current.play().catch(() => { });
        audioRef.current.pause();
      }
      audioRef.current.src = "";
    } else if (newTrack !== new URL(audioRef.current.src).pathname) {
      audioRef.current.src = newTrack;
      if (!musicMuted) {
        audioRef.current.load();
        audioRef.current.play();
        audioBackgroundRef.current.pause();
      }
    }
  }, [gameId, adventurer, beast, musicMuted, showOverlay, location.pathname]);

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