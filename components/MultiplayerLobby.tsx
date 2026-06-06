import React, { useState, useEffect } from 'react';
import { createMatch, joinMatch } from '../services/multiplayer';
import { GameMode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import useSound from '../hooks/useSound';

interface MultiplayerLobbyProps {
    onGoBack: () => void;
    onMatchJoined: (matchId: string, currentUser: { uid: string }, nickname: string) => void;
    isSoundEnabled?: boolean;
    onToggleSound?: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onGoBack, onMatchJoined, isSoundEnabled = true, onToggleSound }) => {
    const playButtonClickSound = useSound('/sounds/button-click.mp3', 0.6, isSoundEnabled);
    const [userId, setUserId] = useState<string | null>(null);
    const [nickname, setNickname] = useState<string>(() => localStorage.getItem('komboNickname') || '');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isKhaosMode, setIsKhaosMode] = useState(false);

    useEffect(() => {
        let storedUserId = localStorage.getItem('komboUserId');
        if (!storedUserId) {
            storedUserId = uuidv4();
            localStorage.setItem('komboUserId', storedUserId);
        }
        setUserId(storedUserId);
        setLoading(false);
    }, []);

    const handleCreateMatch = async (mode: GameMode) => {
        if (!userId || !nickname) return;
        setLoading(true);
        setError('');
        try {
            const code = await createMatch(userId, nickname, mode, isKhaosMode);
            localStorage.setItem('komboMatchId', code);
            onMatchJoined(code, { uid: userId }, nickname);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinMatch = async () => {
        if (!userId || !nickname || !inviteCode) return;
        setLoading(true);
        setError('');
        try {
            await joinMatch(inviteCode.trim(), userId, nickname);
            localStorage.setItem('komboMatchId', inviteCode.trim().toUpperCase());
            onMatchJoined(inviteCode.trim().toUpperCase(), { uid: userId }, nickname);
        } catch (e: any) {
            setError("Fehler beim Beitreten: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-white text-center p-10">Lade...</div>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 sm:p-6">
            <div className="bg-slate-800 p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400">Mit Freunden spielen</h2>
                    <div className="flex items-center gap-2">
                        {onToggleSound && (
                            <button
                                onClick={() => { playButtonClickSound(); onToggleSound(); }}
                                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-all text-slate-400 hover:text-white"
                                title={isSoundEnabled ? 'Ton aus' : 'Ton an'}
                            >
                                <span className="material-icons-outlined text-sm">
                                    {isSoundEnabled ? 'volume_up' : 'volume_off'}
                                </span>
                            </button>
                        )}
                        <button onClick={() => { playButtonClickSound(); onGoBack(); }} className="text-slate-400 hover:text-white">Zurück</button>
                    </div>
                </div>

                {error && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}

                {userId && (
                    <div className="space-y-6">
                        <div className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between border border-slate-600">
                            <div>
                                <span className="block text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Dein Nickname</span>
                                <span className="text-xl font-black text-white">{nickname}</span>
                            </div>
                            <button 
                                onClick={() => { playButtonClickSound(); onGoBack(); }}
                                className="text-xs text-yellow-400 hover:text-yellow-300 font-bold uppercase underline"
                            >
                                Ändern
                            </button>
                        </div>

                        {nickname && (
                            <>
                                <div className="border-t border-slate-700 pt-6">
                                    <h3 className="text-xl font-semibold mb-4 text-emerald-400">Neues Spiel erstellen</h3>
                                    
                                    {/* Khaos-Modus Toggle */}
                                    <div className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg border border-slate-700 mb-4 hover:border-yellow-500/30 transition-colors">
                                        <div>
                                            <span className="block text-sm font-bold text-yellow-400 flex items-center gap-1.5">
                                                💥 Khaos-Modus aktivieren
                                            </span>
                                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                                Mit PowerUps, Statuseffekten & Glücksrad!
                                            </span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={isKhaosMode} 
                                                onChange={(e) => setIsKhaosMode(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => { playButtonClickSound(); handleCreateMatch('kombo'); }}
                                            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 px-4 rounded"
                                        >
                                            Kombo-Knubbel
                                        </button>
                                        <button
                                            onClick={() => { playButtonClickSound(); handleCreateMatch('classic'); }}
                                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded"
                                        >
                                            Klassisch
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 pt-6">
                                    <h3 className="text-xl font-semibold mb-4 text-sky-400">Spiel beitreten</h3>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                            placeholder="Einladecode (z.B. A1B2CD)"
                                            className="flex-1 p-3 rounded bg-slate-700 text-white outline-none uppercase font-mono tracking-widest text-center sm:text-left"
                                        />
                                        <button
                                            onClick={() => { playButtonClickSound(); handleJoinMatch(); }}
                                            disabled={!inviteCode || inviteCode.length !== 6}
                                            className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded disabled:opacity-50 w-full sm:w-auto"
                                        >
                                            Beitreten
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
