import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // In production, replace with your specific frontend URL
    methods: ["GET", "POST"]
  }
});

/* ===========================
    STATE MANAGEMENT
   =========================== */
const onlineUsers = {};     // { roomId: [usernames] }
const socketToUser = new Map(); // socket.id -> { roomId, username }
const roomScores = {};      // { roomId: { username: score } } - Round Level (Race to 10)
const roomLeaderboard = {};  // { roomId: { username: matchWins } } - Set Level (🏆)
const roomStreaks = {};     // { roomId: { lastWinner, count } } - Consecutive Sets (🔥)
const roomSettings = {};    // { roomId: { winTarget: 10 } } - Game Configuration

/* ===========================
    HTTP ROUTES
   =========================== */
app.post("/create-room", (req, res) => {
  const roomId = uuidv4().substring(0, 8);
  res.json({ roomId });
});

/* ===========================
    SOCKET.IO LOGIC
   =========================== */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // --- JOIN ROOM ---
  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    socketToUser.set(socket.id, { roomId, username });

    // Initialize Global State for Room
    if (!onlineUsers[roomId]) onlineUsers[roomId] = [];
    if (!roomScores[roomId]) roomScores[roomId] = {};
    if (!roomLeaderboard[roomId]) roomLeaderboard[roomId] = {};
    if (!roomStreaks[roomId]) roomStreaks[roomId] = { lastWinner: null, count: 0 };
    if (!roomSettings[roomId]) roomSettings[roomId] = { winTarget: 10 };

    if (!onlineUsers[roomId].includes(username)) {
      onlineUsers[roomId].push(username);
    }
    
    // Ensure user exists in score maps
    if (roomScores[roomId][username] === undefined) roomScores[roomId][username] = 0;
    if (roomLeaderboard[roomId][username] === undefined) roomLeaderboard[roomId][username] = 0;

    // Sync current room state to the user who just joined
    io.to(roomId).emit("online-users", onlineUsers[roomId]);
    io.to(roomId).emit("score-updated", roomScores[roomId]);
    io.to(roomId).emit("settings-updated", roomSettings[roomId]);
    io.to(roomId).emit("leaderboard-updated", {
      leaderboard: roomLeaderboard[roomId],
      streak: roomStreaks[roomId]
    });

    socket.to(roomId).emit("receive-message", {
      username: "System",
      message: `${username} joined the chat`,
      type: "system"
    });
  });

  // --- MESSAGING ---
  socket.on("send-message", (data) => {
    socket.to(data.roomId).emit("receive-message", data);
  });

  /* ===========================
      🎮 GAME LOGIC & SYNC
     =========================== */

  // Relay for Game Starts
  socket.on("start-game", ({ roomId, gameId }) => {
    io.to(roomId).emit("game-started", gameId);
  });

  // Generic Game Data Relay (Moves, Scrambled words, etc.)
  socket.on("game-data", (data) => {
    socket.to(data.roomId).emit("game-data", data);
  });

  // 1. Update Round Score (The 1, 2, 3... count)
  socket.on("update-score", ({ roomId, username }) => {
    if (roomScores[roomId]) {
      roomScores[roomId][username] = (roomScores[roomId][username] || 0) + 1;
      io.to(roomId).emit("score-updated", roomScores[roomId]);
    }
  });

  // 2. Reset Scores (For "Play Again" / Rematch)
  socket.on("reset-scores", ({ roomId }) => {
    if (roomScores[roomId]) {
      Object.keys(roomScores[roomId]).forEach(u => roomScores[roomId][u] = 0);
      io.to(roomId).emit("scores-reset-confirmed", roomScores[roomId]);
    }
  });

  // 3. Match Victory (The Big Win 🏆 & Streak 🔥)
  socket.on("match-victory", ({ roomId, username }) => {
    // Increment Trophy Count
    roomLeaderboard[roomId][username] = (roomLeaderboard[roomId][username] || 0) + 1;

    // Calculate Streak
    const streakData = roomStreaks[roomId];
    if (streakData.lastWinner === username) {
      streakData.count += 1;
    } else {
      streakData.lastWinner = username;
      streakData.count = 1;
    }

    // Broadcast updated standings
    io.to(roomId).emit("leaderboard-updated", {
      leaderboard: roomLeaderboard[roomId],
      streak: roomStreaks[roomId]
    });

    // Chat Announcement for streaks
    if (streakData.count >= 3) {
      io.to(roomId).emit("receive-message", {
        username: "System",
        message: `🔥 STREAK ALERT: ${username} has won ${streakData.count} matches in a row!`,
        type: "system"
      });
    }
  });

  // 4. Update Game Settings (Win Target)
  socket.on("update-settings", ({ roomId, settings }) => {
    roomSettings[roomId] = { ...roomSettings[roomId], ...settings };
    io.to(roomId).emit("settings-updated", roomSettings[roomId]);
  });

  socket.on("leave-game", ({ roomId }) => {
    io.to(roomId).emit("game-closed");
  });

  /* ===========================
      🚪 DISCONNECT LOGIC
     =========================== */
  socket.on("disconnect", () => {
    const userData = socketToUser.get(socket.id);
    if (userData) {
      const { roomId, username } = userData;
      if (onlineUsers[roomId]) {
        onlineUsers[roomId] = onlineUsers[roomId].filter((u) => u !== username);
        io.to(roomId).emit("online-users", onlineUsers[roomId]);
      }
      socketToUser.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});