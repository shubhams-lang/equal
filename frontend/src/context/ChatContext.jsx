import { createContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import CryptoJS from "crypto-js";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

// 🔥 IMPORTANT: Replace with your Render backend URL
const SOCKET_URL = "https://your-backend-name.onrender.com";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true
});

export const ChatProvider = ({ children }) => {

  const [username] = useState(
    "User" + Math.floor(Math.random() * 1000)
  );

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [roomKey, setRoomKey] = useState("");
  const typingTimeout = useRef(null);

  /* ===========================
     🔐 ENCRYPTION
  =========================== */

  const generateKey = () =>
    CryptoJS.lib.WordArray.random(32).toString();

  const encrypt = (msg) =>
    CryptoJS.AES.encrypt(msg, roomKey).toString();

  const decrypt = (cipher) => {
    const bytes = CryptoJS.AES.decrypt(cipher, roomKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  /* ===========================
     🚪 JOIN ROOM
  =========================== */

  const joinRoom = (roomId) => {

    if (!rooms.includes(roomId)) {
      setRooms(prev => [...prev, roomId]);
    }

    setActiveRoom(roomId);
    setMessages([]);

    const key = generateKey();
    setRoomKey(key);

    socket.emit("join-room", { roomId, username });
  };

  /* ===========================
     💬 SEND MESSAGE
  =========================== */

  const sendMessage = (text) => {

    if (!text || !activeRoom) return;

    const encrypted = encrypt(text);

    const messageData = {
      id: uuidv4(),
      roomId: activeRoom,
      username,
      message: encrypted,
      status: "sent",
      reactions: {}
    };

    socket.emit("send-message", messageData);

    setMessages(prev => [
      ...prev,
      { ...messageData, message: text }
    ]);
  };

  /* ===========================
     ✍️ TYPING
  =========================== */

  const handleTyping = () => {

    socket.emit("typing", {
      roomId: activeRoom,
      username
    });

    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      socket.emit("stop-typing", {
        roomId: activeRoom,
        username
      });
    }, 1000);
  };

  /* ===========================
     ❤️ REACTION
  =========================== */

  const addReaction = (messageId, emoji) => {
    socket.emit("add-reaction", {
      roomId: activeRoom,
      messageId,
      emoji,
      username
    });
  };

  /* ===========================
     🔔 PUSH NOTIFICATIONS
  =========================== */

  useEffect(() => {

    const subscribeUser = async () => {
      if ("serviceWorker" in navigator) {

        const registration =
          await navigator.serviceWorker.register("/sw.js");

        const subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              "YOUR_PUBLIC_VAPID_KEY"
          });

        await fetch(`${SOCKET_URL}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription)
        });
      }
    };

    subscribeUser();

  }, []);

  /* ===========================
     📡 SOCKET LISTENERS
  =========================== */

  useEffect(() => {

    socket.on("receive-message", (msg) => {

      const decrypted = decrypt(msg.message);

      setMessages(prev => [
        ...prev,
        {
          ...msg,
          message: decrypted,
          status: "delivered"
        }
      ]);
    });

    socket.on("update-seen", ({ messageId }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, status: "seen" }
            : msg
        )
      );
    });

    socket.on("user-typing", (user) => {
      setTypingUsers(prev =>
        prev.includes(user) ? prev : [...prev, user]
      );
    });

    socket.on("user-stop-typing", (user) => {
      setTypingUsers(prev =>
        prev.filter(u => u !== user)
      );
    });

    socket.on("online-users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("update-reaction", (data) => {

      setMessages(prev =>
        prev.map(msg => {

          if (msg.id === data.messageId) {

            const updated = { ...msg };
            updated.reactions = updated.reactions || {};

            updated.reactions[data.emoji] = [
              ...(updated.reactions[data.emoji] || []),
              data.username
            ];

            return updated;
          }

          return msg;
        })
      );
    });

    return () => {
      socket.off();
    };

  }, [roomKey]);

  /* ===========================
     📦 CONTEXT VALUE
  =========================== */

  return (
    <ChatContext.Provider value={{
      username,
      rooms,
      activeRoom,
      messages,
      typingUsers,
      onlineUsers,
      joinRoom,
      sendMessage,
      handleTyping,
      addReaction,
      socket
    }}>
      {children}
    </ChatContext.Provider>
  );
};