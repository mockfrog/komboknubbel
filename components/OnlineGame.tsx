import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MatchState, startMatch, rollOnlineDice, toggleOnlineHoldDie, submitOnlineScore, leaveOnlineMatch, socket } from '../services/multiplayer';
import { submitScore } from '../services/leaderboard';
import DiceDisplay from './DiceDisplay';
import Scoresheet from './Scoresheet';
import { NUM_COLUMNS_KOMBO, getInitialScores, COLUMN_MULTIPLIERS_KOMBO, CATEGORIES_CONFIG, SCORING_FUNCTIONS, MAX_ROLLS, calculateFinalTotalsForGameOverDisplay, INITIAL_DICE_VALUES, NUM_DICE } from '../constants';
import useSound from '../hooks/useSound';
import { Trophy, RefreshCw, CheckCircle } from 'lucide-react';

function isCellClickable(
    categoryIndex: number,
    columnIndex: number,
    hasScore: boolean,
    column3NextRow: number,
    column4NextRow: number,
    numCols: number
): boolean {
    if (hasScore) return false;
    
    if (numCols === 6) {
        if (columnIndex === 3 && categoryIndex !== column3NextRow) return false; // Kombo Col 4 rule (Top-down)
        if (columnIndex === 4 && categoryIndex !== column4NextRow) return false; // Kombo Col 5 rule (Bottom-up)
    }
    return true;
}

function calculateCurrentPotentialScores(
    diceValues: number[],
    scores: any,
    diceRolledInLastAction: boolean[],
    column3NextRow: number,
    column4NextRow: number,
    numCols: number
) {
    const newPotentialScores = getInitialScores(numCols);
    CATEGORIES_CONFIG.forEach((category, catIdx) => {
        for (let colIdx = 0; colIdx < numCols; colIdx++) {
            const hasScore = scores[category.key]?.[colIdx] !== null;
            if (isCellClickable(catIdx, colIdx, hasScore, column3NextRow, column4NextRow, numCols)) {
                let scoreDice = diceValues;
                if (numCols === 6 && colIdx === 5) {
                    const freshlyRolledDiceInAction = diceValues.filter((_, i) => diceRolledInLastAction[i]);
                    if (freshlyRolledDiceInAction.length === 0 && !diceRolledInLastAction.every(r => r)) {
                        newPotentialScores[category.key][colIdx] = 0;
                        continue;
                    }
                    scoreDice = freshlyRolledDiceInAction;
                }
                const rawScore = SCORING_FUNCTIONS[category.key](scoreDice as any);
                newPotentialScores[category.key][colIdx] = rawScore;
            } else {
                newPotentialScores[category.key][colIdx] = null;
            }
        }
    });
    return newPotentialScores;
}

interface OnlineGameProps {
    matchId: string;
    currentUser: any;
    onLeave: () => void;
    isSoundEnabled: boolean;
}

