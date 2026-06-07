
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, Dices, Award, ListChecks, ArrowDown, ArrowUp, RefreshCcw, HelpCircle, CheckCircle, Trophy, RefreshCw, Flame, Shield, Zap } from 'lucide-react';
import { DiceValue, ScoreCategoryKey, Scores, PotentialScores, GameMode } from './types';
import DiceDisplay from './components/DiceDisplay';
import Scoresheet from './components/Scoresheet';
import StartScreen from './components/StartScreen';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import OnlineGame from './components/OnlineGame';
import useSound from './hooks/useSound';
import {
  NUM_DICE, MAX_ROLLS, CATEGORIES_CONFIG, SCORING_FUNCTIONS,
  COLUMN_MULTIPLIERS_KOMBO, INITIAL_DICE_VALUES, INITIAL_HELD_DICE, getInitialScores, NUM_COLUMNS_KOMBO,
  calculateFinalTotalsForGameOverDisplay, UPPER_SECTION_BONUS_POINTS, UPPER_SECTION_BONUS_THRESHOLD
} from './constants';

interface LastMoveDetails {
  categoryKey: ScoreCategoryKey | null;
  columnIndex: number | null;
  scoredValue: number | null; 
  previousDiceValues: DiceValue[] | null;
  previousHeldDice: boolean[] | null;
  previousRollsLeft: number | null;
  previousColumn3NextRow: number | null; // Specific to Kombo mode
  previousColumn4NextRow: number | null; // Specific to Kombo mode
  previousDiceRolledInLastActionState: boolean[] | null; 
}

const INITIAL_LAST_MOVE_DETAILS: LastMoveDetails = {
  categoryKey: null,
  columnIndex: null,
  scoredValue: null,
  previousDiceValues: null,
  previousHeldDice: null,
  previousRollsLeft: null,
  previousColumn3NextRow: null,
  previousColumn4NextRow: null,
  previousDiceRolledInLastActionState: null,
};

import { submitScore } from './services/leaderboard';
import { v4 as uuidv4 } from 'uuid';

