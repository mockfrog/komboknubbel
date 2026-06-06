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

  socket.on('joinMatch', (data) => {
    let inviteCode: string;
    let userId: string | undefined;

    if (typeof data === 'object' && data !== null) {
      inviteCode = data.inviteCode;
      userId = data.userId;
    } else {
      inviteCode = data;
    }

    socket.join(inviteCode);
    socket.data.inviteCode = inviteCode;
    if (userId) {
      socket.data.userId = userId;
    }
    if (!socket.data.mediaState) {
      socket.data.mediaState = { isMuted: false, isVideoOff: false };
    }

    console.log(`User ${socket.id} (userId: ${userId || 'unknown'}) joined match ${inviteCode}`);

    // Tell others in the room that a new peer joined
    socket.to(inviteCode).emit('peer-joined', { 
      socketId: socket.id, 
      userId,
      mediaState: socket.data.mediaState
    });

    // Gather current peers in the room to send to the newly joined peer
    const clientsInRoom = io.sockets.adapter.rooms.get(inviteCode);
    const peers = [];
    if (clientsInRoom) {
      for (const clientId of clientsInRoom) {
        if (clientId !== socket.id) {
          const clientSocket = io.sockets.sockets.get(clientId);
          if (clientSocket) {
            peers.push({
              socketId: clientId,
              userId: clientSocket.data.userId,
              mediaState: clientSocket.data.mediaState || { isMuted: false, isVideoOff: false }
            });
          }
        }
      }
    }
    socket.emit('current-peers', peers);
  });

  socket.on('updateMatch', (inviteCode, newState) => {
    db.prepare('UPDATE matches SET state = ?, updatedAt = CURRENT_TIMESTAMP WHERE inviteCode = ?')
      .run(JSON.stringify(newState), inviteCode);
    io.to(inviteCode).emit('matchUpdated', newState);
  });

  // WebRTC signaling
  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  // Media toggles
  socket.on('toggle-media', (state) => {
    socket.data.mediaState = state;
    if (socket.data.inviteCode) {
      socket.to(socket.data.inviteCode).emit('peer-media-toggled', {
        socketId: socket.id,
        userId: socket.data.userId,
        ...state
      });
    }
  });

  // Explicit leave
  socket.on('leaveMatch', (inviteCode) => {
    socket.leave(inviteCode);
    socket.to(inviteCode).emit('peer-left', { socketId: socket.id, userId: socket.data.userId });
    console.log(`User ${socket.id} explicitly left match ${inviteCode}`);
  });

  // Handle disconnecting to broadcast leave event
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('peer-left', { socketId: socket.id, userId: socket.data.userId });
      }
    }
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
