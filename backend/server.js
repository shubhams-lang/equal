import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";

const app = express();

/* ==========================
   SECURITY + PERFORMANCE
========================== */

app.use(helmet());
app.use(compression());

app.use(cors({
  origin: "*",
  methods: ["GET","POST"]
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200
});

app.use(limiter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const server = http.createServer(app);

/* ==========================
   SOCKET.IO
========================== */

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET","POST"]
  },
  transports: ["websocket"],
  maxHttpBufferSize: 1e8
});

/* ==========================
   STATE STORAGE
========================== */

const rooms = new Map();
/*
rooms = {
 roomId:{
   users:Set(),
   scores:{},
   leaderboard:{},
   streak:{lastWinner,count},
   settings:{winTarget}
 }
}
*/

const socketUser = new Map();

/* ==========================
   UTIL
========================== */

const getRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId,{
      users:new Set(),
      scores:{},
      leaderboard:{},
      streak:{lastWinner:null,count:0},
      settings:{winTarget:10}
    });
  }
  return rooms.get(roomId);
};

const cleanRoomIfEmpty = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.users.size === 0) {
    rooms.delete(roomId);
  }
};

/* ==========================
   HTTP ROUTES
========================== */

app.get("/", (req,res)=>{
  res.send("Anonymous Chat Server Running");
});

app.post("/create-room",(req,res)=>{
  const roomId = uuidv4().slice(0,8);
  res.json({roomId});
});

/* ==========================
   SOCKET LOGIC
========================== */

io.on("connection",(socket)=>{

  console.log("User connected:",socket.id);

  /* ======================
     JOIN ROOM
  ====================== */

  socket.on("join-room",({roomId,username})=>{

    if(!roomId || !username) return;

    const room = getRoom(roomId);

    socket.join(roomId);

    socketUser.set(socket.id,{roomId,username});

    room.users.add(username);

    if(room.scores[username]===undefined)
      room.scores[username]=0;

    if(room.leaderboard[username]===undefined)
      room.leaderboard[username]=0;

    io.to(roomId).emit("online-users",[...room.users]);

    io.to(roomId).emit("score-updated",room.scores);

    io.to(roomId).emit("settings-updated",room.settings);

    io.to(roomId).emit("leaderboard-updated",{
      leaderboard:room.leaderboard,
      streak:room.streak
    });

    socket.to(roomId).emit("receive-message",{
      id:uuidv4(),
      username:"System",
      content:`${username} joined the chat`,
      type:"system",
      timestamp:new Date().toLocaleTimeString([],{
        hour:"2-digit",
        minute:"2-digit"
      })
    });

  });

  /* ======================
     CHAT MESSAGE
  ====================== */

  socket.on("send-message",(data)=>{

    if(!data?.roomId) return;

    socket.to(data.roomId).emit("receive-message",data);

  });

  /* ======================
     TYPING
  ====================== */

  socket.on("typing",({roomId,username})=>{
    socket.to(roomId).emit("user-typing",{username});
  });

  socket.on("stop-typing",({roomId,username})=>{
    socket.to(roomId).emit("user-stop-typing",{username});
  });

  /* ======================
     GAME START
  ====================== */

  socket.on("start-game",({roomId,gameId})=>{
    io.to(roomId).emit("game-started",gameId);
  });

  socket.on("game-data",(data)=>{
    socket.to(data.roomId).emit("game-data",data);
  });

  /* ======================
     SCORE UPDATE
  ====================== */

  socket.on("update-score",({roomId,username})=>{

    const room = rooms.get(roomId);
    if(!room) return;

    room.scores[username]=(room.scores[username]||0)+1;

    io.to(roomId).emit("score-updated",room.scores);

  });

  socket.on("reset-scores",({roomId})=>{

    const room = rooms.get(roomId);
    if(!room) return;

    Object.keys(room.scores).forEach(u=>{
      room.scores[u]=0;
    });

    io.to(roomId).emit("scores-reset-confirmed",room.scores);

  });

  /* ======================
     MATCH WIN
  ====================== */

  socket.on("match-victory",({roomId,username})=>{

    const room = rooms.get(roomId);
    if(!room) return;

    room.leaderboard[username] =
      (room.leaderboard[username] || 0) + 1;

    if(room.streak.lastWinner === username){
      room.streak.count++;
    } else {
      room.streak.lastWinner = username;
      room.streak.count = 1;
    }

    io.to(roomId).emit("leaderboard-updated",{
      leaderboard:room.leaderboard,
      streak:room.streak
    });

    if(room.streak.count >=3){
      io.to(roomId).emit("receive-message",{
        id:uuidv4(),
        username:"System",
        content:`🔥 STREAK: ${username} won ${room.streak.count} matches`,
        type:"system",
        timestamp:new Date().toLocaleTimeString([],{
          hour:"2-digit",
          minute:"2-digit"
        })
      });
    }

  });

  /* ======================
     SETTINGS
  ====================== */

  socket.on("update-settings",({roomId,settings})=>{

    const room = rooms.get(roomId);
    if(!room) return;

    room.settings = {
      ...room.settings,
      ...settings
    };

    io.to(roomId).emit("settings-updated",room.settings);

  });

  socket.on("leave-game",({roomId})=>{
    io.to(roomId).emit("game-closed");
  });

  /* ======================
     DISCONNECT
  ====================== */

  socket.on("disconnect",()=>{

    const user = socketUser.get(socket.id);
    if(!user) return;

    const {roomId,username} = user;

    const room = rooms.get(roomId);
    if(!room) return;

    room.users.delete(username);

    io.to(roomId).emit("online-users",[...room.users]);

    socket.to(roomId).emit("receive-message",{
      id:uuidv4(),
      username:"System",
      content:`${username} left the chat`,
      type:"system",
      timestamp:new Date().toLocaleTimeString([],{
        hour:"2-digit",
        minute:"2-digit"
      })
    });

    socketUser.delete(socket.id);

    cleanRoomIfEmpty(roomId);

  });

});

/* ==========================
   SERVER START
========================== */

const PORT = process.env.PORT || 5000;

server.listen(PORT,()=>{
  console.log(`🚀 Server running on ${PORT}`);
});