const RulesPopup: React.FC<{onClose: () => void, playPopupCloseSound: () => void}> = ({onClose, playPopupCloseSound}) => {
  const handleClose = () => {
      playPopupCloseSound();
      onClose();
  };
  return (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-700/50 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-yellow-400/10 rounded-xl">
                  <Info className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-3xl font-bold text-white font-game-title tracking-tight">Spielregeln</h2>
          </div>

          <div className="space-y-8 text-slate-300">
              <section className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold uppercase text-xs tracking-widest">
                      <Dices className="w-4 h-4" />
                      <span>Das Spielprinzip</span>
                  </div>
                  <p className="leading-relaxed">
                      Ziel ist es, den Spielplan strategisch klug auszufüllen und die höchste Gesamtpunktzahl zu erreichen. 
                      Pro Zug darfst du bis zu <span className="text-white font-bold">3 Mal würfeln</span>. Nach jedem Wurf kannst du beliebig viele Würfel "halten" und nur mit den restlichen weiterwürfeln.
                  </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs tracking-widest">
                          <Award className="w-4 h-4" />
                          <span>Multiplikatoren</span>
                      </div>
                      <p className="text-sm">
                          Im <span className="text-white font-semibold">Kombo-Modus</span> hat jede der 6 Spalten einen Multiplikator:
                      </p>
                      <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6].map(m => (
                              <span key={m} className={`px-2 py-1 rounded bg-slate-700 text-xs font-mono font-bold ${m > 3 ? 'text-emerald-400' : 'text-slate-300'}`}>x{m}</span>
                          ))}
                      </div>
                      <p className="text-xs italic text-slate-400">
                          Der Multiplikator wird am Spielende auf die Gesamtsumme der jeweiligen Spalte angewendet.
                      </p>
                  </section>

                  <section className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                      <div className="flex items-center gap-2 text-sky-400 font-bold uppercase text-xs tracking-widest">
                          <ListChecks className="w-4 h-4" />
                          <span>Der Bonus</span>
                      </div>
                      <p className="text-sm">
                          Erreichst du im oberen Teil (Einser bis Sechser) einer Spalte mindestens <span className="text-white font-bold">{UPPER_SECTION_BONUS_THRESHOLD} Punkte</span>, erhältst du einen Bonus von <span className="text-white font-bold">{UPPER_SECTION_BONUS_POINTS} Punkten</span>.
                      </p>
                  </section>
              </div>

              <section className="space-y-4">
                  <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-xs tracking-widest">
                      <HelpCircle className="w-4 h-4" />
                      <span>Spezialregeln der Spalten</span>
                  </div>
                  <div className="space-y-3">
                      <div className="flex gap-4 items-start bg-slate-800/30 p-3 rounded-lg border-l-4 border-purple-500">
                          <div className="mt-1"><ArrowDown className="w-5 h-5 text-purple-400" /></div>
                          <div>
                              <p className="text-white font-semibold text-sm italic">Spalte 4 (Abwärts)</p>
                              <p className="text-xs text-slate-400">Muss strikt von oben (Einser) nach unten (Chance) ausgefüllt werden.</p>
                          </div>
                      </div>
                      <div className="flex gap-4 items-start bg-slate-800/30 p-3 rounded-lg border-l-4 border-indigo-500">
                          <div className="mt-1"><ArrowUp className="w-5 h-5 text-indigo-400" /></div>
                          <div>
                              <p className="text-white font-semibold text-sm italic">Spalte 5 (Aufwärts)</p>
                              <p className="text-xs text-slate-400">Muss strikt von unten (Chance) nach oben (Einser) ausgefüllt werden.</p>
                          </div>
                      </div>
                      <div className="flex gap-4 items-start bg-slate-800/30 p-3 rounded-lg border-l-4 border-teal-500">
                          <div className="mt-1"><RefreshCcw className="w-5 h-5 text-teal-400" /></div>
                          <div>
                              <p className="text-white font-semibold text-sm italic">Spalte 6 (Letzter Wurf)</p>
                              <p className="text-xs text-slate-400 italic">"Der ultimative Knaller":</p>
                              <p className="text-xs text-slate-300">Du darfst hier nur Punkte eintragen, die <span className="text-teal-400 font-bold underline">ausschließlich</span> mit den Würfeln erzielt wurden, die du im allerletzten Wurf gewürfelt hast. Gehaltene Würfel zählen für diese Spalte nicht!</p>
                          </div>
                      </div>
                  </div>
              </section>

              <section className="space-y-4 border-t border-slate-800 pt-6">
                  <div className="flex items-center gap-2 text-orange-500 font-bold uppercase text-xs tracking-widest">
                      <Flame className="w-4 h-4" />
                      <span>Khaos-Modus 💥</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">
                      Der <span className="text-orange-400 font-semibold">Khaos-Modus</span> ist ein actiongeladener Multiplayer-Spielmodus. Aktiviere ihn beim Erstellen einer Lobby, um Power-Ups zu sammeln und einzusetzen.
                  </p>
                  <p className="text-xs text-slate-400">
                      Am Ende jedes Zugs besteht eine Chance von <span className="text-white font-bold">35 %</span>, dass du einen <span className="text-white font-bold">Spezialwürfel</span> erhältst. Dieser wird automatisch ausgewürfelt und fügt deinem Inventar eines der folgenden Power-Ups hinzu:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 bg-red-950/20 p-4 rounded-xl border border-red-500/20">
                          <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs uppercase tracking-wider mb-2">
                              <Zap className="w-4 h-4" />
                              <span>Offensive (Sabotage)</span>
                          </div>
                          <ul className="text-xs space-y-2 text-slate-300">
                              <li>
                                  <span className="font-bold text-white">💥 2von3 Runde</span>: Begrenzt den Gegner in seiner nächsten Runde auf max. 2 statt 3 Würfe.
                              </li>
                              <li>
                                  <span className="font-bold text-white">🚫 JetztNicht</span>: Verhindert 5 Runden lang, dass der Gegner einen Knubbel (Yahtzee) eintragen kann.
                              </li>
                              <li>
                                  <span className="font-bold text-white">🌫️ Nebel</span>: Verdeckt dem Gegner für 1 Runde während des Würfelns die freien Felder auf dem Zettel.
                              </li>
                              <li>
                                  <span className="font-bold text-white">🪓 Schwere Last</span>: Gegner darf in seiner nächsten Runde keine Würfel halten.
                              </li>
                              <li>
                                  <span className="font-bold text-white">💸 Punkte-Spender</span>: Stiehlt dem Gegner die Punkte seiner letzten Eintragung auf dein Bonuskonto.
                              </li>
                          </ul>
                      </div>

                      <div className="space-y-2 bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                              <Shield className="w-4 h-4" />
                              <span>Defensive & Hilfen</span>
                          </div>
                          <ul className="text-xs space-y-2 text-slate-300">
                              <li>
                                  <span className="font-bold text-white">🔄 Reroll +1</span>: Gewährt dir sofort einen zusätzlichen 4. Wurf in der laufenden Runde.
                              </li>
                              <li>
                                  <span className="font-bold text-white">🛡️ Stabiler Stand</span>: Macht dich 3 Runden lang immun gegen alle feindlichen Angriffe.
                              </li>
                              <li>
                                  <span className="font-bold text-white">🚀 Punkte-Booster</span>: Verdoppelt den Score deiner nächsten Eintragung auf dem Zettel.
                              </li>
                          </ul>
                      </div>
                  </div>
              </section>

              <section className="text-xs text-slate-500 bg-slate-800/20 p-3 rounded animate-pulse border border-slate-700/20">
                  <p>💡 <span className="font-bold">Tipp:</span> Wenn du nichts eintragen kannst, musst du ein Feld "streichen" (0 Punkte). Überlege dir gut, wo du Punkte opferst!</p>
              </section>
          </div>

          <button 
              onClick={handleClose} 
              className="mt-8 w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 font-black py-4 rounded-xl shadow-lg shadow-yellow-900/20 transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
              <CheckCircle className="w-5 h-5" />
              VERSTANDEN!
          </button>
      </div>
  </div>
  )
};

 const NewGameConfirmationDialog: React.FC<{onConfirm: () => void, onCancel: () => void, playButtonClickSound: () => void, playPopupCloseSound: () => void}> = ({ onConfirm, onCancel, playButtonClickSound, playPopupCloseSound }) => {
  const handleConfirm = () => {
      playButtonClickSound();
      onConfirm();
  };
  const handleCancel = () => {
      playPopupCloseSound();
      onCancel();
  };
  return (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
    <div className="bg-slate-800 p-6 rounded-lg shadow-2xl max-w-md w-full border border-slate-700">
      <h3 className="text-xl font-semibold mb-4 text-yellow-400 font-game-title">Neues Spiel starten?</h3>
      <p className="text-slate-200 mb-6">
        Dein aktueller Spielstand geht verloren. Bist du sicher, dass du ein neues Spiel beginnen möchtest?
      </p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-slate-500 hover:bg-slate-400 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Abbrechen und aktuelles Spiel fortsetzen"
        >
          Abbrechen
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-800 rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-300"
          aria-label="Bestätigen und neues Spiel starten"
        >
          Ja, neues Spiel
        </button>
      </div>
    </div>
  </div>
)};

