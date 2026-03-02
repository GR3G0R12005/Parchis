import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Game State Management
  const rooms = new Map();

  const EXIT_POSITIONS: Record<string, number> = {
    red: 5,
    blue: 22,
    yellow: 39,
    green: 56
  };

  const SAFE_SQUARES = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68];

  const createInitialState = (players: any[]) => ({
    players: players.map((p, idx) => ({
      id: p.id,
      color: p.color,
      tokens: [
        { id: `${p.color}-1`, color: p.color, position: -1, isSafe: true },
        { id: `${p.color}-2`, color: p.color, position: -1, isSafe: true },
        { id: `${p.color}-3`, color: p.color, position: -1, isSafe: true },
        { id: `${p.color}-4`, color: p.color, position: -1, isSafe: true },
      ],
      isTurn: idx === 0,
      score: 0,
    })),
    currentTurn: players[0]?.color || 'red',
    lastDiceRoll: null,
    status: 'playing',
    bonusSteps: 0,
    extraTurns: 0,
    consecutiveSixes: 0,
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          players: [],
          gameState: null,
          status: "waiting"
        });
      }
      const room = rooms.get(roomId);

      if (room.players.length < 4 && room.status === "waiting") {
        const colors = ["red", "blue", "yellow", "green"];
        const assignedColor = colors[room.players.length];
        room.players.push({ id: socket.id, color: assignedColor });
        socket.emit("player-assigned", assignedColor);
      }

      if (room.players.length >= 2 && room.status === "waiting") {
        room.status = "playing";
        room.gameState = createInitialState(room.players);
      }

      io.to(roomId).emit("room-update", room.gameState || room);
    });

    socket.on("roll-dice", ({ roomId, values }) => {
      const room = rooms.get(roomId);
      if (!room || !room.gameState) return;
      const state = room.gameState;

      const isSix = values[0] === 6 || values[1] === 6;
      state.consecutiveSixes = isSix ? state.consecutiveSixes + 1 : 0;
      state.extraTurns = isSix ? 1 : 0;

      if (state.consecutiveSixes === 3) {
        state.consecutiveSixes = 0;
        state.extraTurns = 0;
        const colors = state.players.map((p: any) => p.color);
        const nextIndex = (colors.indexOf(state.currentTurn) + 1) % colors.length;
        state.currentTurn = colors[nextIndex];
        state.lastDiceRoll = null;
      } else {
        state.lastDiceRoll = values;
      }

      io.to(roomId).emit("room-update", state);
    });

    socket.on("move-token", ({ roomId, tokenId }) => {
      const room = rooms.get(roomId);
      if (!room || !room.gameState || (!room.gameState.lastDiceRoll && room.gameState.bonusSteps === 0)) return;
      const state = room.gameState;

      const currentPlayer = state.players.find((p: any) => p.color === state.currentTurn);
      if (!currentPlayer || currentPlayer.id !== socket.id) return;

      const token = currentPlayer.tokens.find((t: any) => t.id === tokenId);
      if (!token) return;

      const roll = state.lastDiceRoll;
      const bonus = state.bonusSteps;

      let moveAmount = 0;
      if (bonus > 0) {
        moveAmount = bonus;
        state.bonusSteps = 0;
      } else if (roll) {
        const [d1, d2] = roll;
        // Rule of 5: Mandatory exit
        if (token.position === -1 && (d1 === 5 || d2 === 5 || d1 + d2 === 5)) {
          moveAmount = 0; // Exit case
        } else {
          moveAmount = d1 + d2;
        }
      }

      if (token.position === -1) {
        token.position = EXIT_POSITIONS[token.color];
      } else {
        // Normal move
        const oldPos = token.position;
        let newPos = (token.position + moveAmount) % 68;

        // Check for capture
        const opponentToken = state.players
          .flatMap((p: any) => p.tokens)
          .find((t: any) => t.color !== token.color && t.position === newPos);

        if (opponentToken && !SAFE_SQUARES.includes(newPos)) {
          opponentToken.position = -1;
          state.bonusSteps = 20;
        }

        // Check for goal
        if (newPos === 76) {
          state.bonusSteps = 10;
          currentPlayer.score += 100;
        }

        token.position = newPos;
      }

      // Turn switching
      if (state.bonusSteps === 0 && state.extraTurns === 0) {
        const colors = state.players.map((p: any) => p.color);
        const nextIndex = (colors.indexOf(state.currentTurn) + 1) % colors.length;
        state.currentTurn = colors[nextIndex];
      }

      state.lastDiceRoll = null;
      io.to(roomId).emit("room-update", state);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
