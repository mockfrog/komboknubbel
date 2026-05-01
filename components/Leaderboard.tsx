import React, { useState, useEffect } from 'react';
import { getTopScores, LeaderboardEntry } from '../services/leaderboard';
import { GameMode } from '../types';

interface LeaderboardProps {
    onClose: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
    const [mode, setMode] = useState<GameMode>('kombo');
    const [scores, setScores] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700 animate-slideUpScale">
                <div className="bg-slate-700 p-4 border-b border-slate-600 flex justify-between items-center relative">
                    <h2 className="text-2xl font-bold text-yellow-400 font-game-title" style={{textShadow: '1px 1px 0px rgba(0,0,0,0.5)'}}>
                        Bestenliste
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Schließen"
                    >
                        <span className="material-icons-outlined text-3xl">close</span>
                    </button>
                    
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500"></div>
                </div>

                <div className="p-6">
                    <div className="flex bg-slate-900 rounded-lg p-1 mb-6">
                        <button
                            onClick={() => setMode('kombo')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'kombo' ? 'bg-yellow-500 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Kombo-Knubbel
                        </button>
                        <button
                            onClick={() => setMode('classic')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'classic' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Klassisch
                        </button>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-4 min-h-[300px]">
                        {loading ? (
                            <div className="flex justify-center items-center h-full pt-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
                            </div>
                        ) : scores.length === 0 ? (
                            <div className="text-center text-slate-500 pt-10">
                                Noch keine Einträge vorhanden. Sei der Erste!
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {scores.map((entry, index) => (
                                    <li key={entry.id} className="flex justify-between items-center p-3 rounded-md bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                                                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                index === 1 ? 'bg-slate-300 text-slate-800' :
                                                index === 2 ? 'bg-amber-600 text-amber-100' :
                                                'bg-slate-700 text-slate-400'
                                            }`}>
                                                {index + 1}
                                            </span>
                                            <span className="font-semibold text-slate-200">{entry.nickname}</span>
                                        </div>
                                        <span className="font-mono text-xl font-bold tracking-tight text-emerald-400">{entry.score}</span>
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
        </div>
    );
};

export default Leaderboard;
