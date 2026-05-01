import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    nickname TEXT NOT NULL,
    score INTEGER NOT NULL,
    gameMode TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    inviteCode TEXT PRIMARY KEY,
    state TEXT NOT NULL, -- JSON string of MatchState
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
