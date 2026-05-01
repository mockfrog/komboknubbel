import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from the frontend build
const frontendPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendPath));

// Leaderboard API
app.get('/api/leaderboard', (req, res) => {
  const { gameMode, limit = 10 } = req.query;
  const stmt = db.prepare('SELECT * FROM leaderboard WHERE gameMode = ? ORDER BY score DESC LIMIT ?');
  const rows = stmt.all(gameMode, limit);
  res.json(rows);
});

app.post('/api/leaderboard', (req, res) => {
  const { userId, nickname, score, gameMode } = req.body;
  
  const sanitizedNickname = nickname.trim().replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
  const docId = `best_${gameMode}_${sanitizedNickname}`;
  
  const existing = db.prepare('SELECT * FROM leaderboard WHERE id = ?').get(docId) as any;
  
  if (existing) {
    if (score > existing.score) {
      db.prepare('UPDATE leaderboard SET score = ?, nickname = ?, userId = ?, createdAt = CURRENT_TIMESTAMP WHERE id = ?')
        .run(score, nickname, userId, docId);
      return res.json({ isNewRecord: true });
    }
    return res.json({ isNewRecord: false });
  } else {
    db.prepare('INSERT INTO leaderboard (id, userId, nickname, score, gameMode) VALUES (?, ?, ?, ?, ?)')
      .run(docId, userId, nickname, score, gameMode);
    return res.json({ isNewRecord: true });
  }
});

// Socket.io for Multiplayer
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinMatch', (inviteCode) => {
    socket.join(inviteCode);
    console.log(`User ${socket.id} joined match ${inviteCode}`);
  });

  socket.on('updateMatch', (inviteCode, newState) => {
    db.prepare('UPDATE matches SET state = ?, updatedAt = CURRENT_TIMESTAMP WHERE inviteCode = ?')
      .run(JSON.stringify(newState), inviteCode);
    io.to(inviteCode).emit('matchUpdated', newState);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Match API
app.post('/api/matches', (req, res) => {
  const { hostId, nickname, gameMode, initialState } = req.body;
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  db.prepare('INSERT INTO matches (inviteCode, state) VALUES (?, ?)')
    .run(inviteCode, JSON.stringify({ ...initialState, inviteCode }));
    
  res.json({ inviteCode });
});

app.get('/api/matches/:code', (req, res) => {
  const { code } = req.params;
  const match = db.prepare('SELECT * FROM matches WHERE inviteCode = ?').get(code) as any;
  if (match) {
    res.json(JSON.parse(match.state));
  } else {
    res.status(404).json({ error: 'Match not found' });
  }
});

// Catch-all to serve index.html for client-side routing
app.get('*any', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
