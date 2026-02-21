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
    origin: "https://anonymous-chat-kohl-iota.vercel.app/", // In production, replace with your frontend URL
    methods: ["GET", "POST"]
  }
});

/* ===========================
    PUSH NOTIFICATION CONFIG
   =========================== */
// Note: Replace these with real keys using 'npx web-push generate-vapid-keys'
const VAPID_PUBLIC = "BNGqMc62YgNxy25W7KLmZQPK_A_ndW6QtDR7r6doeEFkk9ss92krAh5323o-WA2lW-JMQESTAd4V8_-bgAzASns";
const VAPID_PRIVATE = "ApRaRKde2rLN-Jpss916F2lg7R3nZz4nOkKSq2KR404";

webpush.setVapidDetails(
  "mailto:shubham.s@semonks.com",
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

let subscriptions = [];

/* ===========================
    STATE MANAGEMENT
   =========================== */
const onlineUsers = {}; // { roomId: [usernames] }
const activeRooms = new Set(); // Track created rooms

/* ===========================
    HTTP REST API
   =========================== */

// 1. Create Room Route (Called by your "Create Room" button)
app.post("/create-room", (req, res) => {
  const roomId = uuidv4().substring(0, 8); // Generate 8-char unique ID
  activeRooms.add(roomId);
  console.log(`Room Created: ${roomId}`);
  res.json({ roomId });
});

// 2. Room Verification (Checks if a room exists before joining)
app.get("/room/:id", (req, res) => {
  const { id } = req.params;
  const exists = activeRooms.has(id) || (onlineUsers[id] && onlineUsers[id].length > 0);
  res.json({ exists });
});

// 3. Push Notification Subscription
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
    // Leave previous rooms to prevent message bleeding
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;

    if (!onlineUsers[roomId]) {
      onlineUsers[roomId] = [];
    }

    // Add user if not already in the list
    if (!onlineUsers[roomId].includes(username)) {
      onlineUsers[roomId].push(username);
    }

    // Notify the room
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

    io.to(data.roomId).emit("receive-message", messagePayload);

    // Optional: Send push notification to all subscribers
    subscriptions.forEach(sub => {
      webpush.sendNotification(
        sub,
        JSON.stringify({
          title: `New message from ${data.username}`,
          body: data.message
        })
      ).catch(err => console.error("Push Error:", err));
    });
  });

  // --- TYPING & ACTIONS ---
  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-typing", username);
  });

  socket.on("stop-typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-stop-typing", username);
  });

  socket.on("message-seen", ({ messageId, roomId }) => {
    socket.to(roomId).emit("update-seen", { messageId });
  });

  socket.on("add-reaction", ({ roomId, messageId, emoji, username }) => {
    socket.to(roomId).emit("update-reaction", { messageId, emoji, username });
  });

  // --- VOICE/RTC SIGNALING ---
  socket.on("voice-offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("voice-offer", offer);
  });

  socket.on("voice-answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("voice-answer", answer);
  });

  socket.on("voice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("voice-candidate", candidate);
  });

  // --- DISCONNECT ---
  socket.on("disconnect", () => {
    const { roomId, username } = socket;

    if (roomId && onlineUsers[roomId]) {
      // Remove user from the list
      onlineUsers[roomId] = onlineUsers[roomId].filter((u) => u !== username);

      // Update remaining users
      io.to(roomId).emit("online-users", onlineUsers[roomId]);
      socket.to(roomId).emit("user-offline", username);

      // Cleanup: remove room from memory if empty
      if (onlineUsers[roomId].length === 0) {
        // We keep activeRooms to allow people to rejoin via links
        delete onlineUsers[roomId];
      }
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