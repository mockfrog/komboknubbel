
import React from 'react';
import useSound from '../hooks/useSound'; // Import the hook
import { GameMode } from '../types';
import Leaderboard from './Leaderboard';

interface StartScreenProps {
  onStartGame: (mode: GameMode) => void;
  onShowRules: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
}

// New sub-component for rendering dice faces, similar to DiceFace in DiceDisplay.tsx
const StartScreenDiceFace: React.FC<{ value: number }> = ({ value }) => {
  const pips = [];
  // Pips are white for visibility on the red dice background
  const pipClasses = "w-3 h-3 bg-white rounded-full";

  if (value === 1) pips.push(<div key="1c" className={`${pipClasses} col-start-2 row-start-2`}></div>);
  if (value === 2) {
    pips.push(<div key="2a" className={`${pipClasses} col-start-1 row-start-1`}></div>);
    pips.push(<div key="2b" className={`${pipClasses} col-start-3 row-start-3`}></div>);
  }
  if (value === 3) {
    pips.push(<div key="3a" className={`${pipClasses} col-start-1 row-start-1`}></div>);
    pips.push(<div key="3b" className={`${pipClasses} col-start-2 row-start-2`}></div>);
    pips.push(<div key="3c" className={`${pipClasses} col-start-3 row-start-3`}></div>);
  }
  if (value === 4) {
    pips.push(<div key="4a" className={`${pipClasses} col-start-1 row-start-1`}></div>);
    pips.push(<div key="4b" className={`${pipClasses} col-start-3 row-start-1`}></div>);
    pips.push(<div key="4c" className={`${pipClasses} col-start-1 row-start-3`}></div>);
    pips.push(<div key="4d" className={`${pipClasses} col-start-3 row-start-3`}></div>);
  }
  if (value === 5) {
    pips.push(<div key="5a" className={`${pipClasses} col-start-1 row-start-1`}></div>);
    pips.push(<div key="5b" className={`${pipClasses} col-start-3 row-start-1`}></div>);
    pips.push(<div key="5c" className={`${pipClasses} col-start-2 row-start-2`}></div>);
    pips.push(<div key="5d" className={`${pipClasses} col-start-1 row-start-3`}></div>);
    pips.push(<div key="5e" className={`${pipClasses} col-start-3 row-start-3`}></div>);
  }
  if (value === 6) {
    pips.push(<div key="6a" className={`${pipClasses} col-start-1 row-start-1`}></div>);
    pips.push(<div key="6b" className={`${pipClasses} col-start-3 row-start-1`}></div>);
    pips.push(<div key="6c" className={`${pipClasses} col-start-1 row-start-2`}></div>);
    pips.push(<div key="6d" className={`${pipClasses} col-start-3 row-start-2`}></div>);
    pips.push(<div key="6e" className={`${pipClasses} col-start-1 row-start-3`}></div>);
    pips.push(<div key="6f" className={`${pipClasses} col-start-3 row-start-3`}></div>);
  }

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-1 place-items-center">
      {pips}
    </div>
  );
};


