const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();

// --- 1. FIXED CORS CONFIGURATION ---
// This explicitly allows your Vercel domain and handles "Preflight" requests
// which prevents the "Local Network Access" popup.
app.use(cors({
  origin: "https://anonymous-chat-aqjopwa21-shubhams-3890s-projects.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

const server = http.createServer(app);

// --- 2. FIXED SOCKET.IO CORS ---
const io = new Server(server, {
  cors: { 
    origin: "https://anonymous-chat-aqjopwa21-shubhams-3890s-projects.vercel.app", 
    methods: ["GET", "POST"],
    credentials: true
  },
  // We allow both, but forcing 'websocket' on the frontend is recommended
  transports: ["websocket", "polling"] 
});

let rooms = {}; 

// --- ROUTES ---

app.post("/create-room", (req, res) => {
  const roomId = uuidv4().slice(0, 6).toUpperCase();
  rooms[roomId] = { messages: [], users: [] };
  console.log(`Room Created: ${roomId}`);
  res.json({ roomId });
});

app.get("/room/:roomId", (req, res) => {
  const { roomId } = req.params;
  res.json({ exists: !!rooms[roomId] });
});

// --- SOCKET LOGIC ---

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    if (!rooms[roomId]) return;
    
    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;

    if (!rooms[roomId].users.includes(username)) {
      rooms[roomId].users.push(username);
    }
    
    io.to(roomId).emit("room-update", { 
      messages: rooms[roomId].messages, 
      users: rooms[roomId].users 
    });
  });

  socket.on("send-message", ({ roomId, message, username }) => {
    if (!rooms[roomId]) return;
    const msg = { 
      id: uuidv4(), 
      text: message, 
      username, 
      time: Date.now() 
    };
    rooms[roomId].messages.push(msg);
    io.to(roomId).emit("receive-message", msg);
  });

  // --- 1v1 GAME EVENTS ---
  
  socket.on("send-game-invite", ({ roomId, gameId, targetUser, sender }) => {
    socket.to(roomId).emit("receive-game-invite", { gameId, targetUser, sender });
  });

  socket.on("game-state-sync", ({ roomId, payload }) => {
    socket.to(roomId).emit("game-state-update", payload);
  });

  socket.on("disconnect", () => {
    if (socket.roomId && rooms[socket.roomId]) {
      rooms[socket.roomId].users = rooms[socket.roomId].users.filter(u => u !== socket.username);
      io.to(socket.roomId).emit("room-update", { users: rooms[socket.roomId].users });
    }
    console.log("User disconnected:", socket.id);
  });
});

// Use process.env.PORT for Render compatibility
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));