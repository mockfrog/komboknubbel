import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getTopScores, LeaderboardEntry } from '../services/leaderboard';
import { GameMode } from '../types';

interface LeaderboardProps {
    onClose: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
    const [mode, setMode] = useState<GameMode>('kombo');
    const [scores, setScores] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic when many scores exist
    useEffect(() => {
        const container = listRef.current;
        if (!container || loading || scores.length === 0 || isHovered) return;

        let animationFrameId: number;
        const scrollSpeed = 0.4; // super smooth slow speed
        let pauseTimeout: any = null;
        let isPaused = false;
        let accumulatedScroll = container.scrollTop;

        const scroll = () => {
            if (isPaused) {
                animationFrameId = requestAnimationFrame(scroll);
                return;
            }

            if (container.scrollHeight <= container.clientHeight) return;

            accumulatedScroll += scrollSpeed;
            container.scrollTop = accumulatedScroll;

            // Check if we reached the bottom (using a 4px safety buffer for zoom subpixels)
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 4) {
                isPaused = true;
                pauseTimeout = setTimeout(() => {
                    // Smoothly scroll back to the top
                    container.scrollTo({ top: 0, behavior: 'smooth' });
                    // Wait at the top before restarting
                    setTimeout(() => {
                        accumulatedScroll = 0;
                        isPaused = false;
                    }, 1500);
                }, 2000); // 2 second pause at the bottom
            }

            animationFrameId = requestAnimationFrame(scroll);
        };

        animationFrameId = requestAnimationFrame(scroll);

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (pauseTimeout) clearTimeout(pauseTimeout);
        };
    }, [scores, loading, isHovered]);

    const getHeaderGradient = () => {
        if (mode === 'kombo_khaos') return 'from-orange-500 via-red-500 to-orange-500';
        if (mode === 'classic_khaos') return 'from-purple-500 via-pink-500 to-indigo-500';
        if (mode === 'classic') return 'from-teal-500 via-emerald-500 to-teal-500';
        return 'from-yellow-500 via-amber-500 to-yellow-500';
    };

    const getScoreColor = () => {
        if (mode === 'kombo_khaos') return 'text-orange-400';
        if (mode === 'classic_khaos') return 'text-fuchsia-400';
        if (mode === 'classic') return 'text-teal-400';
        return 'text-emerald-400';
    };

    const getBorderColor = () => {
        if (mode === 'kombo_khaos') return 'hover:border-orange-500/40 hover:bg-orange-950/20';
        if (mode === 'classic_khaos') return 'hover:border-purple-500/40 hover:bg-purple-950/20';
        if (mode === 'classic') return 'hover:border-teal-500/40 hover:bg-teal-950/20';
        return 'hover:border-yellow-500/40 hover:bg-yellow-950/20';
    };

    useEffect(() => {
        const fetchScores = async () => {
            setLoading(true);
            try {
                const topScores = await getTopScores(mode, 10);
                setScores(topScores);
            } catch (err) {
                console.error("Fehler beim Laden der Bestenliste", err);
            } finally {
                setLoading(false);
            }
        };
        fetchScores();
    }, [mode]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700 animate-slideUpScale">
                <div className="bg-slate-700 p-4 border-b border-slate-600 flex justify-between items-center relative">
                    <div>
                        <h2 className="text-2xl font-bold text-yellow-400 font-game-title" style={{textShadow: '1px 1px 0px rgba(0,0,0,0.5)'}}>
                            Bestenliste
                        </h2>
                        <span className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase block mt-0.5">
                            {mode === 'kombo_khaos' && '💥 Khaos Kombo-Knubbel'}
                            {mode === 'classic_khaos' && '💥 Khaos Klassisch'}
                            {mode === 'kombo' && '🏆 Kombo-Knubbel'}
                            {mode === 'classic' && '🏆 Klassisch'}
                        </span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Schließen"
                    >
                        <span className="material-icons-outlined text-3xl">close</span>
                    </button>
                    
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${getHeaderGradient()}`}></div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        <button
                            onClick={() => setMode('kombo')}
                            className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-md transition-all transform active:scale-95 ${
                                mode === 'kombo' 
                                    ? 'bg-yellow-500 text-slate-900 shadow-md ring-2 ring-yellow-400/50' 
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-700/50'
                            }`}
                        >
                            Kombo-Knubbel
                        </button>
                        <button
                            onClick={() => setMode('classic')}
                            className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-md transition-all transform active:scale-95 ${
                                mode === 'classic' 
                                    ? 'bg-teal-500 text-white shadow-md ring-2 ring-teal-400/50' 
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-700/50'
                            }`}
                        >
                            Klassisch
                        </button>
                        <button
                            onClick={() => setMode('kombo_khaos')}
                            className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-md transition-all transform active:scale-95 flex items-center justify-center gap-1 ${
                                mode === 'kombo_khaos' 
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md ring-2 ring-orange-400/50' 
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-700/50'
                            }`}
                        >
                            💥 Khaos Kombo
                        </button>
                        <button
                            onClick={() => setMode('classic_khaos')}
                            className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-md transition-all transform active:scale-95 flex items-center justify-center gap-1 ${
                                mode === 'classic_khaos' 
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md ring-2 ring-purple-400/50' 
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-700/50'
                            }`}
                        >
                            💥 Khaos Klassisch
                        </button>
                    </div>

                    <div 
                        ref={listRef}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="bg-slate-900/50 rounded-lg p-4 h-[320px] max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent"
                    >
                        {loading ? (
                             <div className="flex justify-center items-center h-full pt-10">
                                <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 ${
                                    mode === 'kombo_khaos' ? 'border-orange-500' :
                                    mode === 'classic_khaos' ? 'border-purple-500' :
                                    mode === 'classic' ? 'border-teal-400' :
                                    'border-yellow-400'
                                }`}></div>
                            </div>
                        ) : scores.length === 0 ? (
                            <div className="text-center text-slate-500 pt-10">
                                Noch keine Einträge vorhanden. Sei der Erste!
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {scores.map((entry, index) => (
                                    <li key={entry.id} className={`flex justify-between items-center p-3 rounded-md bg-slate-800/80 border border-slate-700/50 transition-all ${getBorderColor()}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                                                index === 0 ? 'bg-yellow-400 text-yellow-900 shadow-sm' :
                                                index === 1 ? 'bg-slate-300 text-slate-800' :
                                                index === 2 ? 'bg-amber-600 text-amber-100' :
                                                'bg-slate-700 text-slate-400'
                                            }`}>
                                                {index + 1}
                                            </span>
                                            <span className="font-semibold text-slate-200">{entry.nickname}</span>
                                        </div>
                                        <span className={`font-mono text-xl font-bold tracking-tight transition-colors ${getScoreColor()}`}>{entry.score}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                
                <div className="bg-slate-900 p-4 border-t border-slate-700 text-center">
                    <button 
                        onClick={onClose}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-slate-500"
                    >
                        Zurück zum Menü
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Leaderboard;
