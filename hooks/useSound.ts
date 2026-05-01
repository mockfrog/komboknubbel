import { useCallback, useEffect, useRef } from 'react';

// isEnabled is now a parameter to decide if sound should be played.
const useSound = (soundSrc: string, volume: number = 0.5, isEnabled: boolean) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Ensure this runs only in the browser
    if (typeof window !== 'undefined') {
      const audio = new Audio(soundSrc);
      audio.volume = volume;
      audioRef.current = audio;

      // Attempt to preload the audio.
      // Browsers might have different behaviors or ignore this.
      audio.preload = 'auto';
      audio.load(); 

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          // Release the audio resource. Important for preventing memory leaks.
          audioRef.current.src = ''; 
          audioRef.current.load(); // This helps in some browsers to fully release
          audioRef.current = null;
        }
      };
    }
  }, [soundSrc, volume]);

  const play = useCallback(() => {
    // Only play if the sound is enabled globally.
    if (isEnabled && audioRef.current) {
      audioRef.current.currentTime = 0; // Rewind to start
      audioRef.current.play().catch(error => {
        // Autoplay was prevented or another error occurred.
        // This is common if the user hasn't interacted with the page yet.
        console.warn(`Audio play prevented for ${soundSrc}: `, error);
      });
    }
  }, [soundSrc, isEnabled]); // Add isEnabled to dependency array

  return play;
};

export default useSound;