const ExitConfirmationDialog: React.FC<{onConfirm: () => void, onCancel: () => void, playButtonClickSound: () => void, playPopupCloseSound: () => void}> = ({ onConfirm, onCancel, playButtonClickSound, playPopupCloseSound }) => {
  const handleConfirm = () => {
      playButtonClickSound();
      onConfirm();
  };
  const handleCancel = () => {
      playPopupCloseSound();
      onCancel();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60] animate-fadeIn">
      <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 animate-scaleInUp">
        <h3 className="text-xl font-bold mb-4 text-yellow-400 font-game-title">Spiel verlassen?</h3>
        <p className="text-slate-200 mb-6">
          Dein aktueller Spielstand geht verloren. Bist du sicher, dass du das Spiel verlassen und zum Hauptmenü zurückkehren möchtest?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-slate-500 hover:bg-slate-400 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            aria-label="Abbrechen und Spiel fortsetzen"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Bestätigen und Spiel verlassen"
          >
            Verlassen
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [onlineMatchId, setOnlineMatchId] = useState<string | null>(() => localStorage.getItem('komboMatchId'));
  const [onlineUser, setOnlineUser] = useState<{uid: string, nickname: string} | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    let userId = localStorage.getItem('komboUserId');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('komboUserId', userId);
    }
    const nickname = localStorage.getItem('komboNickname') || 'Spieler';
    setOnlineUser({ uid: userId, nickname });
    
    if (onlineMatchId) {
      setGameMode('online');
      setGameStarted(true);
    }
    setAuthLoading(false);
  }, [onlineMatchId]);

  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [nickname, setNickname] = useState<string>(() => localStorage.getItem('komboNickname') || '');
  const [diceValues, setDiceValues] = useState<DiceValue[]>(INITIAL_DICE_VALUES as DiceValue[]);
  const [heldDice, setHeldDice] = useState<boolean[]>(INITIAL_HELD_DICE);
  const [rollsLeft, setRollsLeft] = useState<number>(MAX_ROLLS);
  const [scores, setScores] = useState<Scores>(getInitialScores(NUM_COLUMNS_KOMBO)); // Default, will be reset
  const [potentialScores, setPotentialScores] = useState<PotentialScores>(getInitialScores(NUM_COLUMNS_KOMBO)); // Default
  
  // Column progression state, specific to 'kombo' mode
  const [column3NextRow, setColumn3NextRow] = useState<number>(0); 
  const [column4NextRow, setColumn4NextRow] = useState<number>(CATEGORIES_CONFIG.length - 1);
  
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [showSubmitScoreModal, setShowSubmitScoreModal] = useState<boolean>(false);
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [diceRolledInLastAction, setDiceRolledInLastAction] = useState<boolean[]>(Array(NUM_DICE).fill(false));
  
  const [showNewGameConfirmDialog, setShowNewGameConfirmDialog] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState<boolean>(false);

  const [lastMoveDetails, setLastMoveDetails] = useState<LastMoveDetails>(INITIAL_LAST_MOVE_DETAILS);
  const [canUndoLastScore, setCanUndoLastScore] = useState<boolean>(false);

  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
        const storedValue = window.localStorage.getItem('komboKnubbelSoundEnabled');
        return storedValue !== null ? JSON.parse(storedValue) : true;
    } catch {
        return true;
    }
  });

  useEffect(() => {
    try {
        window.localStorage.setItem('komboKnubbelSoundEnabled', JSON.stringify(isSoundEnabled));
    } catch(error) {
        console.error("Could not save sound preference.", error)
    }
  }, [isSoundEnabled]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  const exitGameToMainMenu = useCallback(() => {
    setGameStarted(false);
    setGameMode(null);
    setOnlineMatchId(null);
    localStorage.removeItem('komboMatchId');
    setGameOver(false);
    setShowSubmitScoreModal(false);
    setShowLeaderboard(false);
    setShowExitConfirmDialog(false);
  }, []);

  const lastStateRef = React.useRef({ gameStarted, showRules, showNewGameConfirmDialog, gameOver, gameMode, showLeaderboard, showExitConfirmDialog });
  lastStateRef.current = { gameStarted, showRules, showNewGameConfirmDialog, gameOver, gameMode, showLeaderboard, showExitConfirmDialog };

  const depthRef = React.useRef(0);

  // Synchronize browser history popstate (Back button) with React states
  useEffect(() => {
    if (window.history.state === null) {
      window.history.replaceState({ depth: 0 }, '');
    } else if (window.history.state && typeof window.history.state.depth === 'number') {
      depthRef.current = window.history.state.depth;
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const targetDepth = state && typeof state.depth === 'number' ? state.depth : 0;
      const currentDepth = depthRef.current;
      
      depthRef.current = targetDepth;

      if (targetDepth < currentDepth) {
        if (targetDepth < 2) {
          setShowRules(false);
          setShowNewGameConfirmDialog(false);
          setGameOver(false);
          setShowLeaderboard(false);
          setShowExitConfirmDialog(false);
        }
        if (targetDepth < 1) {
          const { gameStarted: started, gameOver: over } = lastStateRef.current;
          if (started && !over) {
            // A game is in progress! Prevent exit and show exit confirmation dialog
            setShowExitConfirmDialog(true);
            // Push history state back to 1 to keep user on the game screen
            window.history.pushState({ depth: 1 }, '');
            depthRef.current = 1;
          } else {
            exitGameToMainMenu();
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [exitGameToMainMenu]);

  // Synchronize React state changes to browser history
  useEffect(() => {
    const hasPopup = showRules || showNewGameConfirmDialog || gameOver || showLeaderboard || showExitConfirmDialog;
    const targetDepth = (gameStarted ? 1 : 0) + (hasPopup ? 1 : 0);
    const currentDepth = depthRef.current;

    if (targetDepth > currentDepth) {
      window.history.pushState({ depth: targetDepth }, '');
      depthRef.current = targetDepth;
    } else if (targetDepth < currentDepth) {
      const diff = currentDepth - targetDepth;
      window.history.go(-diff);
      depthRef.current = targetDepth;
    }
  }, [gameStarted, showRules, showNewGameConfirmDialog, gameOver, showLeaderboard, showExitConfirmDialog]);

  const playButtonClickSound = useSound('/sounds/button-click.mp3', 0.6, isSoundEnabled);
  const playScoreSelectSound = useSound('/sounds/score-select.mp3', 0.7, isSoundEnabled);
  const playDiceRollSound = useSound('/sounds/dice-roll.mp3', 0.8, isSoundEnabled);
  const playPopupOpenSound = useSound('/sounds/popup-open.mp3', 0.5, isSoundEnabled);
  const playPopupCloseSound = useSound('/sounds/popup-close.mp3', 0.5, isSoundEnabled);
  const playUndoSound = useSound('/sounds/button-click.mp3', 0.6, isSoundEnabled);
  const playHighscoreSound = useSound('/sounds/game-start.mp3', 0.8, isSoundEnabled); // Fallback to game-start
  const playGameOverSound = useSound('/sounds/popup-close.mp3', 0.7, isSoundEnabled); // Fallback to popup-close

  const currentNumColumns = gameMode === 'classic' ? 1 : NUM_COLUMNS_KOMBO;
  const currentColumnMultipliers = gameMode === 'classic' ? [1] : COLUMN_MULTIPLIERS_KOMBO;

  const resetTurn = useCallback(() => {
    setRollsLeft(MAX_ROLLS);
    setHeldDice(INITIAL_HELD_DICE);
    setDiceRolledInLastAction(Array(NUM_DICE).fill(false));
  }, []);

  const performStartNewGame = useCallback((mode: GameMode) => {
    setGameMode(mode);
    const numCols = mode === 'classic' ? 1 : NUM_COLUMNS_KOMBO;
    setDiceValues(INITIAL_DICE_VALUES as DiceValue[]);
    setHeldDice(INITIAL_HELD_DICE);
    setRollsLeft(MAX_ROLLS);
    setScores(getInitialScores(numCols));
    setPotentialScores(getInitialScores(numCols)); 
    setColumn3NextRow(0); // Reset for Kombo, ignored for Classic
    setColumn4NextRow(CATEGORIES_CONFIG.length - 1); // Reset for Kombo, ignored for Classic
    setGameOver(false);
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    setShowSubmitScoreModal(false);
    setIsRolling(false);
    setDiceRolledInLastAction(Array(NUM_DICE).fill(false));
    setShowNewGameConfirmDialog(false);
    setCanUndoLastScore(false);
    setLastMoveDetails(INITIAL_LAST_MOVE_DETAILS);
    setGameStarted(true);
  }, []);

  const handleRequestNewGame = useCallback(() => {
    playButtonClickSound();
    const gameInProgress = CATEGORIES_CONFIG.some(cat => scores[cat.key]?.some(s => s !== null));
    if (!gameOver && gameInProgress && gameStarted) { // only show confirm if a game is truly in progress
      setShowNewGameConfirmDialog(true);
    } else if (gameMode) { // If a mode is set, implies we want to restart that mode or switch
        performStartNewGame(gameMode);
    } else { // Should not happen if UI forces mode selection, but as a fallback
        setGameStarted(false); // Go back to start screen to select mode
    }
  }, [gameOver, scores, gameStarted, performStartNewGame, playButtonClickSound, gameMode]);


  useEffect(() => {
    if (!gameMode) return; // Don't check for game over if mode not set
    if (gameOver) return; // Already handled

    const isGameReallyOver = () => {
        for (const cat of CATEGORIES_CONFIG) {
            for (let i = 0; i < currentNumColumns; i++) {
                if (scores[cat.key]?.[i] === null) {
                    return false;
                }
            }
        }
        return true;
    };

    if (isGameReallyOver()) {
      setGameOver(true);
      
      // Auto-submit score
      if (onlineUser && nickname && gameMode !== 'online') {
        const { overallGrandTotal } = calculateFinalTotalsForGameOverDisplay(scores, currentNumColumns, currentColumnMultipliers);
        submitScore(onlineUser.uid, nickname, overallGrandTotal, gameMode)
          .then((res) => {
            setScoreSubmitted(true);
            if (res.isNewRecord) {
              setIsNewPersonalBest(true);
              playHighscoreSound();
            } else {
              playGameOverSound();
            }
          })
          .catch(err => {
            console.error("Auto-submit failed", err);
            playGameOverSound();
          });
      } else {
        playGameOverSound();
      }
    }
  }, [scores, currentNumColumns, gameMode, gameOver, onlineUser, nickname, currentColumnMultipliers]);

   const isCellClickable = useCallback((
    categoryKey: ScoreCategoryKey,
    categoryIndex: number,
    columnIndex: number
  ): boolean => {
    if (gameOver || rollsLeft === MAX_ROLLS || !gameMode) return false;
    if (scores[categoryKey]?.[columnIndex] !== null) return false;
    
    if (gameMode === 'kombo') {
        if (columnIndex === 3 && categoryIndex !== column3NextRow) return false; // Kombo Col 4 rule (Top-down)
        if (columnIndex === 4 && categoryIndex !== column4NextRow) return false; // Kombo Col 5 rule (Bottom-up)
    }
    // For classic mode (columnIndex is always 0), or Kombo cols 0, 1, 2, and 5 (Hand)
    return true;
  }, [gameOver, rollsLeft, scores, column3NextRow, column4NextRow, gameMode]); 

  const calculateCurrentPotentialScores = useCallback(() => {
    if (rollsLeft === MAX_ROLLS || gameOver || !gameMode) {
        const clearedPotentialScores = getInitialScores(currentNumColumns);
        setPotentialScores(clearedPotentialScores);
        return;
    }

    const newPotentialScores = getInitialScores(currentNumColumns);
    CATEGORIES_CONFIG.forEach((category, catIdx) => {
      for (let colIdx = 0; colIdx < currentNumColumns; colIdx++) {
        if (isCellClickable(category.key, catIdx, colIdx)) {
          let scoreDice = diceValues as DiceValue[];
          if (gameMode === 'kombo' && colIdx === 5) { // Kombo Col 6 "Aus der Hand" rule
            const freshlyRolledDiceInAction = diceValues.filter((_, i) => diceRolledInLastAction[i]);
            
             if (freshlyRolledDiceInAction.length === 0 && !diceRolledInLastAction.every(r => r) ) { 
                 newPotentialScores[category.key][colIdx] = SCORING_FUNCTIONS[category.key]([]);
                 continue;
            }
            scoreDice = freshlyRolledDiceInAction as DiceValue[];
          }
          const rawScore = SCORING_FUNCTIONS[category.key](scoreDice);
          newPotentialScores[category.key][colIdx] = rawScore;
        } else {
           newPotentialScores[category.key][colIdx] = null; 
        }
      }
    });
    setPotentialScores(newPotentialScores);
  }, [diceValues, rollsLeft, scores, column3NextRow, column4NextRow, isCellClickable, gameOver, diceRolledInLastAction, gameMode, currentNumColumns]);


  useEffect(() => {
    calculateCurrentPotentialScores();
  }, [calculateCurrentPotentialScores]); 


  const rollDiceAction = () => {
    if (rollsLeft > 0 && !gameOver && gameMode) {
      setCanUndoLastScore(false); 
      setLastMoveDetails(INITIAL_LAST_MOVE_DETAILS);
      playDiceRollSound();
      setIsRolling(true);
      const currentActionRolledDiceStatus = heldDice.map(h => !h);
      setDiceRolledInLastAction(currentActionRolledDiceStatus);
      
      setTimeout(() => {
        setDiceValues(prevDice =>
          prevDice.map((_die, index) => 
            heldDice[index] ? prevDice[index] : (Math.floor(Math.random() * 6) + 1) as DiceValue
          )
        );
        setRollsLeft(prev => prev - 1);
        setIsRolling(false);
      }, 600); 
    }
  };

  const toggleHoldDie = (index: number) => {
    if (rollsLeft < MAX_ROLLS && rollsLeft > 0 && !gameOver && gameMode) { 
      setHeldDice(prevHeld => {
        const newHeld = [...prevHeld];
        newHeld[index] = !newHeld[index];
        return newHeld;
      });
    }
  };
  

  const handleSelectScore = (categoryKey: ScoreCategoryKey, columnIndex: number) => {
    if (gameOver || !gameMode) return;

    const categoryIndex = CATEGORIES_CONFIG.findIndex(c => c.key === categoryKey);
    if (!isCellClickable(categoryKey, categoryIndex, columnIndex)) {
        console.warn("Attempted to score an unclickable cell.", {categoryKey, categoryIndex, columnIndex, rollsLeft});
        return;
    }
    
    let scoreToStore: number;
    if (gameMode === 'kombo' && columnIndex === 5) { // Kombo Col 6 "Aus der Hand" rule
        const freshlyRolledDiceForScore = diceValues.filter((_, i) => diceRolledInLastAction[i]);
        scoreToStore = SCORING_FUNCTIONS[categoryKey](freshlyRolledDiceForScore as DiceValue[]);
    } else {
        scoreToStore = SCORING_FUNCTIONS[categoryKey](diceValues as DiceValue[]);
    }
    
    setLastMoveDetails({
        categoryKey,
        columnIndex,
        scoredValue: scoreToStore,
        previousDiceValues: [...diceValues],
        previousHeldDice: [...heldDice],
        previousRollsLeft: rollsLeft,
        previousColumn3NextRow: gameMode === 'kombo' ? column3NextRow : null, 
        previousColumn4NextRow: gameMode === 'kombo' ? column4NextRow : null, 
        previousDiceRolledInLastActionState: [...diceRolledInLastAction],
    });
    setCanUndoLastScore(true);
    playScoreSelectSound();

    setScores(prevScores => {
      const newScores = { ...prevScores };
      if (!newScores[categoryKey]) {
        newScores[categoryKey] = Array(currentNumColumns).fill(null);
      }
      const newColumnScores = [...newScores[categoryKey]];
      newColumnScores[columnIndex] = scoreToStore;
      newScores[categoryKey] = newColumnScores;
      return newScores;
    });

    if (gameMode === 'kombo') {
        if (columnIndex === 3) { 
            setColumn3NextRow(prev => prev + 1);
        } else if (columnIndex === 4) { 
            setColumn4NextRow(prev => prev - 1);
        }
    }
    
    resetTurn();
  };

  const handleUndoLastScore = () => {
    if (!canUndoLastScore || !lastMoveDetails.categoryKey || lastMoveDetails.columnIndex === null || !gameMode) return;

    playUndoSound();

    setScores(prevScores => {
        const newScores = { ...prevScores };
        const newColumnScores = [...newScores[lastMoveDetails.categoryKey!]];
        newColumnScores[lastMoveDetails.columnIndex!] = null; 
        newScores[lastMoveDetails.categoryKey!] = newColumnScores;
        return newScores;
    });

    if (gameMode === 'kombo') {
        if (lastMoveDetails.columnIndex === 3 && lastMoveDetails.previousColumn3NextRow !== null) {
            setColumn3NextRow(lastMoveDetails.previousColumn3NextRow);
        }
        if (lastMoveDetails.columnIndex === 4 && lastMoveDetails.previousColumn4NextRow !== null) {
            setColumn4NextRow(lastMoveDetails.previousColumn4NextRow);
        }
    }

    if (lastMoveDetails.previousDiceValues) setDiceValues(lastMoveDetails.previousDiceValues);
    if (lastMoveDetails.previousHeldDice) setHeldDice(lastMoveDetails.previousHeldDice);
    if (lastMoveDetails.previousRollsLeft !== null) setRollsLeft(lastMoveDetails.previousRollsLeft);
    
    if (lastMoveDetails.previousDiceRolledInLastActionState) {
      setDiceRolledInLastAction(lastMoveDetails.previousDiceRolledInLastActionState);
    }

    if (gameOver) setGameOver(false); 

    setCanUndoLastScore(false);
    setLastMoveDetails(INITIAL_LAST_MOVE_DETAILS);
  };


  const { overallGrandTotal: finalGrandTotalForDisplay } = gameOver && gameMode ? calculateFinalTotalsForGameOverDisplay(scores, currentNumColumns, currentColumnMultipliers) : { overallGrandTotal: 0 };

  let screenContent;
  if (authLoading) {
    screenContent = (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <p className="text-xl animate-pulse">Lade Spiel...</p>
      </div>
    );
  } else if (!gameStarted || !gameMode) {
    screenContent = (
      <StartScreen
        onStartGame={(mode) => {
          const storedNickname = localStorage.getItem('komboNickname') || '';
          setNickname(storedNickname);
          if (mode === 'online') {
            setGameMode('online');
            setGameStarted(true);
          } else {
            performStartNewGame(mode);
          }
        }}
        onShowRules={() => {
          playPopupOpenSound();
          setShowRules(true);
        }}
        showLeaderboard={showLeaderboard}
        onShowLeaderboard={() => {
          playPopupOpenSound();
          setShowLeaderboard(true);
        }}
        onCloseLeaderboard={() => setShowLeaderboard(false)}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={toggleSound}
      />
    );
  } else if (gameMode === 'online' && (!onlineUser || !onlineMatchId)) {
    // If online mode but we don't have user/match state yet, show lobby or loading
    if (!onlineMatchId) {
        screenContent = (
          <MultiplayerLobby
             onGoBack={() => { setGameMode(null); setGameStarted(false); }}
             onMatchJoined={(matchId, user, nickname) => {
                setOnlineMatchId(matchId);
                setOnlineUser({ uid: user.uid, nickname });
             }}
             isSoundEnabled={isSoundEnabled}
             onToggleSound={toggleSound}
          />
        );
    } else {
        screenContent = (
          <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
            <p className="text-xl animate-pulse">Lade Online-Spiel...</p>
          </div>
        );
    }
  } else if (gameMode === 'online' && onlineMatchId && onlineUser) {
    screenContent = (
      <OnlineGame
        matchId={onlineMatchId}
        currentUser={onlineUser}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={toggleSound}
        onLeave={(forceExit) => { 
            if (forceExit) {
              exitGameToMainMenu();
            } else {
              setShowExitConfirmDialog(true);
            }
        }}
      />
    );
  } else {
    screenContent = (
      <div className="container mx-auto p-2 sm:p-4 max-w-6xl bg-gradient-to-br from-slate-800 via-slate-900 to-black text-slate-200 min-h-screen">
        <header className="mb-3 sm:mb-4 text-center py-2 sm:py-3.5 bg-slate-700/50 backdrop-blur-sm shadow-xl rounded-2xl border border-slate-600/30 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-2">
            <button 
                onClick={() => { playButtonClickSound(); setShowExitConfirmDialog(true); }} 
                className="p-2 bg-slate-800/50 hover:bg-red-500/20 rounded-lg transition-all text-slate-400 hover:text-red-400 font-bold"
                title="Menü"
            >
                <span className="material-icons-outlined">logout</span>
            </button>
            <button
                onClick={() => { playButtonClickSound(); toggleSound(); }}
                className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all text-slate-400 hover:text-white"
                title={isSoundEnabled ? 'Ton aus' : 'Ton an'}
            >
                <span className="material-icons-outlined text-sm">
                    {isSoundEnabled ? 'volume_up' : 'volume_off'}
                </span>
            </button>
          </div>

          <div className="px-4">
            <h1 className="text-xl sm:text-3xl font-bold text-yellow-400 font-game-title" style={{textShadow: '1px 1px 0px rgba(0,0,0,0.3)'}}>
              {gameMode === 'classic' ? 'KLASSISCH' : 'KOMBO-KNUBBEL'}
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-widest uppercase mt-1">Einzelspieler Modus • {gameMode === 'classic' ? '1 Spalte' : '6 Spalten'}</p>
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
            <button 
              onClick={handleRequestNewGame}
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold py-1.5 px-4 rounded-lg text-xs shadow-lg transition-all active:scale-95 hidden sm:block"
            >
              NEU
            </button>
            <button 
              onClick={() => { playPopupOpenSound(); setShowRules(true); }} 
              className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all text-slate-400 hover:text-white"
              title="Regeln"
            >
              <span className="material-icons-outlined">help_outline</span>
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 w-full overflow-x-auto bg-slate-800/40 backdrop-blur-sm p-4 rounded-3xl border border-slate-700/30 shadow-inner">
                <Scoresheet
                    scores={scores}
                    potentialScores={potentialScores}
                    onSelectScore={handleSelectScore} 
                    isCellClickable={(catKey, catIdx, colIdx) => isCellClickable(catKey, catIdx, colIdx)}
                    column3NextRow={column3NextRow}
                    column4NextRow={column4NextRow}
                    gameOver={gameOver}
                    gameMode={gameMode!}
                    effectiveNumColumns={currentNumColumns}
                    effectiveColumnMultipliers={currentColumnMultipliers}
                />
            </div>

            <div className="lg:w-80 w-full space-y-6 flex flex-col">
                <div className={`p-6 rounded-3xl shadow-2xl border transition-all duration-500 relative overflow-hidden bg-slate-700/40 backdrop-blur-md border-slate-600/20`}>
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 pt-4">
                        {diceValues.map((value, index) => ( 
                        <DiceDisplay
                            key={index}
                            value={value} 
                            isHeld={heldDice[index]}
                            onClick={() => toggleHoldDie(index)} 
                            rolling={isRolling && !heldDice[index] && diceRolledInLastAction[index]}
                            isSoundEnabled={isSoundEnabled}
                            isUnrolled={rollsLeft === MAX_ROLLS && !isRolling}
                        />
                        ))}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex flex-row justify-center items-stretch gap-3">
                            <button
                                onClick={rollDiceAction} 
                                disabled={rollsLeft === 0 || gameOver || isRolling || (!canUndoLastScore && rollsLeft === 0)}
                                className={`flex-1 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-black py-4 px-6 rounded-2xl shadow-xl text-xl transition-all duration-200 transform group relative overflow-hidden active:scale-95 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed ${isRolling ? 'animate-pulse' : ''}`}
                            >
                                <span className="relative z-10">
                                    {isRolling ? 'ROLLING...' : `WURF (${rollsLeft})`}
                                </span>
                                {!isRolling && rollsLeft > 0 && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                )}
                            </button>
                            
                            {canUndoLastScore && (
                                <button
                                onClick={handleUndoLastScore}
                                className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center min-w-[60px]"
                                aria-label="Rückgängig"
                                >
                                    <span className="material-icons-outlined">undo</span>
                                </button>
                            )}
                        </div>

                        <div className="text-center min-h-[1.5rem]"> 
                            {rollsLeft < MAX_ROLLS && rollsLeft > 0 && !gameOver && (
                            <p className="text-[11px] text-slate-400 animate-fade-in"> 
                                Klicke Würfel zum Halten
                            </p>
                            )}
                            {rollsLeft === 0 && !gameOver && !canUndoLastScore && ( 
                            <p className="text-sm text-yellow-400 font-bold animate-bounce" role="alert"> 
                                Wähle ein Feld! 
                            </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Score Summary Card for Mobile/Side */}
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/20 text-[11px] text-slate-500">
                    <div className="flex justify-between items-center mb-1">
                        <span>Punkte:</span>
                        <span className="text-lg font-bold text-white">{finalGrandTotalForDisplay}</span>
                    </div>
                </div>
            </div>
        </div>
         <footer className="text-center mt-8 pb-4 text-sm text-slate-400">
            <p>&copy; {new Date().getFullYear()} mockfrog</p>
        </footer>
      </div>
    );
  }

  return (
    <>
      {screenContent}
      {gameOver && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-800 border-2 border-yellow-400 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_-12px_rgba(250,204,21,0.5)] text-center animate-scaleInUp">
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-400 text-slate-900 shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>
            
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Spiel Beendet!</h2>
            
            <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-700">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-1">Deine Punkte</span>
              <span className="text-5xl font-black text-yellow-400 tabular-nums">
                {finalGrandTotalForDisplay}
              </span>
              
              {scoreSubmitted && isNewPersonalBest && (
                 <div className="mt-4 animate-bounce">
                   <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                      Neuer Highscore! 🎉
                   </span>
                   <p className="text-emerald-400 text-xs font-bold mt-2">Du hast dich selbst übertroffen!</p>
                 </div>
              )}

              {scoreSubmitted && !isNewPersonalBest && (
                <p className="text-slate-500 text-xs font-bold mt-3">Eingetragen in die Bestenliste</p>
              )}
              
              {!scoreSubmitted && (
                 <div className="flex items-center justify-center gap-2 mt-3 text-slate-400 animate-pulse">
                   <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                   <span className="text-xs font-bold uppercase">Wird gespeichert...</span>
                 </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRequestNewGame}
                className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" /> Noch eine Runde
              </button>
              <button 
                onClick={() => { playButtonClickSound(); setGameStarted(false); setGameMode(null); setGameOver(false); }}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl transition-all active:scale-95 text-sm"
              >
                Zum Hauptmenü
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showRules && createPortal(
        <RulesPopup onClose={() => setShowRules(false)} playPopupCloseSound={playPopupCloseSound} />,
        document.body
      )}
      {showNewGameConfirmDialog && gameMode && createPortal(
        <NewGameConfirmationDialog 
            onConfirm={() => {
                performStartNewGame(gameMode); // Restart with current mode
            }} 
            onCancel={() => {
                setShowNewGameConfirmDialog(false);
            }} 
            playButtonClickSound={playButtonClickSound}
            playPopupCloseSound={playPopupCloseSound}
        />,
        document.body
      )}
      {showExitConfirmDialog && createPortal(
        <ExitConfirmationDialog 
            onConfirm={() => {
                exitGameToMainMenu();
            }} 
            onCancel={() => {
                setShowExitConfirmDialog(false);
            }} 
            playButtonClickSound={playButtonClickSound}
            playPopupCloseSound={playPopupCloseSound}
        />,
        document.body
      )}
    </>
  );
};

export default App;
