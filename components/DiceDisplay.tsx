import React from 'react';
import { DiceValue } from '../types';
import useSound from '../hooks/useSound'; // Import the hook

interface DiceDisplayProps {
  value: DiceValue;
  isHeld: boolean;
  onClick: () => void;
  rolling: boolean; // This prop indicates if this specific die is part of the current roll action
  isSoundEnabled: boolean;
  isUnrolled?: boolean;
}

const DiceFace: React.FC<{ value: DiceValue }> = ({ value }) => {
  const pips = [];
  // Basic pip representation. Could be improved with SVGs.
  // Pip color is black, background defined by parent.
  if (value === 1) pips.push(<div key="1c" className="col-start-2 row-start-2 w-3 h-3 bg-black rounded-full"></div>);
  if (value === 2) {
    pips.push(<div key="2a" className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="2b" className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full"></div>);
  }
  if (value === 3) {
    pips.push(<div key="3a" className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="3b" className="col-start-2 row-start-2 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="3c" className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full"></div>);
  }
  if (value === 4) {
    pips.push(<div key="4a" className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="4b" className="col-start-3 row-start-1 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="4c" className="col-start-1 row-start-3 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="4d" className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full"></div>);
  }
  if (value === 5) {
    pips.push(<div key="5a" className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="5b" className="col-start-3 row-start-1 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="5c" className="col-start-2 row-start-2 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="5d" className="col-start-1 row-start-3 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="5e" className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full"></div>);
  }
  if (value === 6) {
    pips.push(<div key="6a" className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="6b" className="col-start-3 row-start-1 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="6c" className="col-start-1 row-start-2 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="6d" className="col-start-3 row-start-2 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="6e" className="col-start-1 row-start-3 w-3 h-3 bg-black rounded-full"></div>);
    pips.push(<div key="6f" className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full"></div>);
  }

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-1 place-items-center">
      {pips}
    </div>
  );
};


const DiceDisplay: React.FC<DiceDisplayProps> = ({ value, isHeld, onClick, rolling, isSoundEnabled, isUnrolled }) => {
  const playDiceHoldSound = useSound('/sounds/dice-hold.mp3', 0.4, isSoundEnabled);
  const [flickerValue, setFlickerValue] = React.useState<DiceValue>(value);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rolling) {
      interval = setInterval(() => {
        setFlickerValue((Math.floor(Math.random() * 6) + 1) as DiceValue);
      }, 70);
    } else {
      setFlickerValue(value);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rolling, value]);

  const handleClick = () => {
    if (isUnrolled) return;
    playDiceHoldSound();
    onClick();
  };

  let heldClasses = '';
  if (isUnrolled) {
    heldClasses = 'bg-slate-700/50 border-slate-600 text-slate-400 cursor-default shadow-inner';
  } else if (isHeld) {
    heldClasses = 'bg-yellow-400 border-yellow-600 ring-2 ring-offset-2 ring-offset-slate-700 ring-yellow-500';
  } else {
    heldClasses = 'bg-slate-200 border-slate-400 hover:border-yellow-400';
  }

  const rollingClasses = rolling ? 'dice-is-rolling' : '';

  return (
    <button
      onClick={handleClick}
      disabled={isUnrolled}
      className={`dice w-16 h-16 md:w-20 md:h-20 border-2 rounded-lg shadow-md flex items-center justify-center text-3xl font-bold transition-colors ${heldClasses} ${rollingClasses} ${isHeld ? 'held' : ''}`}
      aria-label={isUnrolled ? 'Würfel verdeckt' : `Würfel zeigt ${value}, ${isHeld ? 'gehalten' : 'nicht gehalten'}. Zum Halten/Lösen klicken.`}
    >
      {isUnrolled ? (
        <span className="text-4xl opacity-50 font-game-title">?</span>
      ) : (
        <DiceFace value={flickerValue} />
      )}
    </button>
  );
};

export default DiceDisplay;
