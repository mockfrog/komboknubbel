import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { createMatch, joinMatch } from '../services/multiplayer';
import { GameMode } from '../types';

interface MultiplayerLobbyProps {
    onGoBack: () => void;
    onMatchJoined: (matchId: string, currentUser: User, nickname: string) => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onGoBack, onMatchJoined }) => {
    const [user, setUser] = useState<User | null>(null);
    const [nickname, setNickname] = useState<string>(() => localStorage.getItem('komboNickname') || '');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setLoading(false);
            } else {
                // Auto sign in anonymously if not authenticated
                try {
                    await signInAnonymously(auth);
                } catch (e: any) {
                    setLoading(false);
                    if (e.code === 'auth/operation-not-allowed') {
                        setError("Gast-Login ist deaktiviert. Bitte schalte 'Anonym' in der Firebase Authentication Console frei.");
                    } else {
                        setError(e.message);
                    }
                }
            }
        });
        return unsubscribe;
    }, []);

    const handleCreateMatch = async (mode: GameMode) => {
        if (!user || !nickname) return;
        setLoading(true);
        setError('');
        try {
            const code = await createMatch(user.uid, nickname, mode);
            localStorage.setItem('komboMatchId', code);
            onMatchJoined(code, user, nickname);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinMatch = async () => {
        if (!user || !nickname || !inviteCode) return;
        setLoading(true);
        setError('');
        try {
            await joinMatch(inviteCode.trim(), user.uid, nickname);
            localStorage.setItem('komboMatchId', inviteCode.trim().toUpperCase());
            onMatchJoined(inviteCode.trim().toUpperCase(), user, nickname);
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-yellow-400">Mit Freunden spielen</h2>
                    <button onClick={onGoBack} className="text-slate-400 hover:text-white">Zurück</button>
                </div>

                {error && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}

                {user && (
                    <div className="space-y-6">
                        <div className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between border border-slate-600">
                            <div>
                                <span className="block text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Dein Nickname</span>
                                <span className="text-xl font-black text-white">{nickname}</span>
                            </div>
                            <button 
                                onClick={onGoBack}
                                className="text-xs text-yellow-400 hover:text-yellow-300 font-bold uppercase underline"
                            >
                                Ändern
                            </button>
                        </div>

                        {nickname && (
                            <>
                                <div className="border-t border-slate-700 pt-6">
                                    <h3 className="text-xl font-semibold mb-4 text-emerald-400">Neues Spiel erstellen</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleCreateMatch('kombo')}
                                            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 px-4 rounded"
                                        >
                                            Kombo-Knubbel
                                        </button>
                                        <button
                                            onClick={() => handleCreateMatch('classic')}
                                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded"
                                        >
                                            Klassisch
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 pt-6">
                                    <h3 className="text-xl font-semibold mb-4 text-sky-400">Spiel beitreten</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                            placeholder="Einladecode (z.B. A1B2C)"
                                            className="flex-1 p-3 rounded bg-slate-700 text-white outline-none uppercase font-mono tracking-widest"
                                        />
                                        <button
                                            onClick={handleJoinMatch}
                                            disabled={!inviteCode || inviteCode.length !== 6}
                                            className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded disabled:opacity-50"
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
