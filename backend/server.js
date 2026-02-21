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

// Save browser push subscription
app.post("/subscribe", (req, res) => {
  subscriptions.push(req.body);
  res.status(201).json({ success: true });
});

/* ===========================
   SOCKET.IO
=========================== */

const onlineUsers = {}; // { roomId: [usernames] }

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  /* ===========================
     JOIN ROOM
  =========================== */

  socket.on("join-room", ({ roomId, username }) => {

    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;

    if (!onlineUsers[roomId]) {
      onlineUsers[roomId] = [];
    }

    if (!onlineUsers[roomId].includes(username)) {
      onlineUsers[roomId].push(username);
    }

    io.to(roomId).emit("online-users", onlineUsers[roomId]);
    socket.to(roomId).emit("user-online", username);

    console.log(`${username} joined ${roomId}`);
  });

  /* ===========================
     SEND MESSAGE
  =========================== */

  socket.on("send-message", (data) => {

    const messagePayload = {
      ...data,
      status: "delivered"
    };

    io.to(data.roomId).emit("receive-message", messagePayload);

    // Push notification
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
     MESSAGE SEEN
  =========================== */

  socket.on("message-seen", ({ messageId, roomId }) => {
    socket.to(roomId).emit("update-seen", { messageId });
  });

  /* ===========================
     TYPING EVENTS
  =========================== */

  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-typing", username);
  });

  socket.on("stop-typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-stop-typing", username);
  });

  /* ===========================
     REACTIONS
  =========================== */

  socket.on("add-reaction", ({ roomId, messageId, emoji, username }) => {
    socket.to(roomId).emit("update-reaction", {
      messageId,
      emoji,
      username
    });
  });

  /* ===========================
     VOICE SIGNALING
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
     DISCONNECT
  =========================== */

  socket.on("disconnect", () => {

    const { roomId, username } = socket;

    if (roomId && onlineUsers[roomId]) {
      onlineUsers[roomId] =
        onlineUsers[roomId].filter(u => u !== username);

      io.to(roomId).emit("online-users", onlineUsers[roomId]);
      socket.to(roomId).emit("user-offline", username);
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