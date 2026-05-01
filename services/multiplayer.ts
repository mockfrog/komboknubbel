import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { GameMode, Scores } from '../types';
import { getInitialScores, NUM_DICE, INITIAL_HELD_DICE, INITIAL_DICE_VALUES, MAX_ROLLS, CATEGORIES_CONFIG } from '../constants';

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

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createMatch(hostId: string, nickname: string, gameMode: GameMode): Promise<string> {
    const code = generateCode();
    const matchRef = doc(db, 'matches', code);
    
    const snap = await getDoc(matchRef);
    if (snap.exists()) {
        return createMatch(hostId, nickname, gameMode);
    }

    const initialMatch: any = {
        hostId,
        inviteCode: code,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(matchRef, initialMatch);
    return code;
}

export async function joinMatch(code: string, userId: string, nickname: string) {
    const matchRef = doc(db, 'matches', code);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) {
        throw new Error("Match nicht gefunden");
    }
    const data = snap.data() as MatchState;
    if (data.status !== 'waiting') {
        throw new Error("Match hat bereits begonnen oder ist beendet");
    }
    if (data.playerIds.includes(userId)) {
        return;
    }
    if (data.playerIds.length >= 6) {
        throw new Error("Match ist voll");
    }

    await updateDoc(matchRef, {
        playerIds: arrayUnion(userId),
        [`players.${userId}`]: { userId, nickname },
        updatedAt: serverTimestamp()
    });
}

export async function startMatch(code: string, match: MatchState) {
    const matchRef = doc(db, 'matches', code);
    const order = [...match.playerIds];
    
    const initialScores: Record<string, Scores> = {};
    const col3Init: Record<string, number> = {};
    const col4Init: Record<string, number> = {};
    
    // In backend mode, kombo is strictly kombo logic
    const numCols = match.gameMode === 'kombo' ? 6 : 1;
    order.forEach(pid => {
        initialScores[pid] = getInitialScores(numCols);
        col3Init[pid] = 0;
        col4Init[pid] = CATEGORIES_CONFIG.length - 1;
    });

    await updateDoc(matchRef, {
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
        updatedAt: serverTimestamp()
    });
}

export async function rollOnlineDice(matchId: string, userId: string, match: MatchState) {
    if (match.currentTurnUserId !== userId) return;
    if (match.rollsLeft <= 0) return;
    
    const newDice = match.diceValues.map((v, i) => match.heldDice[i] ? v : (Math.floor(Math.random() * 6) + 1));
    const newlyRolled = match.heldDice.map(h => !h);

    await updateDoc(doc(db, 'matches', matchId), {
        diceValues: newDice,
        rollsLeft: match.rollsLeft - 1,
        diceRolledInLastAction: newlyRolled,
        updatedAt: serverTimestamp()
    });
}

export async function toggleOnlineHoldDie(matchId: string, userId: string, match: MatchState, diceIndex: number) {
    if (match.currentTurnUserId !== userId) return;
    if (match.rollsLeft === MAX_ROLLS || match.rollsLeft === 0) return;

    const newHeld = [...match.heldDice];
    newHeld[diceIndex] = !newHeld[diceIndex];

    await updateDoc(doc(db, 'matches', matchId), {
        heldDice: newHeld,
        updatedAt: serverTimestamp()
    });
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
    
    // Determine the next active player. Maximum loop is total allowed turns.
    const totalTurns = match.playerIds.length * CATEGORIES_CONFIG.length * (match.gameMode === 'kombo' ? 6 : 1);
    
    for (let attempts = 0; attempts < match.playerIds.length; attempts++) {
        isGameOver = nextTurnIndex >= totalTurns;
        if (isGameOver) break;
        
        nextPlayerId = match.playersOrder[nextTurnIndex % match.playerIds.length];
        
        if (!match.players[nextPlayerId]?.hasLeft) {
            break; // Found an active player
        }
        
        // If that player left, skip their turn
        nextTurnIndex++;
    }

    // Checking globally if all players have left
    const allPlayersLeft = match.playerIds.every(id => match.players[id]?.hasLeft);
    if (allPlayersLeft) {
        isGameOver = true;
    }

    const updates: any = {
        [`scores.${userId}.${categoryKey}`]: match.scores[userId][categoryKey].map((s, idx) => idx === columnIndex ? score : s),
        currentTurnUserId: nextPlayerId,
        turnIndex: nextTurnIndex,
        rollsLeft: MAX_ROLLS,
        diceValues: INITIAL_DICE_VALUES,
        heldDice: INITIAL_HELD_DICE,
        diceRolledInLastAction: Array(NUM_DICE).fill(false),
        updatedAt: serverTimestamp()
    };

    if (isGameOver) {
        updates.status = 'finished';
    }

    if (match.gameMode === 'kombo') {
        if (columnIndex === 3) {
            updates[`column3NextRow.${userId}`] = match.column3NextRow[userId] + 1;
        } else if (columnIndex === 4) {
            updates[`column4NextRow.${userId}`] = match.column4NextRow[userId] - 1;
        }
    }

    await updateDoc(doc(db, 'matches', matchId), updates);
}

export async function leaveOnlineMatch(
    matchId: string,
    userId: string,
    match: MatchState
) {
    if (match.status === 'waiting') {
        const newPlayerIds = match.playerIds.filter(id => id !== userId);
        if (newPlayerIds.length === 0) {
             await updateDoc(doc(db, 'matches', matchId), { 
                 status: 'finished',
                 updatedAt: serverTimestamp()
             });
             return;
        }
        const updates: any = {
            playerIds: newPlayerIds,
            updatedAt: serverTimestamp()
        };
        if (match.hostId === userId) {
            updates.hostId = newPlayerIds[0]; // pass host to someone else
        }
        await updateDoc(doc(db, 'matches', matchId), updates);
    } else {
        const updates: any = {
            [`players.${userId}.hasLeft`]: true,
            updatedAt: serverTimestamp()
        };
        
        const allOtherPlayersLeft = match.playerIds.filter(id => id !== userId).every(id => match.players[id]?.hasLeft);
        if (allOtherPlayersLeft) {
            updates.status = 'finished';
        } else if (match.currentTurnUserId === userId && match.status === 'playing') {
            // Find next active player
            let nextTurnIndex = match.turnIndex;
            let nextPlayerId = match.currentTurnUserId;
            let isGameOver = false;
            
            const totalTurns = match.playerIds.length * CATEGORIES_CONFIG.length * (match.gameMode === 'kombo' ? 6 : 1);
            
            for(let i=0; i<match.playerIds.length; i++) {
                nextTurnIndex++;
                isGameOver = nextTurnIndex >= totalTurns;
                if (isGameOver) break;
                
                nextPlayerId = match.playersOrder[nextTurnIndex % match.playerIds.length];
                if (!match.players[nextPlayerId]?.hasLeft && nextPlayerId !== userId) {
                    break;
                }
            }
            
            updates.currentTurnUserId = nextPlayerId;
            updates.turnIndex = nextTurnIndex;
            updates.rollsLeft = MAX_ROLLS;
            updates.diceValues = INITIAL_DICE_VALUES;
            updates.heldDice = INITIAL_HELD_DICE;
            updates.diceRolledInLastAction = Array(NUM_DICE).fill(false);
            
            if (isGameOver) {
                updates.status = 'finished';
            }
        }
        
        await updateDoc(doc(db, 'matches', matchId), updates);
    }
}
