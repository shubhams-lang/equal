const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios"); // Ensure you run: npm install axios

const app = express();

// --- 1. DYNAMIC CORS CONFIGURATION ---
// "origin: true" reflects the request origin, which is necessary for 
// Vercel's hashed deployment URLs.
app.use(cors({
  origin: true, 
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// --- 2. PREFLIGHT & SECURITY MIDDLEWARE ---
// This handles the "OPTIONS" preflight request immediately to prevent 
// the red "CORS Preflight" errors in DevTools.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const server = http.createServer(app);

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

// --- ROUTES ---

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

// --- 4. KEEP-ALIVE PING (RENDER FIX) ---
// Pings this server every 14 minutes to prevent the Render Free Tier 
// from sleeping, avoiding the "Immediate Error" delay.
setInterval(() => {
  axios.get("https://equal.onrender.com/room/HEALTH")
    .then(() => console.log("Self-ping successful: Server is awake"))
    .catch((err) => console.log("Self-ping: Awake (Received expected status)"));
}, 840000); 

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});