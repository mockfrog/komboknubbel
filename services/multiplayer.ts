import { io } from 'socket.io-client';
import { GameMode, Scores, ActiveEffect } from '../types';
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
    
    // Khaos Mode Fields
    isKhaosMode?: boolean;
    powerups: Record<string, string[]>;
    activeEffects: Record<string, ActiveEffect[]>;
    bonusRollsAvailable: Record<string, number>;
    bonusPoints: Record<string, number>;
    lastScoredInfo?: Record<string, { categoryKey: string, score: number, columnIndex: number }>;
    activityLog?: string[];
}

export async function createMatch(hostId: string, nickname: string, gameMode: GameMode, isKhaosMode?: boolean): Promise<string> {
    const initialState: Partial<MatchState> = {
        hostId,
        status: 'waiting',
        gameMode,
        isKhaosMode,
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
        powerups: {},
        activeEffects: {},
        bonusRollsAvailable: {},
        bonusPoints: {},
        activityLog: isKhaosMode ? ['💥 Spiel im Khaos-Modus erstellt!'] : [],
    };

    const response = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, nickname, gameMode, initialState })
    });
    const { inviteCode } = await response.json();
    socket.emit('joinMatch', { inviteCode, userId: hostId });
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
        socket.emit('joinMatch', { inviteCode: code, userId });
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
    socket.emit('joinMatch', { inviteCode: code, userId });
}

