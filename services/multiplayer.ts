import { io } from 'socket.io-client';
import { GameMode, Scores } from '../types';
import { getInitialScores, NUM_DICE, INITIAL_HELD_DICE, INITIAL_DICE_VALUES, MAX_ROLLS, CATEGORIES_CONFIG } from '../constants';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const socket = io(SOCKET_URL);

export interface Player {
    userId: string;
    nickname: string;
    hasLeft?: boolean;
}

export interface MatchState {
    id?: string;
    hostId: string;
    inviteCode: string;
    status: 'waiting' | 'playing' | 'finished';
    gameMode: GameMode;
    playerIds: string[];
    players: Record<string, Player>;
    currentTurnUserId: string;
    diceValues: number[];
    heldDice: boolean[];
    diceRolledInLastAction: boolean[];
    rollsLeft: number;
    scores: Record<string, Scores>;
    playersOrder: string[];
    turnIndex: number;
    column3NextRow: Record<string, number>;
    column4NextRow: Record<string, number>;
    createdAt?: any;
    updatedAt?: any;
}

export async function createMatch(hostId: string, nickname: string, gameMode: GameMode): Promise<string> {
    const initialState: Partial<MatchState> = {
        hostId,
        status: 'waiting',
        gameMode,
        playerIds: [hostId],
        players: {
            [hostId]: { userId: hostId, nickname }
        },
        currentTurnUserId: '',
        diceValues: INITIAL_DICE_VALUES,
        heldDice: INITIAL_HELD_DICE,
        diceRolledInLastAction: Array(NUM_DICE).fill(false),
        rollsLeft: MAX_ROLLS,
        scores: {},
        playersOrder: [],
        turnIndex: 0,
        column3NextRow: {},
        column4NextRow: {},
    };

    const response = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, nickname, gameMode, initialState })
    });
    const { inviteCode } = await response.json();
    socket.emit('joinMatch', inviteCode);
    return inviteCode;
}

export async function joinMatch(code: string, userId: string, nickname: string) {
    const response = await fetch(`${API_URL}/matches/${code}`);
    if (!response.ok) throw new Error("Match nicht gefunden");
    const data = await response.json() as MatchState;
    
    if (data.status !== 'waiting') {
        throw new Error("Match hat bereits begonnen oder ist beendet");
    }
    if (data.playerIds.includes(userId)) {
        socket.emit('joinMatch', code);
        return;
    }
    if (data.playerIds.length >= 6) {
        throw new Error("Match ist voll");
    }

    const newState = {
        ...data,
        playerIds: [...data.playerIds, userId],
        players: {
            ...data.players,
            [userId]: { userId, nickname }
        }
    };

    socket.emit('updateMatch', code, newState);
    socket.emit('joinMatch', code);
}

export async function startMatch(code: string, match: MatchState) {
    const order = [...match.playerIds];
    const initialScores: Record<string, Scores> = {};
    const col3Init: Record<string, number> = {};
    const col4Init: Record<string, number> = {};
    
    const numCols = match.gameMode === 'kombo' ? 6 : 1;
    order.forEach(pid => {
        initialScores[pid] = getInitialScores(numCols);
        col3Init[pid] = 0;
        col4Init[pid] = CATEGORIES_CONFIG.length - 1;
    });

    const newState: MatchState = {
        ...match,
        status: 'playing',
        playersOrder: order,
        currentTurnUserId: order[0],
        scores: initialScores,
        turnIndex: 0,
        rollsLeft: MAX_ROLLS,
        diceValues: INITIAL_DICE_VALUES,
        heldDice: INITIAL_HELD_DICE,
        diceRolledInLastAction: Array(NUM_DICE).fill(false),
        column3NextRow: col3Init,
        column4NextRow: col4Init,
    };

    socket.emit('updateMatch', code, newState);
}

export async function rollOnlineDice(matchId: string, userId: string, match: MatchState) {
    if (match.currentTurnUserId !== userId) return;
    if (match.rollsLeft <= 0) return;
    
    const newDice = match.diceValues.map((v, i) => match.heldDice[i] ? v : (Math.floor(Math.random() * 6) + 1));
    const newlyRolled = match.heldDice.map(h => !h);

    const newState = {
        ...match,
        diceValues: newDice,
        rollsLeft: match.rollsLeft - 1,
        diceRolledInLastAction: newlyRolled,
    };

    socket.emit('updateMatch', matchId, newState);
}

