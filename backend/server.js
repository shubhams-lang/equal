import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import webpush from "web-push";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: ["https://anonymous-chat-kohl-iota.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

/* ===========================
    PUSH NOTIFICATION CONFIG
   =========================== */
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    "mailto:shubham.s@semonks.com",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

let subscriptions = [];

/* ===========================
    STATE MANAGEMENT
   =========================== */
const onlineUsers = {}; // { roomId: [usernames] }
const activeRooms = new Set(); 
const socketToUser = new Map(); // Track socket.id -> { roomId, username }

/* ===========================
    HTTP REST API
   =========================== */

// 1. Create Room
app.post("/create-room", (req, res) => {
  const roomId = uuidv4().substring(0, 8);
  activeRooms.add(roomId);
  console.log(`Room Created: ${roomId}`);
  res.json({ roomId });
});

// 2. Room Verification
app.get("/room/:id", (req, res) => {
  const { id } = req.params;
  const exists = activeRooms.has(id) || (onlineUsers[id] && onlineUsers[id].length > 0);
  res.json({ exists });
});

// 3. Push Subscription
app.post("/subscribe", (req, res) => {
  subscriptions.push(req.body);
  res.status(201).json({ success: true });
});

/* ===========================
    SOCKET.IO LOGIC
   =========================== */



io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // --- JOIN ROOM ---
  socket.on("join-room", ({ roomId, username }) => {
    // Leave other rooms first
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(roomId);
    
    // Store metadata on socket and in our map
    socket.username = username;
    socket.roomId = roomId;
    socketToUser.set(socket.id, { roomId, username });

    if (!onlineUsers[roomId]) onlineUsers[roomId] = [];
    if (!onlineUsers[roomId].includes(username)) {
      onlineUsers[roomId].push(username);
    }

    // Notify others and update list
    io.to(roomId).emit("online-users", onlineUsers[roomId]);
    socket.to(roomId).emit("user-online", username);
    
    console.log(`${username} joined room ${roomId}`);
  });

  // --- MESSAGING ---
  socket.on("send-message", (data) => {
    const messagePayload = {
      ...data,
      status: "delivered",
      timestamp: new Date().toISOString()
    };

    // Broadcast to everyone else in the room
    socket.to(data.roomId).emit("receive-message", messagePayload);

    // Push Notifications
    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, JSON.stringify({
        title: `New message from ${data.username}`,
        body: data.message
      })).catch(err => console.error("Push Error:", err));
    });
  });

  // --- TYPING INDICATORS ---
  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-typing", { username });
  });

  socket.on("stop-typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-stop-typing", { username });
  });

  // --- DISCONNECT ---
  socket.on("disconnect", () => {
    const userData = socketToUser.get(socket.id);

    if (userData) {
      const { roomId, username } = userData;

      if (onlineUsers[roomId]) {
        onlineUsers[roomId] = onlineUsers[roomId].filter((u) => u !== username);
        
        // Update room list and trigger "offline" system notification
        io.to(roomId).emit("online-users", onlineUsers[roomId]);
        socket.to(roomId).emit("user-offline", username);

        if (onlineUsers[roomId].length === 0) {
          delete onlineUsers[roomId];
        }
      }
      socketToUser.delete(socket.id);
    }
    console.log("User disconnected:", socket.id);
  });
});

/* ===========================
    START SERVER
   =========================== */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});