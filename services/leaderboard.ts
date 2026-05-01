import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    getDocs, 
    serverTimestamp, 
    where,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GameMode } from '../types';

export interface LeaderboardEntry {
    id?: string;
    userId: string;
    nickname: string;
    score: number;
    gameMode: GameMode;
    createdAt?: any;
}

export async function submitScore(userId: string, nickname: string, score: number, gameMode: GameMode): Promise<{ isNewRecord: boolean }> {
    // Sanitize nickname to be a safe document ID
    const sanitizedNickname = nickname.trim().replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    // Use a deterministic ID based on nickname and gameMode
    const docId = `best_${gameMode}_${sanitizedNickname}`;
    const docRef = doc(db, 'leaderboard', docId);
    
    try {
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            // Update only if the new score is higher
            if (score > existingData.score) {
                await updateDoc(docRef, {
                    score,
                    nickname, // Preserve the case-sensitive nickname in the data
                    userId,   // Update to current userId if it changed
                    createdAt: serverTimestamp()
                });
                return { isNewRecord: true };
            }
            return { isNewRecord: false };
        } else {
            // New entry for this name
            await setDoc(docRef, {
                userId,
                nickname,
                score,
                gameMode,
                createdAt: serverTimestamp()
            });
            return { isNewRecord: true };
        }
    } catch (error) {
        console.error("Error updating leaderboard:", error);
        throw error;
    }
}

export async function getTopScores(gameMode: GameMode, limitCount: number = 10): Promise<LeaderboardEntry[]> {
    const q = query(
        collection(db, 'leaderboard'),
        where('gameMode', '==', gameMode),
        orderBy('score', 'desc'),
        limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaderboardEntry));
}
