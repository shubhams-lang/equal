const generateInvite = require("../utils/generateInvite");
const generateUsername = require("../utils/generateUsername");
const roomStore = require("../rooms/roomStore");


module.exports = (io) => {
  io.on("connection", (socket) => {

    socket.on("createRoom", async ({ roomName }) => {
      const inviteCode = generateInvite();
      await roomStore.createRoom(inviteCode, roomName);
      socket.emit("roomCreated", inviteCode);
    });

    socket.on("joinRoom", async ({ inviteCode, username }) => {
      const room = await roomStore.getRoom(inviteCode);
      if (!room.name) return;

      socket.join(inviteCode);

      socket.username = username || generateUsername();
      socket.inviteCode = inviteCode;

      await roomStore.addMember(inviteCode, socket.username);

      const messages = await roomStore.getMessages(inviteCode);
      const members = await roomStore.getMembers(inviteCode);

      socket.emit("roomData", { messages, members });
      io.to(inviteCode).emit("membersUpdate", members);
    });

    socket.on("sendMessage", async ({ message }) => {
      if (!socket.inviteCode) return;

      const msg = {
        id: Date.now(),
        username: socket.username,
        text: message,
        time: new Date(),
        reactions: {}
      };

      await roomStore.addMessage(socket.inviteCode, msg);
      io.to(socket.inviteCode).emit("newMessage", msg);
    });

    socket.on("typing", () => {
      socket.to(socket.inviteCode)
        .emit("userTyping", socket.username);
    });

    socket.on("disconnect", async () => {
      if (!socket.inviteCode) return;

      await roomStore.removeMember(
        socket.inviteCode,
        socket.username
      );

      const members = await roomStore.getMembers(socket.inviteCode);
      io.to(socket.inviteCode).emit("membersUpdate", members);
    });

  });
};
