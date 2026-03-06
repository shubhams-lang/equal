const generateInvite = require("../utils/generateInvite");
const generateUsername = require("../utils/generateUsername");
const roomStore = require("../rooms/roomStore");

module.exports = (io) => {
  io.on("connection", (socket) => {
    
    // --- 1. ROOM CREATION ---
    socket.on("create-room", async ({ roomName }) => {
      const inviteCode = generateInvite();
      await roomStore.createRoom(inviteCode, roomName);
      socket.emit("room-created", inviteCode);
    });

    // --- 2. JOINING ---
    socket.on("join-room", async ({ roomId, username }) => {
      const room = await roomStore.getRoom(roomId);
      if (!room) return;

      socket.join(roomId);
      socket.username = username || generateUsername();
      socket.roomId = roomId;

      await roomStore.addMember(roomId, socket.username);

      const messages = await roomStore.getMessages(roomId);
      const members = await roomStore.getMembers(roomId);

      // Send historical data to the joining user
      socket.emit("room-data", { messages, members });
      // Notify everyone of the new user list
      io.to(roomId).emit("online-users", members);
    });

    // --- 3. MESSAGING ---
    socket.on("send-message", async (msgData) => {
      if (!socket.roomId) return;
      
      // Store the full message object (including reactions array)
      await roomStore.addMessage(socket.roomId, msgData);
      
      // Broadcast to everyone else in the room
      socket.to(socket.roomId).emit("receive-message", msgData);
    });

    // --- 4. REACTIONS ---
    socket.on("message-reaction", async ({ roomId, msgId, emoji, username }) => {
      // 1. Get current messages from store
      const messages = await roomStore.getMessages(roomId);
      const msg = messages.find(m => m.id === msgId);

      if (msg) {
        if (!msg.reactions) msg.reactions = [];
        
        const existing = msg.reactions.find(r => r.emoji === emoji);
        if (existing) {
          const userIndex = existing.users.indexOf(username);
          if (userIndex > -1) {
            existing.users.splice(userIndex, 1);
            existing.count--;
          } else {
            existing.users.push(username);
            existing.count++;
          }
        } else {
          msg.reactions.push({ emoji, count: 1, users: [username] });
        }

        // Clean up empty reactions
        msg.reactions = msg.reactions.filter(r => r.count > 0);

        // 2. Save updated message back to store
        await roomStore.updateMessage(roomId, msgId, { reactions: msg.reactions });

        // 3. Broadcast update
        io.to(roomId).emit("update-reactions", { msgId, reactions: msg.reactions });
      }
    });

    // --- 5. GAME FLOW ---
    socket.on("request-game", ({ roomId, gameId, sender }) => {
      // Send the proposal to the opponent only
      socket.to(roomId).emit("game-requested", { gameId, sender });
    });

    socket.on("start-game", ({ roomId, gameId }) => {
      // When accepted, trigger the game for everyone
      io.to(roomId).emit("game-started", gameId);
    });

    // --- 6. TYPING ---
    socket.on("typing", () => {
      if (!socket.roomId) return;
      socket.to(socket.roomId).emit("user-typing", { username: socket.username });
    });

    socket.on("stop-typing", () => {
      if (!socket.roomId) return;
      socket.to(socket.roomId).emit("user-stop-typing");
    });

    // --- 7. DISCONNECT ---
    socket.on("disconnect", async () => {
      if (!socket.roomId) return;

      await roomStore.removeMember(socket.roomId, socket.username);
      const members = await roomStore.getMembers(socket.roomId);
      
      io.to(socket.roomId).emit("online-users", members);
    });

  });
};