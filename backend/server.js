import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
// Increased limit to handle Base64 images/videos/voice messages
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  // Max buffer size for media transfers
  maxHttpBufferSize: 1e8 
});

/* ===========================
    STATE MANAGEMENT
   =========================== */
const onlineUsers = {};     // { roomId: [usernames] }
const socketToUser = new Map(); 
const roomScores = {};      // Round Level (0-10)
const roomLeaderboard = {};  // Set Level (🏆)
const roomStreaks = {};     // Consecutive Sets (🔥)
const roomSettings = {};    // { roomId: { winTarget: 10 } }

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

    if (!onlineUsers[roomId]) onlineUsers[roomId] = [];
    if (!roomScores[roomId]) roomScores[roomId] = {};
    if (!roomLeaderboard[roomId]) roomLeaderboard[roomId] = {};
    if (!roomStreaks[roomId]) roomStreaks[roomId] = { lastWinner: null, count: 0 };
    if (!roomSettings[roomId]) roomSettings[roomId] = { winTarget: 10 };

    if (!onlineUsers[roomId].includes(username)) {
      onlineUsers[roomId].push(username);
    }
    
    if (roomScores[roomId][username] === undefined) roomScores[roomId][username] = 0;
    if (roomLeaderboard[roomId][username] === undefined) roomLeaderboard[roomId][username] = 0;

    // Sync state
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
      type: "system",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // --- MESSAGING (Text, Media, Voice, Stickers) ---
  socket.on("send-message", (data) => {
    // data: { roomId, username, content, type, timestamp, metadata }
    socket.to(data.roomId).emit("receive-message", data);
  });

  // --- TYPING ---
  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-typing", { username });
  });

  socket.on("stop-typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-stop-typing", { username });
  });

  /* ===========================
      🎮 GAME LOGIC
     =========================== */

  socket.on("start-game", ({ roomId, gameId }) => {
    io.to(roomId).emit("game-started", gameId);
  });

  socket.on("game-data", (data) => {
    socket.to(data.roomId).emit("game-data", data);
  });

  socket.on("update-score", ({ roomId, username }) => {
    if (roomScores[roomId]) {
      roomScores[roomId][username] = (roomScores[roomId][username] || 0) + 1;
      io.to(roomId).emit("score-updated", roomScores[roomId]);
    }
  });

  socket.on("reset-scores", ({ roomId }) => {
    if (roomScores[roomId]) {
      Object.keys(roomScores[roomId]).forEach(u => roomScores[roomId][u] = 0);
      io.to(roomId).emit("scores-reset-confirmed", roomScores[roomId]);
    }
  });

  socket.on("match-victory", ({ roomId, username }) => {
    roomLeaderboard[roomId][username] = (roomLeaderboard[roomId][username] || 0) + 1;

    const streakData = roomStreaks[roomId];
    if (streakData.lastWinner === username) {
      streakData.count += 1;
    } else {
      streakData.lastWinner = username;
      streakData.count = 1;
    }

    io.to(roomId).emit("leaderboard-updated", {
      leaderboard: roomLeaderboard[roomId],
      streak: roomStreaks[roomId]
    });

    if (streakData.count >= 3) {
      io.to(roomId).emit("receive-message", {
        username: "System",
        message: `🔥 STREAK: ${username} has won ${streakData.count} matches!`,
        type: "system",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  socket.on("update-settings", ({ roomId, settings }) => {
    roomSettings[roomId] = { ...roomSettings[roomId], ...settings };
    io.to(roomId).emit("settings-updated", roomSettings[roomId]);
  });

  socket.on("leave-game", ({ roomId }) => {
    io.to(roomId).emit("game-closed");
  });

  /* ===========================
      🚪 DISCONNECT
     =========================== */
  socket.on("disconnect", () => {
    const userData = socketToUser.get(socket.id);
    if (userData) {
      const { roomId, username } = userData;
      if (onlineUsers[roomId]) {
        onlineUsers[roomId] = onlineUsers[roomId].filter((u) => u !== username);
        io.to(roomId).emit("online-users", onlineUsers[roomId]);
        
        socket.to(roomId).emit("receive-message", {
          username: "System",
          message: `${username} left the chat`,
          type: "system",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
      socketToUser.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});