export async function startMatch(code: string, match: MatchState) {
    const order = [...match.playerIds];
    const initialScores: Record<string, Scores> = {};
    const col3Init: Record<string, number> = {};
    const col4Init: Record<string, number> = {};
    
    // Khaos Mode initializations
    const powerupsInit: Record<string, string[]> = {};
    const activeEffectsInit: Record<string, ActiveEffect[]> = {};
    const bonusRollsInit: Record<string, number> = {};
    const bonusPointsInit: Record<string, number> = {};

    const numCols = match.gameMode === 'kombo' ? 6 : 1;
    order.forEach(pid => {
        initialScores[pid] = getInitialScores(numCols);
        col3Init[pid] = 0;
        col4Init[pid] = CATEGORIES_CONFIG.length - 1;
        powerupsInit[pid] = [];
        activeEffectsInit[pid] = [];
        bonusRollsInit[pid] = 0;
        bonusPointsInit[pid] = 0;
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
        powerups: powerupsInit,
        activeEffects: activeEffectsInit,
        bonusRollsAvailable: bonusRollsInit,
        bonusPoints: bonusPointsInit,
        lastScoredInfo: {},
        activityLog: match.isKhaosMode ? [
            '🎮 Willkommen beim Khaos-Knubbel!',
            `🎲 Erste Runde: ${match.players[order[0]]?.nickname || 'Spieler'} beginnt.`
        ] : [],
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

    // Check for no_hold active effect
    const hasNoHold = match.activeEffects?.[userId]?.some(eff => eff.type === 'no_hold');
    if (hasNoHold) {
        return; // blocked
    }

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

    let finalScoreValue = score;
    let usedBooster = false;
    const activityEntries: string[] = [];
    let updatedPowerups = match.powerups;

    // Apply score_booster or no_yahtzee if active
    if (match.isKhaosMode) {
        const activeEffects = match.activeEffects?.[userId] || [];
        const hasNoYahtzee = activeEffects.some(eff => eff.type === 'no_yahtzee');
        
        if (hasNoYahtzee && categoryKey === 'YAHTZEE') {
            finalScoreValue = 0;
            activityEntries.push(`🚫 Oh nein! Wegen JetztNicht wird der Knubbel als 0 Punkte eingetragen!`);
        } else {
            const boosterIndex = activeEffects.findIndex(eff => eff.type === 'score_booster');
            if (boosterIndex !== -1) {
                finalScoreValue = score * 2;
                usedBooster = true;
            }
        }

        // Trigger spins: flat 35% chance per turn to get 1 bonus roll, completely independent of score (better balancing)
        let earnedSpins = 0;
        const nickname = match.players[userId]?.nickname || 'Spieler';
        const categoryLabel = CATEGORIES_CONFIG.find(c => c.key === categoryKey)?.label || categoryKey;

        if (Math.random() < 0.35) {
            earnedSpins = 1;
            activityEntries.push(`🎁 Überraschungs-Khaos! ${nickname} erhält einen Spezialwürfel!`);
        }

        activityEntries.push(`📝 ${nickname} trägt ${finalScoreValue} Punkte bei ${categoryLabel} ein${usedBooster ? ' (2x Booster aktiv! 🚀)' : ''}.`);
        
        // Roll Special Die/Dice and add PowerUps automatically!
        if (earnedSpins > 0) {
            const powerupKeys = ['two_rolls_only', 'no_yahtzee', 'blind_sheet', 'no_hold', 'points_spender', 'reroll', 'immune', 'score_booster'];
            const newlyWon: string[] = [];
            
            for (let i = 0; i < earnedSpins; i++) {
                const randomPu = powerupKeys[Math.floor(Math.random() * powerupKeys.length)];
                newlyWon.push(randomPu);
            }
            
            const userPowerups = match.powerups?.[userId] || [];
            updatedPowerups = {
                ...match.powerups,
                [userId]: [...userPowerups, ...newlyWon]
            };
            
            const powerupNames: Record<string, string> = {
                two_rolls_only: '💥 2von3',
                no_yahtzee: '🚫 JetztNicht',
                blind_sheet: '🌫️ Nebel',
                no_hold: '🪓 Schwere Last',
                points_spender: '💸 Punkte-Spender',
                reroll: '🔄 Reroll',
                immune: '🛡️ Stabiler Stand',
                score_booster: '🚀 Punkte-Booster'
            };
            
            newlyWon.forEach(pu => {
                const puName = powerupNames[pu] || pu;
                activityEntries.push(`🎲 Spezialwürfel für ${nickname} zeigt: ${puName}!`);
            });
        }
    }

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

    // Decrement and filter effects for active player
    let updatedCasterEffects = match.activeEffects?.[userId] || [];
    if (match.isKhaosMode) {
        updatedCasterEffects = updatedCasterEffects
            .map(eff => {
                if (eff.type === 'score_booster') {
                    return { ...eff, roundsLeft: 0 }; // spent
                }
                return { ...eff, roundsLeft: eff.roundsLeft - 1 };
            })
            .filter(eff => eff.roundsLeft > 0);
    }

    // Determine next player's initial rolls
    let initialRollsLeft = MAX_ROLLS;
    if (match.isKhaosMode && nextPlayerId && !isGameOver) {
        const nextPlayerEffects = match.activeEffects?.[nextPlayerId] || [];
        const hasTwoRollsOnly = nextPlayerEffects.some(eff => eff.type === 'two_rolls_only');
        if (hasTwoRollsOnly) {
            initialRollsLeft = 2;
            const nextNickname = match.players[nextPlayerId]?.nickname || 'Nächster Spieler';
            activityEntries.push(`⏳ ${nextNickname} hat in dieser Runde nur 2 Würfe!`);
        }
    }

    // Activity Log merge
    let currentLog = match.activityLog || [];
    if (match.isKhaosMode) {
        currentLog = [...currentLog, ...activityEntries];
        if (currentLog.length > 15) {
            currentLog = currentLog.slice(currentLog.length - 15);
        }
    }

    const newState: MatchState = {
        ...match,
        powerups: updatedPowerups,
        currentTurnUserId: nextPlayerId,
        turnIndex: nextTurnIndex,
        rollsLeft: initialRollsLeft,
        diceValues: INITIAL_DICE_VALUES,
        heldDice: INITIAL_HELD_DICE,
        diceRolledInLastAction: Array(NUM_DICE).fill(false),
        scores: {
            ...match.scores,
            [userId]: {
                ...match.scores[userId],
                [categoryKey]: match.scores[userId][categoryKey].map((s, idx) => idx === columnIndex ? finalScoreValue : s)
            }
        }
    };

    if (isGameOver) {
        newState.status = 'finished';
        if (match.isKhaosMode) {
            newState.activityLog = [...currentLog, '🏁 Spiel beendet! Herzlichen Glückwunsch!'];
        }
    } else if (match.isKhaosMode) {
        newState.activeEffects = {
            ...match.activeEffects,
            [userId]: updatedCasterEffects
        };
        newState.lastScoredInfo = {
            ...match.lastScoredInfo,
            [userId]: { categoryKey, score: finalScoreValue, columnIndex }
        };
        newState.activityLog = currentLog;
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

export async function spinOnlineBonusWheel(matchId: string, userId: string, match: MatchState, rolledPowerUp: string) {
    if (!match.isKhaosMode) return;
    const currentSpins = match.bonusRollsAvailable?.[userId] || 0;
    if (currentSpins <= 0) return;

    const userPowerups = match.powerups?.[userId] || [];
    const updatedPowerups = [...userPowerups, rolledPowerUp];

    const nickname = match.players[userId]?.nickname || 'Spieler';
    
    const powerupNames: Record<string, string> = {
        two_rolls_only: '💥 2von3',
        no_yahtzee: '🚫 JetztNicht',
        blind_sheet: '🌫️ Nebel',
        no_hold: '🪓 Schwere Last',
        points_spender: '💸 Punkte-Spender',
        reroll: '🔄 Reroll',
        immune: '🛡️ Stabiler Stand',
        score_booster: '🚀 Punkte-Booster'
    };
    
    const powerupName = powerupNames[rolledPowerUp] || rolledPowerUp;

    let currentLog = match.activityLog || [];
    currentLog = [...currentLog, `🎰 ${nickname} nutzt Bonus-Wurf und erhält: ${powerupName}!`];
    if (currentLog.length > 15) {
        currentLog = currentLog.slice(currentLog.length - 15);
    }

    const newState: MatchState = {
        ...match,
        bonusRollsAvailable: {
            ...match.bonusRollsAvailable,
            [userId]: currentSpins - 1
        },
        powerups: {
            ...match.powerups,
            [userId]: updatedPowerups
        },
        activityLog: currentLog
    };

    socket.emit('updateMatch', matchId, newState);
}

export async function useOnlinePowerUp(
    matchId: string,
    userId: string,
    match: MatchState,
    powerupType: string,
    targetUserId?: string
) {
    if (!match.isKhaosMode) return;
    
    // Reroll darf nur genutzt werden, wenn keine regulären Würfe mehr übrig sind (rollsLeft === 0)
    if (powerupType === 'reroll' && match.rollsLeft > 0) {
        return;
    }
    
    const userPowerups = match.powerups?.[userId] || [];
    const pIdx = userPowerups.indexOf(powerupType);
    if (pIdx === -1) return; // Not in inventory

    const updatedPowerups = [...userPowerups];
    updatedPowerups.splice(pIdx, 1);

    const nickname = match.players[userId]?.nickname || 'Spieler';
    const targetNickname = targetUserId ? (match.players[targetUserId]?.nickname || 'Gegner') : '';
    
    const powerupNames: Record<string, string> = {
        two_rolls_only: '💥 2von3',
        no_yahtzee: '🚫 JetztNicht',
        blind_sheet: '🌫️ Nebel',
        no_hold: '🪓 Schwere Last',
        points_spender: '💸 Punkte-Spender',
        reroll: '🔄 Reroll',
        immune: '🛡️ Stabiler Stand',
        score_booster: '🚀 Punkte-Booster'
    };
    const powerupName = powerupNames[powerupType] || powerupType;

    let currentLog = match.activityLog || [];
    const updatedEffects = { ...match.activeEffects };
    const updatedScores = { ...match.scores };
    const updatedBonusPoints = { ...match.bonusPoints };
    const updatedLastScoredInfo = { ...match.lastScoredInfo };
    let updatedRollsLeft = match.rollsLeft;

    const isOffensive = ['two_rolls_only', 'no_yahtzee', 'blind_sheet', 'no_hold', 'points_spender'].includes(powerupType);
    const isTargetImmune = targetUserId ? (match.activeEffects?.[targetUserId]?.some(eff => eff.type === 'immune')) : false;

    if (isOffensive && isTargetImmune && targetUserId) {
        currentLog = [...currentLog, `🛡️ ${nickname} wirft ${powerupName} auf ${targetNickname}, aber der Angriff prallt ab (Immunität)!`];
    } else {
        if (powerupType === 'reroll') {
            updatedRollsLeft = match.rollsLeft + 1;
            currentLog = [...currentLog, `🔄 ${nickname} nutzt Reroll und erhält einen 4. Wurf!`];
        } else if (powerupType === 'points_spender') {
            if (targetUserId) {
                const targetLastScore = match.lastScoredInfo?.[targetUserId];
                if (targetLastScore && targetLastScore.score > 0) {
                    const stolenPoints = targetLastScore.score;
                    const catKey = targetLastScore.categoryKey;
                    const colIdx = targetLastScore.columnIndex;

                    const targetScores = { ...match.scores[targetUserId] };
                    targetScores[catKey] = targetScores[catKey].map((s, idx) => idx === colIdx ? 0 : s);
                    updatedScores[targetUserId] = targetScores;

                    const myBonus = match.bonusPoints?.[userId] || 0;
                    updatedBonusPoints[userId] = myBonus + stolenPoints;

                    delete updatedLastScoredInfo[targetUserId];

                    currentLog = [...currentLog, `💸 Diebstahl! ${nickname} stiehlt ${stolenPoints} Punkte (${catKey}) von ${targetNickname}!`];
                } else {
                    currentLog = [...currentLog, `💸 ${nickname} zündet Punkte-Spender auf ${targetNickname}, aber es gibt nichts zu holen!`];
                }
            }
        } else if (powerupType === 'immune') {
            const myEffects = match.activeEffects?.[userId] || [];
            updatedEffects[userId] = [...myEffects, { type: 'immune', roundsLeft: 3, casterId: userId }];
            currentLog = [...currentLog, `🛡️ ${nickname} aktiviert Stabiler Stand (Immunität für 3 Runden)!`];
        } else if (powerupType === 'score_booster') {
            const myEffects = match.activeEffects?.[userId] || [];
            updatedEffects[userId] = [...myEffects, { type: 'score_booster', roundsLeft: 1, casterId: userId }];
            currentLog = [...currentLog, `🚀 ${nickname} aktiviert Punkte-Booster (Nächste Eintragung zählt 2x)!`];
        } else if (targetUserId) {
            const targetEffects = match.activeEffects?.[targetUserId] || [];
            let duration = 1;
            let effType: any = powerupType;

            if (powerupType === 'no_yahtzee') {
                duration = 5;
            }

            updatedEffects[targetUserId] = [...targetEffects, { type: effType, roundsLeft: duration, casterId: userId }];
            currentLog = [...currentLog, `🔮 ${nickname} belegt ${targetNickname} mit ${powerupName}!`];
        }
    }

    if (currentLog.length > 15) {
        currentLog = currentLog.slice(currentLog.length - 15);
    }

    const newState: MatchState = {
        ...match,
        powerups: {
            ...match.powerups,
            [userId]: updatedPowerups
        },
        activeEffects: updatedEffects,
        scores: updatedScores,
        bonusPoints: updatedBonusPoints,
        lastScoredInfo: updatedLastScoredInfo,
        rollsLeft: updatedRollsLeft,
        activityLog: currentLog
    };

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
