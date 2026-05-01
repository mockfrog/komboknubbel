
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


const AnimatedDice: React.FC<{ animationClass?: string }> = ({ animationClass }) => {
  const diceValues = React.useMemo(() => [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ], []);

  return (
    <div className="flex space-x-4 mb-12">
      {diceValues.map((value, i) => (
         <div
            key={i}
            className={`w-16 h-16 md:w-20 md:h-20 bg-red-500 rounded-lg shadow-xl p-2 flex items-center justify-center ${animationClass} ${i === 1 ? 'animate-floatDice-delay1' : i === 2 ? 'animate-floatDice-delay2' : 'animate-floatDice' }`}
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white p-6 selection:bg-yellow-400 selection:text-slate-800">
      <header className="text-center mb-10 animate-fadeInScaleUp" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-game-title font-bold tracking-wide"
            style={{textShadow: '2px 2px 0px rgba(251, 191, 36, 0.7), 4px 4px 0px rgba(0,0,0,0.2)'}} // yellow-400
        >
          Kombo-Knubbel
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mt-3">Das ultimative Würfelspiel!</p>
      </header>

      <AnimatedDice animationClass="animate-floatDice" />

      <div className="mb-8 w-full max-w-xs animate-fadeInScaleUp flex flex-col gap-2" style={{ animationDelay: '0.4s', opacity: 0 }}>
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

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 mb-6 animate-fadeInScaleUp" style={{ animationDelay: '0.6s', opacity: 0 }}>
        <button
          onClick={() => handleStartGameClick('kombo')}
          className="bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ease-in-out text-lg focus:outline-none focus:ring-4 focus:ring-yellow-300"
          aria-label="Kombo-Knubbel solo spielen"
        >
          Kombo-Knubbel Solo
        </button>
        <button
          onClick={() => handleStartGameClick('classic')}
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ease-in-out text-lg focus:outline-none focus:ring-4 focus:ring-teal-300"
          aria-label="Klassisches Knubbel solo spielen"
        >
          Klassisch Solo
        </button>
      </div>
      <div className="mb-6 animate-fadeInScaleUp flex justify-center" style={{ animationDelay: '0.7s', opacity: 0 }}>
         <button
          onClick={handleStartMultiplayer}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ease-in-out text-lg focus:outline-none focus:ring-4 focus:ring-indigo-300 w-full sm:w-auto"
        >
          🌐 Mit Freunden spielen (Host / Invite-Code)
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
      <footer className="absolute bottom-6 text-center text-slate-400 text-sm animate-fadeInScaleUp" style={{ animationDelay: '1s', opacity: 0 }}>
          <p>&copy; {new Date().getFullYear()} mockfrog</p>
      </footer>
    </div>
  );
};

export default StartScreen;
