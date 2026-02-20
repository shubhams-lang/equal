const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const app = express();
const server = http.createServer(app);

// --- 1. PROPER CORS CONFIGURATION ---
// "origin: true" allows any Vercel deployment URL to connect
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// --- 2. PREFLIGHT MIDDLEWARE ---
// Manually handles "OPTIONS" requests to prevent "Immediate" CORS errors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// --- 3. SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

let rooms = {};

// --- 4. API ROUTES ---

// Create a new room
app.post("/create-room", (req, res) => {
  try {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    rooms[roomId] = { messages: [], users: [] };
    console.log(`Room Created: ${roomId}`);
    res.json({ roomId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create room" });
  }
});

// Check if room exists
app.get("/room/:roomId", (req, res) => {
  const { roomId } = req.params;
  res.json({ exists: !!rooms[roomId] });
});

// Health check for self-pings
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// --- 5. SOCKET LOGIC (The Hub) ---

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
    
    // Broadcast user list to the room
    io.to(roomId).emit("room-update", { 
      messages: rooms[roomId].messages, 
      users: rooms[roomId].users 
    });
  });

  // GAME SYNC: This sends score/movement updates to everyone in the room
  socket.on("game-state-sync", ({ roomId, payload }) => {
    // .to(roomId) sends to everyone EXCEPT the sender
    socket.to(roomId).emit("game-state-update", payload);
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

  socket.on("disconnect", () => {
    if (socket.roomId && rooms[socket.roomId]) {
      rooms[socket.roomId].users = rooms[socket.roomId].users.filter(u => u !== socket.username);
      io.to(socket.roomId).emit("room-update", { users: rooms[socket.roomId].users });
    }
    console.log("User disconnected:", socket.id);
  });
});

// --- 6. RENDER KEEP-ALIVE PING ---
// Pings itself every 14 minutes to prevent the free tier from sleeping.
setInterval(() => {
  // Use your actual Render URL here
  axios.get("https://equal.onrender.com/health")
    .then(() => console.log("Self-ping successful: Server stays awake"))
    .catch((err) => console.log("Self-ping: Server is awake (received heartbeat)"));
}, 840000); 

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});