import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import { dbService } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
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

  const PORT = 3000;

  // --- REST API for AUTH & SOCIAL ---

  app.post("/api/auth/register", (req, res) => {
    const { username, email, avatar } = req.body;
    try {
      if (dbService.getUserByEmail(email)) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const user = dbService.createUser(username, email, avatar);
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    const user = dbService.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/auth/update-avatar", (req, res) => {
    const { uid, avatar } = req.body;
    try {
      dbService.updateUserAvatar(uid, avatar);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to update avatar" });
    }
  });

  app.get("/api/social/search", (req, res) => {
    const { q, exclude } = req.query;
    if (!q) return res.json([]);
    const users = dbService.searchUsers(q as string, exclude as string);
    res.json(users);
  });

  app.get("/api/social/friends/:uid", (req, res) => {
    const friends = dbService.getFriends(req.params.uid);
    res.json(friends);
  });

  app.get("/api/social/requests/:uid", (req, res) => {
    const requests = dbService.getFriendRequests(req.params.uid);
    res.json(requests);
  });

  app.post("/api/social/request", (req, res) => {
    const { senderUid, receiverUid } = req.body;
    dbService.sendFriendRequest(senderUid, receiverUid);
    res.json({ success: true });
  });

  app.post("/api/social/accept", (req, res) => {
    const { receiverUid, senderUid } = req.body;
    dbService.acceptFriendRequest(receiverUid, senderUid);
    res.json({ success: true });
  });

  // --- GAME LOGIC (EXISTING) ---
  const rooms = new Map();

  const EXIT_POSITIONS: Record<string, number> = {
    red: 5, blue: 22, yellow: 39, green: 56
  };
  const SAFE_SQUARES = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68];

  const createInitialState = (room: any) => {
    const players = room.players.map((p: any, idx: number) => {
      const user = dbService.getUserByUid(p.uid);
      console.log(`Creating state for player ${p.uid}: Found user:`, user?.username);
      return {
        id: p.uid,
        username: user?.username || 'Guest',
        avatar: user?.avatar || `https://picsum.photos/seed/${p.uid}/100/100`,
        color: p.color,
        tokens: [
          { id: `${p.color}-1`, color: p.color, position: -1, isSafe: true },
          { id: `${p.color}-2`, color: p.color, position: -1, isSafe: true },
          { id: `${p.color}-3`, color: p.color, position: -1, isSafe: true },
          { id: `${p.color}-4`, color: p.color, position: -1, isSafe: true },
        ],
        isTurn: idx === 0,
        score: 0,
      };
    });

    return {
      players,
      currentTurn: room.players[0]?.color || 'red',
      lastDiceRoll: null,
      status: room.status,
      bonusSteps: 0,
      extraTurns: 0,
      consecutiveSixes: 0,
      roomId: room.id
    };
  };

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, uid }) => {
      console.log(`Join Room Request: room=${roomId}, uid=${uid}`);
      socket.join(roomId);
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { id: roomId, players: [], gameState: null, status: "waiting", creatorId: uid });
      }
      const room = rooms.get(roomId);

      // Add player if not already in room
      if (!room.players.find((p: any) => p.uid === uid) && room.players.length < 4 && room.status === "waiting") {
        const colors = ["red", "blue", "yellow", "green"];
        const assignedColor = colors[room.players.length];
        room.players.push({ uid, color: assignedColor, socketId: socket.id });
        socket.emit("player-assigned", assignedColor);
        console.log(`Player ${uid} added to room ${roomId} as ${assignedColor}`);
      }

      // Update state for everyone
      const currentState = createInitialState(room);
      io.to(roomId).emit("room-update", currentState);
    });

    socket.on("leave-room", ({ roomId, uid }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      socket.leave(roomId);
      room.players = room.players.filter((p: any) => p.uid !== uid);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        const currentState = createInitialState(room);
        io.to(roomId).emit("room-update", currentState);
      }
    });

    socket.on("start-match", (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.players.length >= 2 && room.status === "waiting") {
        room.status = "playing";
        room.gameState = createInitialState(room);
        io.to(roomId).emit("room-update", room.gameState);
      }
    });

    socket.on("roll-dice", ({ roomId, values }) => {
      const room = rooms.get(roomId);
      if (!room || !room.gameState) return;
      const state = room.gameState;
      state.lastDiceRoll = values;
      io.to(roomId).emit("room-update", state);
    });

    socket.on("move-token", ({ roomId, tokenId }) => {
      const room = rooms.get(roomId);
      if (!room || !room.gameState) return;
      const state = room.gameState;
      // ... (Rest of existing logic for move-token)
      io.to(roomId).emit("room-update", state);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Clean up: remove player from any room they were in
      for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex((p: any) => p.socketId === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            const currentState = createInitialState(room);
            io.to(roomId).emit("room-update", currentState);
          }
        }
      }
    });
  });

  // Serve Frontend in Production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(process.cwd(), "../frontend/dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "../frontend/dist/index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