export async function toggleOnlineHoldDie(matchId: string, userId: string, match: MatchState, diceIndex: number) {
    if (match.currentTurnUserId !== userId) return;
    if (match.rollsLeft === MAX_ROLLS || match.rollsLeft === 0) return;

    const newHeld = [...match.heldDice];
    newHeld[diceIndex] = !newHeld[diceIndex];

    const newState = {
        ...match,
        heldDice: newHeld,
    };

    socket.emit('updateMatch', matchId, newState);
}

export async function submitOnlineScore(
    matchId: string,
    userId: string,
    match: MatchState,
    categoryKey: string,
    columnIndex: number,
    score: number
) {
    if (match.currentTurnUserId !== userId) return;

    let nextTurnIndex = match.turnIndex + 1;
    let isGameOver = false;
    let nextPlayerId = match.currentTurnUserId;
    
    const totalTurns = match.playerIds.length * CATEGORIES_CONFIG.length * (match.gameMode === 'kombo' ? 6 : 1);
    
    for (let attempts = 0; attempts < match.playerIds.length; attempts++) {
        isGameOver = nextTurnIndex >= totalTurns;
        if (isGameOver) break;
        
        nextPlayerId = match.playersOrder[nextTurnIndex % match.playerIds.length];
        
        if (!match.players[nextPlayerId]?.hasLeft) {
            break;
        }
        nextTurnIndex++;
    }

    const allPlayersLeft = match.playerIds.every(id => match.players[id]?.hasLeft);
    if (allPlayersLeft) {
        isGameOver = true;
    }

    const newState: MatchState = {
        ...match,
        currentTurnUserId: nextPlayerId,
        turnIndex: nextTurnIndex,
        rollsLeft: MAX_ROLLS,
        diceValues: INITIAL_DICE_VALUES,
        heldDice: INITIAL_HELD_DICE,
        diceRolledInLastAction: Array(NUM_DICE).fill(false),
        scores: {
            ...match.scores,
            [userId]: {
                ...match.scores[userId],
                [categoryKey]: match.scores[userId][categoryKey].map((s, idx) => idx === columnIndex ? score : s)
            }
        }
    };

    if (isGameOver) {
        newState.status = 'finished';
    }

    if (match.gameMode === 'kombo') {
        if (columnIndex === 3) {
            newState.column3NextRow = { ...match.column3NextRow, [userId]: match.column3NextRow[userId] + 1 };
        } else if (columnIndex === 4) {
            newState.column4NextRow = { ...match.column4NextRow, [userId]: match.column4NextRow[userId] - 1 };
        }
    }

    socket.emit('updateMatch', matchId, newState);
}

export async function leaveOnlineMatch(
    matchId: string,
    userId: string,
    match: MatchState
) {
    if (match.status === 'waiting') {
        const newPlayerIds = match.playerIds.filter(id => id !== userId);
        if (newPlayerIds.length === 0) {
             socket.emit('updateMatch', matchId, { ...match, status: 'finished' });
             return;
        }
        const updates: Partial<MatchState> = {
            playerIds: newPlayerIds,
        };
        if (match.hostId === userId) {
            updates.hostId = newPlayerIds[0];
        }
        socket.emit('updateMatch', matchId, { ...match, ...updates });
    } else {
        const players = {
            ...match.players,
            [userId]: { ...match.players[userId], hasLeft: true }
        };
        
        const allOtherPlayersLeft = match.playerIds.filter(id => id !== userId).every(id => players[id]?.hasLeft);
        
        let updates: Partial<MatchState> = { players };

        if (allOtherPlayersLeft) {
            updates.status = 'finished';
        } else if (match.currentTurnUserId === userId && match.status === 'playing') {
            let nextTurnIndex = match.turnIndex;
            let nextPlayerId = match.currentTurnUserId;
            let isGameOver = false;
            
            const totalTurns = match.playerIds.length * CATEGORIES_CONFIG.length * (match.gameMode === 'kombo' ? 6 : 1);
            
            for(let i=0; i<match.playerIds.length; i++) {
                nextTurnIndex++;
                isGameOver = nextTurnIndex >= totalTurns;
                if (isGameOver) break;
                
                nextPlayerId = match.playersOrder[nextTurnIndex % match.playerIds.length];
                if (!players[nextPlayerId]?.hasLeft && nextPlayerId !== userId) {
                    break;
                }
            }
            
            updates = {
                ...updates,
                currentTurnUserId: nextPlayerId,
                turnIndex: nextTurnIndex,
                rollsLeft: MAX_ROLLS,
                diceValues: INITIAL_DICE_VALUES,
                heldDice: INITIAL_HELD_DICE,
                diceRolledInLastAction: Array(NUM_DICE).fill(false),
            };
            
            if (isGameOver) {
                updates.status = 'finished';
            }
        }
        
        socket.emit('updateMatch', matchId, { ...match, ...updates });
    }
}
