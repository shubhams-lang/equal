import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Configure Socket.io with CORS for your frontend
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your specific Vercel/Frontend URL in production
    methods: ["GET", "POST"]
  }
});

/* ===========================
    STATE MANAGEMENT
   =========================== */
const onlineUsers = {}; // { roomId: [usernames] }
const socketToUser = new Map(); // Track socket.id -> { roomId, username }

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
    if (!onlineUsers[roomId].includes(username)) {
      onlineUsers[roomId].push(username);
    }

    // Sync user list to everyone in room
    io.to(roomId).emit("online-users", onlineUsers[roomId]);
    
    // Notify others a user joined
    socket.to(roomId).emit("receive-message", {
      username: "System",
      message: `${username} joined the chat`,
      type: "system"
    });
  });

  // --- MESSAGING ---
  socket.on("send-message", (data) => {
    // Broadcast to everyone else in the room
    socket.to(data.roomId).emit("receive-message", data);
  });

  // --- TYPING INDICATORS ---
  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-typing", { username });
  });

  socket.on("stop-typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-stop-typing", { username });
  });

  /* ===========================
      🎮 GAME LOGIC (The Relay)
     =========================== */

  // Starts the game overlay for EVERYONE in the room
  socket.on("start-game", ({ roomId, gameId }) => {
    console.log(`Starting ${gameId} in room ${roomId}`);
    io.to(roomId).emit("game-started", gameId);
  });

  // High-speed relay for coordinate data (Pong paddles, ball sync, etc.)
  socket.on("game-data", (data) => {
    // Use socket.to so the sender doesn't receive their own data back
    // This prevents "jitter" and infinite loops
    socket.to(data.roomId).emit("game-data", data);
  });

  socket.on("update-score", ({ roomId, username }) => {
    // In a real app, you'd increment a DB here. For now, we broadcast the win.
    io.to(roomId).emit("score-updated", { [username]: "win" });
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
        
        socket.to(roomId).emit("receive-message", {
          username: "System",
          message: `${username} left the chat`,
          type: "system"
        });
      }
      socketToUser.delete(socket.id);
    }
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});