const BackgroundDice: React.FC = () => {
  const diceValues = React.useMemo(() => [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ], []);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const elementsRef = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const size = window.innerWidth < 768 ? 64 : 96;

    const states = elementsRef.current.map((el) => {
      const x = Math.random() * (width - size);
      const y = Math.random() * (height - size);
      const speedMultiplier = 2.0 + Math.random() * 2.5;
      const angleDir = Math.random() * Math.PI * 2;
      const vx = Math.cos(angleDir) * speedMultiplier;
      const vy = Math.sin(angleDir) * speedMultiplier;
      const angle = Math.random() * 360;
      const vAngle = (Math.random() - 0.5) * 4;

      return { x, y, vx, vy, angle, vAngle, el };
    });

    // Device orientation physics
    let gravityX = 0;
    let gravityY = 0;
    let hasSensor = false;
    let lastGamma: number | null = null;
    let lastBeta: number | null = null;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma;
      const beta = event.beta;

      if (gamma !== null && beta !== null) {
        // Only mark sensor as active if the orientation values actually change.
        // This prevents desktop browsers that fire static 0-events from freezing the animation.
        if (lastGamma !== null && lastBeta !== null) {
          const diff = Math.abs(gamma - lastGamma) + Math.abs(beta - lastBeta);
          if (diff > 0.1) {
            hasSensor = true;
          }
        }
        lastGamma = gamma;
        lastBeta = beta;

        if (hasSensor) {
          // gamma (left/right tilt) maps to X axis, beta (front/back tilt) maps to Y axis
          gravityX = gamma * 0.0075;
          gravityY = beta * 0.0075;
        }
      }
    };

    const requestPermission = () => {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        (DeviceOrientationEvent as any).requestPermission()
          .then((state: string) => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    window.addEventListener('click', requestPermission, { once: true });
    window.addEventListener('touchstart', requestPermission, { once: true });
    window.addEventListener('deviceorientation', handleOrientation);

    let lastTime = performance.now();
    let animationId: number;
    const updatePhysics = () => {
      const currentSize = window.innerWidth < 768 ? 64 : 96;

      const now = performance.now();
      // Delta time normalized to 16.67ms (1.0 at 60fps)
      let dt = (now - lastTime) / 16.67;
      // Cap delta time to prevent physics glitches during tab switches or lag
      if (dt > 4) dt = 4;
      lastTime = now;

      // 1. Move dice and apply tilt physics if available
      states.forEach(state => {
        if (!state.el) return;

        if (hasSensor) {
          state.vx += gravityX * dt;
          state.vy += gravityY * dt;
          
          // Exponential decay for friction to remain framerate independent
          const decay = Math.pow(0.99, dt);
          state.vx *= decay;
          state.vy *= decay;

          // Limit speed
          const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
          const maxSpeed = 12;
          if (speed > maxSpeed) {
            state.vx = (state.vx / speed) * maxSpeed;
            state.vy = (state.vy / speed) * maxSpeed;
          }
        }

        state.x += state.vx * dt;
        state.y += state.vy * dt;
        state.angle += state.vAngle * dt;
      });

      // 2. Resolve mutual collisions between dice (elastic collision)
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const s1 = states[i];
          const s2 = states[j];
          if (!s1.el || !s2.el) continue;

          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < currentSize) {
            const overlap = currentSize - dist;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            // Positional correction
            s1.x -= nx * (overlap / 2);
            s1.y -= ny * (overlap / 2);
            s2.x += nx * (overlap / 2);
            s2.y += ny * (overlap / 2);

            const kx = s1.vx - s2.vx;
            const ky = s1.vy - s2.vy;
            const p = nx * kx + ny * ky;

            if (p > 0) {
              const restitution = hasSensor ? 0.85 : 1.0;
              s1.vx -= nx * p * restitution;
              s1.vy -= ny * p * restitution;
              s2.vx += nx * p * restitution;
              s2.vy += ny * p * restitution;

              const tempVAngle = s1.vAngle;
              s1.vAngle = s2.vAngle * 0.8 + (Math.random() - 0.5) * 4;
              s2.vAngle = tempVAngle * 0.8 + (Math.random() - 0.5) * 4;
            }
          }
        }
      }

      // 3. Resolve boundary collisions and render
      const bounceRestitution = hasSensor ? 0.7 : 1.0;
      states.forEach(state => {
        if (!state.el) return;

        if (state.x <= 0) {
          state.x = 0;
          state.vx = Math.abs(state.vx) * bounceRestitution;
          state.vAngle = (Math.random() - 0.5) * 8;
        } else if (state.x >= width - currentSize) {
          state.x = width - currentSize;
          state.vx = -Math.abs(state.vx) * bounceRestitution;
          state.vAngle = (Math.random() - 0.5) * 8;
        }

        if (state.y <= 0) {
          state.y = 0;
          state.vy = Math.abs(state.vy) * bounceRestitution;
          state.vAngle = (Math.random() - 0.5) * 8;
        } else if (state.y >= height - currentSize) {
          state.y = height - currentSize;
          state.vy = -Math.abs(state.vy) * bounceRestitution;
          state.vAngle = (Math.random() - 0.5) * 8;
        }

        state.el.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.angle}deg)`;
      });

      animationId = requestAnimationFrame(updatePhysics);
    };

    animationId = requestAnimationFrame(updatePhysics);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('click', requestPermission);
      window.removeEventListener('touchstart', requestPermission);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
      {diceValues.map((value, i) => (
        <div
          key={i}
          ref={el => { elementsRef.current[i] = el; }}
          className="absolute w-16 h-16 md:w-24 md:h-24 bg-red-500 rounded-xl shadow-2xl p-2 flex items-center justify-center will-change-transform"
          style={{
            left: 0,
            top: 0,
            transform: 'translate3d(0, 0, 0)',
          }}
        >
          <StartScreenDiceFace value={value} />
        </div>
      ))}
    </div>
  );
};


const StartScreen: React.FC<StartScreenProps> = ({ onStartGame, onShowRules, isSoundEnabled, onToggleSound }) => {
  const playButtonSound = useSound('/sounds/button-click.mp3', 0.6, isSoundEnabled);
  const playGameStartSound = useSound('/sounds/game-start.mp3', 0.7, isSoundEnabled);


  const [showLeaderboard, setShowLeaderboard] = React.useState(false);
  const [nickname, setNickname] = React.useState(() => localStorage.getItem('komboNickname') || '');
  const [error, setError] = React.useState<string | null>(null);

  const validateNickname = (name: string) => {
    if (!name.trim()) return "Bitte gib einen Namen ein";
    if (name.length < 3) return "Name muss mindestens 3 Zeichen lang sein";
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) return "Nur Buchstaben, Zahlen, _ und - erlaubt";
    return null;
  };

  const handleStartGameClick = (mode: GameMode) => {
    const err = validateNickname(nickname);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    localStorage.setItem('komboNickname', nickname);
    playGameStartSound();
    setTimeout(() => {
        onStartGame(mode);
    }, 500); 
  };

  const handleStartMultiplayer = () => {
    const err = validateNickname(nickname);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    localStorage.setItem('komboNickname', nickname);
    onStartGame('online' as any);
  };

  const handleShowRulesClick = () => {
    playButtonSound();
    onShowRules();
  };

  const handleToggleSoundClick = () => {
    playButtonSound();
    onToggleSound();
  };

  const handleShowLeaderboardClick = () => {
    playButtonSound();
    setShowLeaderboard(true);
  };


  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white p-6 pb-16 selection:bg-yellow-400 selection:text-slate-800 overflow-hidden">
      <BackgroundDice />

      <header className="text-center mb-3 animate-fadeInScaleUp" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-game-title font-bold tracking-wide"
            style={{textShadow: '2px 2px 0px rgba(251, 191, 36, 0.7), 4px 4px 0px rgba(0,0,0,0.2)'}} // yellow-400
        >
          Kombo-Knubbel
        </h1>
      </header>

      <div className="mb-6 w-full max-w-xs animate-fadeInScaleUp flex flex-col gap-2" style={{ animationDelay: '0.4s', opacity: 0 }}>
          <label htmlFor="nickname" className="text-sm font-semibold text-slate-300 text-center uppercase tracking-wider">Dein Name</label>
          <input 
              id="nickname"
              type="text" 
              maxLength={15}
              placeholder="Spielername"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full bg-slate-800 border-2 ${error ? 'border-red-500' : 'border-slate-600'} rounded-lg py-3 px-4 text-center text-lg font-bold text-white focus:border-yellow-400 focus:ring-yellow-400 outline-none transition-colors shadow-inner`}
          />
          {error && <p className="text-red-400 text-xs text-center mt-1 font-semibold">{error}</p>}
      </div>

      <div className="w-full max-w-xs mb-4 animate-fadeInScaleUp" style={{ animationDelay: '0.5s', opacity: 0 }}>
        <button
          onClick={() => handleStartGameClick('kombo')}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ease-in-out text-lg focus:outline-none focus:ring-4 focus:ring-yellow-300"
          aria-label="Kombo-Knubbel solo spielen"
        >
          Kombo-Knubbel Solo
        </button>
      </div>

      <div className="w-full max-w-xs mb-4 animate-fadeInScaleUp" style={{ animationDelay: '0.6s', opacity: 0 }}>
        <button
          onClick={() => handleStartGameClick('classic')}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ease-in-out text-lg focus:outline-none focus:ring-4 focus:ring-teal-300"
          aria-label="Klassisches Knubbel solo spielen"
        >
          Klassisch Solo
        </button>
      </div>

      <div className="w-full max-w-xs mb-8 animate-fadeInScaleUp" style={{ animationDelay: '0.7s', opacity: 0 }}>
        <button
          onClick={handleStartMultiplayer}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ease-in-out text-lg focus:outline-none focus:ring-4 focus:ring-indigo-300"
        >
          🌐 Mit Freunden spielen
        </button>
      </div>
       <div className="flex flex-wrap justify-center items-center gap-4 animate-fadeInScaleUp" style={{ animationDelay: '0.8s', opacity: 0 }}>
        <button
            onClick={handleShowRulesClick}
            className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-md focus:outline-none focus:ring-4 focus:ring-slate-400"
            aria-label="Spielregeln anzeigen"
        >
            Regeln
        </button>
        <button
            onClick={handleShowLeaderboardClick}
            className="flex items-center gap-2 bg-yellow-600/80 hover:bg-yellow-500 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-md focus:outline-none focus:ring-4 focus:ring-yellow-400"
            aria-label="Bestenliste anzeigen"
        >
            <span className="material-icons-outlined text-xl">leaderboard</span>
            Highscores
        </button>
        <button
            onClick={handleToggleSoundClick}
            className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-3 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-4 focus:ring-slate-400 transform hover:scale-105"
            aria-label={isSoundEnabled ? "Ton ausschalten" : "Ton einschalten"}
            title={isSoundEnabled ? "Ton ausschalten" : "Ton einschalten"}
        >
            <span className="material-icons-outlined align-middle">
                {isSoundEnabled ? 'volume_up' : 'volume_off'}
            </span>
        </button>
      </div>
      {showLeaderboard && (
          <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-slate-400 text-sm animate-fadeInScaleUp" style={{ animationDelay: '1s', opacity: 0 }}>
          <p>&copy; {new Date().getFullYear()} mockfrog</p>
      </footer>
    </div>
  );
};

export default StartScreen;
