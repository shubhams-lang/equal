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
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* ===========================
   ROOM TRACKING (NEW)
=========================== */
// Track valid created rooms so the frontend /room/:id check works
const activeRooms = new Set();
const onlineUsers = {}; // { roomId: [usernames] }

/* ===========================
   EXPRESS REST API (NEW)
=========================== */

// 1. Generate a valid room ID for the frontend
app.post("/create-room", (req, res) => {
  // Generate a shorter, friendly 8-character ID
  const roomId = uuidv4().substring(0, 8); 
  activeRooms.add(roomId);
  console.log(`New room created via API: ${roomId}`);
  res.json({ roomId });
});

// 2. Check if a room actually exists when a user tries to join
app.get("/room/:id", (req, res) => {
  const { id } = req.params;
  // For flexibility, you can allow joining any room, 
  // but this checks if it was created or is currently active
  const exists = activeRooms.has(id) || !!onlineUsers[id];
  res.json({ exists });
});

/* ===========================
   PUSH NOTIFICATION CONFIG
=========================== */

const VAPID_PUBLIC = "YOUR_PUBLIC_VAPID_KEY";
const VAPID_PRIVATE = "YOUR_PRIVATE_VAPID_KEY";

webpush.setVapidDetails(
  "mailto:admin@yourapp.com",
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

let subscriptions = [];

app.post("/subscribe", (req, res) => {
  subscriptions.push(req.body);
  res.status(201).json({ success: true });
});

/* ===========================
   SOCKET.IO
=========================== */

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /* ===========================
     🚪 JOIN ROOM
  =========================== */
  socket.on("join-room", ({ roomId, username }) => {
    // 🔥 CRITICAL FIX: Leave all previous rooms so messages don't bleed over
    socket.rooms.forEach(room => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;

    // Track the room as active
    activeRooms.add(roomId);

    if (!onlineUsers[roomId]) {
      onlineUsers[roomId] = [];
    }

    if (!onlineUsers[roomId].includes(username)) {
      onlineUsers[roomId].push(username);
    }

    io.to(roomId).emit("online-users", onlineUsers[roomId]);
    socket.to(roomId).emit("user-online", username);

    console.log(`${username} successfully joined room: ${roomId}`);
  });

  /* ===========================
     💬 SEND MESSAGE
  =========================== */
  socket.on("send-message", (data) => {
    const messagePayload = {
      ...data,
      status: "delivered"
    };

    // Broadcast only to the specific room
    io.to(data.roomId).emit("receive-message", messagePayload);

    // Push notification (Be careful: this sends to EVERYONE subscribed, not just the room. 
    // You might want to filter subscriptions by roomId in the future)
    subscriptions.forEach(sub => {
      webpush.sendNotification(
        sub,
        JSON.stringify({
          title: "New Message",
          body: "You received a new message"
        })
      ).catch(() => {});
    });
  });

  /* ===========================
     👁️ MESSAGE SEEN
  =========================== */
  socket.on("message-seen", ({ messageId, roomId }) => {
    socket.to(roomId).emit("update-seen", { messageId });
  });

  /* ===========================
     ✍️ TYPING EVENTS
  =========================== */
  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-typing", username);
  });

  socket.on("stop-typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-stop-typing", username);
  });

  /* ===========================
     ❤️ REACTIONS
  =========================== */
  socket.on("add-reaction", ({ roomId, messageId, emoji, username }) => {
    socket.to(roomId).emit("update-reaction", {
      messageId,
      emoji,
      username
    });
  });

  /* ===========================
     🎙️ VOICE SIGNALING
  =========================== */
  socket.on("voice-offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("voice-offer", offer);
  });

  socket.on("voice-answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("voice-answer", answer);
  });

  socket.on("voice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("voice-candidate", candidate);
  });

  /* ===========================
     ❌ DISCONNECT
  =========================== */
  socket.on("disconnect", () => {
    const { roomId, username } = socket;

    if (roomId && onlineUsers[roomId]) {
      onlineUsers[roomId] = onlineUsers[roomId].filter(u => u !== username);

      io.to(roomId).emit("online-users", onlineUsers[roomId]);
      socket.to(roomId).emit("user-offline", username);

      // Optional: Clean up empty rooms to save memory
      if (onlineUsers[roomId].length === 0) {
        delete onlineUsers[roomId];
        // Note: We don't delete from activeRooms so the link still works later
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
  console.log(`Server running on port ${PORT}`);
});