import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import webpush from "web-push";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://anonymous-chat-kohl-iota.vercel.app", 
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
const socketToUser = new Map(); // Maps socket.id -> { roomId, username }

/* ===========================
    HTTP REST API
   =========================== */

app.post("/create-room", (req, res) => {
  const roomId = uuidv4().substring(0, 8);
  activeRooms.add(roomId);
  res.json({ roomId });
});

app.get("/room/:id", (req, res) => {
  const { id } = req.params;
  const exists = activeRooms.has(id) || (onlineUsers[id] && onlineUsers[id].length > 0);
  res.json({ exists });
});

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
    socket.join(roomId);
    
    // Store user data for disconnect cleanup
    socketToUser.set(socket.id, { roomId, username });

    if (!onlineUsers[roomId]) onlineUsers[roomId] = [];
    if (!onlineUsers[roomId].includes(username)) {
      onlineUsers[roomId].push(username);
    }

    // 1. Send updated list to everyone
    io.to(roomId).emit("online-users", onlineUsers[roomId]);
    
    // 2. Trigger "System Message" for others
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
    // Tells everyone in the room EXCEPT the sender that 'username' is typing
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

      // 1. Update online users list
      if (onlineUsers[roomId]) {
        onlineUsers[roomId] = onlineUsers[roomId].filter((u) => u !== username);
        
        // 2. Notify room: Update user list and send "Offline" system trigger
        io.to(roomId).emit("online-users", onlineUsers[roomId]);
        socket.to(roomId).emit("user-offline", username);

        // Cleanup empty rooms
        if (onlineUsers[roomId].length === 0) delete onlineUsers[roomId];
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