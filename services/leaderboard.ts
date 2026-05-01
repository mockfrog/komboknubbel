import { GameMode } from '../types';

export interface LeaderboardEntry {
    id?: string;
    userId: string;
    nickname: string;
    score: number;
    gameMode: GameMode;
    createdAt?: any;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function submitScore(userId: string, nickname: string, score: number, gameMode: GameMode): Promise<{ isNewRecord: boolean }> {
    try {
        const response = await fetch(`${API_URL}/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, nickname, score, gameMode })
        });
        return await response.json();
    } catch (error) {
        console.error("Error updating leaderboard:", error);
        throw error;
    }
}

export async function getTopScores(gameMode: GameMode, limitCount: number = 10): Promise<LeaderboardEntry[]> {
    try {
        const response = await fetch(`${API_URL}/leaderboard?gameMode=${gameMode}&limit=${limitCount}`);
        return await response.json();
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }
}
