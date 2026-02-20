const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let rooms = {}; 

app.post("/create-room", (req, res) => {
  const roomId = uuidv4().slice(0, 6).toUpperCase();
  rooms[roomId] = { messages: [], users: [] };
  res.json({ roomId });
});

app.get("/room/:roomId", (req, res) => {
  const { roomId } = req.params;
  res.json({ exists: !!rooms[roomId] });
});

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
    const msg = { id: uuidv4(), text: message, username, time: Date.now() };
    rooms[roomId].messages.push(msg);
    io.to(roomId).emit("receive-message", msg);
  });

  // --- NEW 1v1 GAME EVENTS ---
  
  // Sends an invite to a specific user in the room
  socket.on("send-game-invite", ({ roomId, gameId, targetUser, sender }) => {
    socket.to(roomId).emit("receive-game-invite", { gameId, targetUser, sender });
  });

  // Relays real-time data (paddles, moves, etc.) to others in the room
  socket.on("game-state-sync", ({ roomId, payload }) => {
    socket.to(roomId).emit("game-state-update", payload);
  });

  socket.on("disconnect", () => {
    if (socket.roomId && rooms[socket.roomId]) {
      rooms[socket.roomId].users = rooms[socket.roomId].users.filter(u => u !== socket.username);
      io.to(socket.roomId).emit("room-update", { users: rooms[socket.roomId].users });
    }
  });
});

server.listen(5000, () => console.log("Backend running on port 5000"));