const OnlineGame: React.FC<OnlineGameProps> = ({ matchId, currentUser, onLeave, isSoundEnabled }) => {
    const [match, setMatch] = useState<MatchState | null>(null);
    const [viewedUserId, setViewedUserId] = useState<string>(currentUser?.uid || '');
    const [localIsRolling, setLocalIsRolling] = useState(false);
    const [copied, setCopied] = useState(false);
    const [scoreSubmitted, setScoreSubmitted] = useState(false);
    const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser?.uid && !viewedUserId) {
            setViewedUserId(currentUser.uid);
        }
    }, [currentUser, viewedUserId]);
    
    // Make sure we have sound capabilities
    const playButtonClickSound = useSound('/sounds/button-click.mp3', 0.6, isSoundEnabled);
    const playScoreSelectSound = useSound('/sounds/score-select.mp3', 0.7, isSoundEnabled);
    const playDiceRollSound = useSound('/sounds/dice-roll.mp3', 0.8, isSoundEnabled);
    const playHighscoreSound = useSound('/sounds/game-start.mp3', 0.8, isSoundEnabled); // Fallback to game-start
    const playGameOverSound = useSound('/sounds/popup-close.mp3', 0.7, isSoundEnabled); // Fallback to popup-close

    const handleCopyCode = () => {
        navigator.clipboard.writeText(matchId)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => console.error("Kopieren fehlgeschlagen", err));
    };

    const matchRef = useRef<MatchState | null>(null);
    const rollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        socket.emit('joinMatch', matchId);

        const handleUpdate = (data: MatchState) => {
            const prevMatch = matchRef.current;
            
            if (data.status === 'playing' && prevMatch) {
                if (data.diceValues && data.diceValues.join() !== prevMatch.diceValues?.join()) {
                    if (rollingTimeoutRef.current) clearTimeout(rollingTimeoutRef.current);
                    rollingTimeoutRef.current = setTimeout(() => {
                        setLocalIsRolling(false);
                    }, 600);
                }
            }
            
            matchRef.current = data;
            setMatch(data);
            setLoading(false);

            if (data.status === 'playing') {
                setViewedUserId(prev => {
                    if (prev) return prev; 
                    return data.currentTurnUserId || currentUser?.uid || '';
                });
            }
        };

        socket.on('matchUpdated', handleUpdate);

        // Fetch initial state
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        fetch(`${API_URL}/matches/${matchId}`)
            .then(res => {
                if (!res.ok) throw new Error("Match not found");
                return res.json();
            })
            .then(data => handleUpdate(data))
            .catch(err => {
                console.error("Fehler beim Laden des Matches:", err);
                onLeave();
            });

        return () => {
            socket.off('matchUpdated', handleUpdate);
            if (rollingTimeoutRef.current) clearTimeout(rollingTimeoutRef.current);
        };
    }, [matchId, onLeave, currentUser?.uid]);

    const handleStart = async () => {
        if (!match) return;
        await startMatch(matchId, match);
    };

    const handleRoll = async () => {
        if (!match || !currentUser || match.currentTurnUserId !== currentUser.uid || match.rollsLeft === 0) return;
        setLocalIsRolling(true);
        playDiceRollSound();
        
        // Safety timeout to stop animation even if socket fails or dice are identical
        if (rollingTimeoutRef.current) clearTimeout(rollingTimeoutRef.current);
        rollingTimeoutRef.current = setTimeout(() => {
            setLocalIsRolling(false);
        }, 2000);

        await rollOnlineDice(matchId, currentUser.uid, match);
    };

    const handleToggleHold = async (index: number) => {
        if (!match || !currentUser || match.currentTurnUserId !== currentUser.uid) return;
        playButtonClickSound();
        await toggleOnlineHoldDie(matchId, currentUser.uid, match, index);
    };

    const handleSelectScore = async (categoryKey: string, columnIndex: number, scoredValue: number | null | undefined) => {
        if (!match || !currentUser || match.currentTurnUserId !== currentUser.uid) return;
        // Verify it was clickable
        if (viewedUserId !== currentUser.uid) return; // Cant click other's board
        if (scoredValue === null || scoredValue === undefined) return;
        
        playScoreSelectSound();
        await submitOnlineScore(matchId, currentUser.uid, match, categoryKey, columnIndex, scoredValue);
        // Focus stays on current turn
    };

    const myTurn = match?.currentTurnUserId === currentUser?.uid;

    const potentialScores = useMemo(() => {
        const defaultNumCols = match?.gameMode === 'kombo' ? 6 : 1;
        if (!match || match.status !== 'playing') return getInitialScores(defaultNumCols);
        
        if (viewedUserId === match.currentTurnUserId && match.rollsLeft < 3) {
            const userScores = match.scores && match.scores[viewedUserId] ? match.scores[viewedUserId] : getInitialScores(defaultNumCols);
            return calculateCurrentPotentialScores(
                match.diceValues || INITIAL_DICE_VALUES,
                userScores,
                match.diceRolledInLastAction || Array(NUM_DICE).fill(false),
                match.column3NextRow?.[viewedUserId] || 0,
                match.column4NextRow?.[viewedUserId] || 0,
                defaultNumCols
            );
        }
        return getInitialScores(defaultNumCols); // empty if not their turn
    }, [match, viewedUserId]);

    const isClickable = useCallback((categoryKey: string, categoryIndex: number, columnIndex: number) => {
        if (!match || match.status !== 'playing' || !myTurn || viewedUserId !== currentUser?.uid) return false;
        if (match.rollsLeft === 3) return false;
        
        const userId = currentUser?.uid;
        if (!userId) return false;
        
        const hasScore = match.scores[userId]?.[categoryKey]?.[columnIndex] !== null;

        const effectiveNumCols = match.gameMode === 'kombo' ? 6 : 1;
        return isCellClickable(
            categoryIndex, 
            columnIndex, 
            hasScore, 
            match.column3NextRow[userId] || 0,
            match.column4NextRow[userId] || 0,
            effectiveNumCols
        );
    }, [match, myTurn, viewedUserId, currentUser?.uid]);

    const handleLeave = async () => {
        if (!match || !currentUser) {
            onLeave();
            return;
        }
        try {
            await leaveOnlineMatch(matchId, currentUser.uid, match);
        } catch (error) {
            console.error("Fehler beim Verlassen des Matches:", error);
        } finally {
            onLeave();
        }
    };

    const isGameOver = match?.status === 'finished';
    const effectiveNumCols = match?.gameMode === 'kombo' ? 6 : 1;

    const myFinalScore = useMemo(() => {
        if (!isGameOver || !currentUser || !match) return 0;
        const myScores = match.scores?.[currentUser.uid];
        if (!myScores) return 0;
        const colMultipliers = match.gameMode === 'classic' ? [1] : COLUMN_MULTIPLIERS_KOMBO;
        const { overallGrandTotal } = calculateFinalTotalsForGameOverDisplay(myScores, effectiveNumCols, colMultipliers);
        return overallGrandTotal;
    }, [isGameOver, match, currentUser, effectiveNumCols]);

    useEffect(() => {
        if (isGameOver && !scoreSubmitted && currentUser?.uid && match) {
            const nickname = match.players[currentUser.uid]?.nickname || 'Spieler';
            submitScore(currentUser.uid, nickname, myFinalScore, match.gameMode)
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
                    console.error("Online Highscore Auto-Submit failed", err);
                    playGameOverSound();
                });
        }
    }, [isGameOver, scoreSubmitted, currentUser?.uid, match, myFinalScore]);

    const currentTurnNickname = match?.players[match?.currentTurnUserId]?.nickname || 'Unbekannt';

    if (!match) return <div className="text-white text-center mt-20">Lade Match...</div>;

    if (match.status === 'waiting') {
        const isHost = match.hostId === currentUser?.uid;
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
                 <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center w-full max-w-lg">
                    <h2 className="text-3xl font-bold text-yellow-400 mb-2">Lobby</h2>
                    <div className="bg-slate-900 p-4 rounded mb-6 flex flex-col items-center relative">
                        <span className="text-slate-400 text-sm">Einladecode:</span>
                        <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={handleCopyCode}
                            title="Code kopieren"
                        >
                            <span className="text-4xl font-mono tracking-widest text-emerald-400 select-all group-hover:text-emerald-300 transition-colors">{matchId}</span>
                            <span className="material-icons-outlined text-slate-500 group-hover:text-emerald-400 transition-colors">content_copy</span>
                        </div>
                        {copied && (
                            <span className="text-xs text-yellow-400 absolute bottom-1 right-2 animate-bounce">Kopiert!</span>
                        )}
                    </div>

                    <h3 className="text-xl text-left text-slate-300 border-b border-slate-700 pb-2 mb-4">Spieler ({match.playerIds.length}/6)</h3>
                    <ul className="text-left space-y-2 mb-6">
                        {match.playerIds.map(pid => (
                            <li key={pid} className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                <span className={pid === currentUser?.uid ? 'font-bold text-yellow-400' : 'text-slate-200'}>
                                    {match.players[pid]?.nickname} {pid === match.hostId ? '(Host)' : ''}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {isHost ? (
                        <button onClick={handleStart} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded shadow mb-4">
                            Spiel starten
                        </button>
                    ) : (
                        <p className="text-emerald-400 animate-pulse mb-4">Warte auf Host...</p>
                    )}
                    <button onClick={handleLeave} className="text-slate-400 hover:text-white text-sm">Verlassen</button>
                 </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-2 sm:p-4 max-w-6xl bg-gradient-to-br from-slate-800 via-slate-900 to-black text-slate-200 min-h-screen">
             <header className="mb-4 sm:mb-6 text-center py-4 sm:py-6 bg-slate-700/50 backdrop-blur-sm shadow-xl rounded-2xl border border-slate-600/30 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <button 
                         onClick={handleLeave} 
                         className="p-2 bg-slate-800/50 hover:bg-red-500/20 rounded-lg transition-all text-slate-400 hover:text-red-400"
                         title="Verlassen"
                     >
                        <span className="material-icons-outlined">logout</span>
                    </button>
                </div>

                <div className="px-4">
                    <h1 className="text-2xl sm:text-4xl font-bold text-yellow-400 font-game-title" style={{textShadow: '1px 1px 0px rgba(0,0,0,0.3)'}}>
                        {match.gameMode === 'classic' ? 'KLASSISCH' : 'KOMBO-KNUBBEL'}
                    </h1>
                     <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-widest uppercase mt-1">Multiplayer Modus • {match.gameMode === 'classic' ? '1 Spalte' : '6 Spalten'}</p>
                </div>
                
            {isGameOver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-slate-800 border-2 border-yellow-400 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_-12px_rgba(250,204,21,0.5)] text-center animate-scaleInUp">
                        <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 text-white shadow-lg">
                             <Trophy className="w-8 h-8" />
                        </div>
                        
                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Fertig!</h2>
                        
                        <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-700">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-1">Deine Punkte</span>
                            <span className="text-5xl font-black text-emerald-400 tabular-nums">
                              {myFinalScore}
                            </span>
                            
                            {scoreSubmitted && isNewPersonalBest && (
                                <div className="mt-4 animate-bounce">
                                    <span className="bg-yellow-400 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                        Persönliche Bestzeit! 🎉
                                    </span>
                                    <p className="text-yellow-400 text-xs font-bold mt-2">Glückwunsch zur Verbesserung!</p>
                                </div>
                            )}

                            {scoreSubmitted && !isNewPersonalBest && (
                                <p className="text-slate-500 text-xs font-bold mt-3">In Bestenliste eingetragen</p>
                            )}

                            {!scoreSubmitted && (
                                <div className="flex items-center justify-center gap-2 mt-3 text-slate-400 animate-pulse">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                    <span className="text-xs font-bold uppercase">Bestenliste wird geprüft...</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                             <button 
                                onClick={handleLeave} 
                                className="w-full py-4 bg-yellow-400 hover:bg-yellow-400 text-slate-900 font-bold rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                             >
                                <RefreshCw className="w-5 h-5" /> Zurück zur Lobby
                             </button>
                        </div>
                    </div>
                </div>
            )}
            {!isGameOver && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1 bg-slate-900/40 rounded-full border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider">Am Zug: </span>
                    <span className={`text-sm font-bold ${myTurn ? 'text-yellow-400' : 'text-white'}`}>
                        {myTurn ? 'DU bist dran!' : currentTurnNickname}
                    </span>
                    {myTurn && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></span>}
                </div>
            )}
             </header>

             {/* Tab Bar for Players - Styled like Game Tabs */}
             <div className="flex overflow-x-auto space-x-1 mb-4 hide-scrollbar px-1">
                {match.playersOrder.map(pid => (
                    <button
                        key={pid}
                        onClick={() => setViewedUserId(pid)}
                        className={`px-3 py-2 rounded-t-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 text-xs sm:text-sm ${
                            viewedUserId === pid 
                            ? 'bg-slate-700/60 backdrop-blur-md text-yellow-400 border-t border-x border-slate-600/50 shadow-[0_-2px_10px_rgba(0,0,0,0.3)]' 
                            : 'bg-slate-800/40 text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                        } ${match.players[pid]?.hasLeft ? 'opacity-40 italic' : ''}`}
                    >
                        {match.players[pid]?.nickname} {match.currentTurnUserId === pid && '🎲'}
                    </button>
                ))}
             </div>

             <div className="flex flex-col lg:flex-row gap-6 items-start">
                 {/* BOARD COMPONENT */}
                 <div className="flex-1 w-full overflow-x-auto bg-slate-800/40 backdrop-blur-sm p-4 rounded-3xl border border-slate-700/30 shadow-inner">
                    <Scoresheet
                        scores={(match.scores && match.scores[viewedUserId]) ? match.scores[viewedUserId] : getInitialScores(effectiveNumCols)}
                        potentialScores={potentialScores}
                        effectiveNumColumns={effectiveNumCols}
                        effectiveColumnMultipliers={match.gameMode === 'kombo' ? COLUMN_MULTIPLIERS_KOMBO : [1]} 
                        gameOver={isGameOver}
                        gameMode={match.gameMode}
                        onSelectScore={(catKey, colIdx) => handleSelectScore(catKey, colIdx, potentialScores[catKey][colIdx])}
                        isCellClickable={(catKey, catIdx, colIdx) => isClickable(catKey as string, catIdx, colIdx)}
                        column3NextRow={match.column3NextRow?.[viewedUserId] || 0}
                        column4NextRow={match.column4NextRow?.[viewedUserId] || 0}
                    />
                 </div>
                 
                 {/* DICE PANEL */}
                 <div className="lg:w-80 w-full space-y-6 flex flex-col">
                     <div className={`p-6 rounded-3xl shadow-2xl border transition-all duration-500 relative overflow-hidden ${myTurn ? 'bg-slate-700/40 backdrop-blur-md border-yellow-500/30 ring-1 ring-yellow-500/10' : 'bg-slate-800/30 backdrop-blur-sm border-slate-700/40 opacity-80'}`}>
                         {/* Status Badge */}
                         {!isGameOver && (
                             <div className="absolute top-2 right-4">
                                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${myTurn ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
                                     {myTurn ? 'Dein Zug' : 'Warten...'}
                                 </span>
                             </div>
                         )}

                         <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 pt-4">
                             {match.diceValues && match.diceValues.map((value, index) => (
                                <DiceDisplay
                                    key={index}
                                    value={value}
                                    isHeld={match.heldDice[index]}
                                    onClick={() => handleToggleHold(index)}
                                    rolling={localIsRolling && !match.heldDice[index]}
                                    isSoundEnabled={true}
                                    isUnrolled={match.rollsLeft === MAX_ROLLS && !localIsRolling}
                                />
                             ))}
                         </div>

                         <div className="space-y-4">
                            <button
                                onClick={handleRoll}
                                disabled={!myTurn || match.rollsLeft === 0 || localIsRolling || isGameOver}
                                className={`w-full font-black py-4 px-6 rounded-2xl shadow-xl text-xl transition-all duration-200 transform group relative overflow-hidden
                                    ${myTurn && match.rollsLeft > 0 && !localIsRolling
                                        ? 'bg-gradient-to-r from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white hover:scale-[1.02] active:scale-95 shadow-red-500/20' 
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600/50'}`}
                            >
                                <span className="relative z-10">
                                    {isGameOver ? 'SPIEL ENDE' : localIsRolling ? 'ROLLING...' : `WURF (${match.rollsLeft})`}
                                </span>
                                {myTurn && match.rollsLeft > 0 && !localIsRolling && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                )}
                            </button>

                            <div className="text-center min-h-[1.5rem]">
                                {myTurn && match.rollsLeft < 3 && match.rollsLeft > 0 && (
                                    <p className="text-[11px] text-slate-400 animate-fade-in">Klicke Würfel zum Halten</p>
                                )}
                                {myTurn && match.rollsLeft === 0 && (
                                    <p className="text-sm text-yellow-400 font-bold animate-bounce">Wähle ein Feld!</p>
                                )}
                            </div>
                         </div>
                     </div>

                     {/* Info Card */}
                     <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/20 text-[11px] text-slate-500">
                         <div className="flex justify-between mb-1">
                             <span>Invite Code:</span>
                             <span className="font-mono text-emerald-400 cursor-pointer hover:text-emerald-300" onClick={handleCopyCode}>{matchId}</span>
                         </div>
                         <p>Klicke auf den Namen oben, um das Board der anderen Spieler zu sehen.</p>
                     </div>
                 </div>
             </div>
        </div>
    );
};

export default OnlineGame;
