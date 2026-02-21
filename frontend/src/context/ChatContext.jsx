import { createContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import CryptoJS from "crypto-js";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

// 🔥 Updated with your specific Render URL
const SOCKET_URL = "https://equal.onrender.com/";

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
  
  // Set a base key so encryption doesn't crash if roomKey is empty
  const [roomKey, setRoomKey] = useState("init-key-123"); 
  const typingTimeout = useRef(null);

  /* ===========================
      🔐 ENCRYPTION
  =========================== */

  // Generates a key based on the Room ID so all users in the same room use the same key
  const generateKeyFromRoom = (roomId) => {
    return CryptoJS.SHA256(roomId + "salt-secret").toString();
  };

  const encrypt = (msg) =>
    CryptoJS.AES.encrypt(msg, roomKey).toString();

  const decrypt = (cipher) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, roomKey);
      const decoded = bytes.toString(CryptoJS.enc.Utf8);
      return decoded || "--- Decryption Failed ---";
    } catch (e) {
      return "--- Encrypted Message ---";
    }
  };

  /* ===========================
      🚪 ROOM LOGIC
  =========================== */

  // 1. New function to explicitly CREATE a unique room
  const createRoom = () => {
    const newRoomId = uuidv4();
    joinRoom(newRoomId);
    return newRoomId; 
  };

  // 2. Modified join function
  const joinRoom = (roomId) => {
    if (!roomId) return;

    if (!rooms.includes(roomId)) {
      setRooms(prev => [...prev, roomId]);
    }

    setActiveRoom(roomId);
    setMessages([]);

    // We set the encryption key BASED on the roomId so everyone in the room 
    // can decrypt each other's messages automatically.
    const key = generateKeyFromRoom(roomId);
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
      ✍️ TYPING & REACTIONS (Kept same)
  =========================== */

  const handleTyping = () => {
    socket.emit("typing", { roomId: activeRoom, username });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stop-typing", { roomId: activeRoom, username });
    }, 1000);
  };

  const addReaction = (messageId, emoji) => {
    socket.emit("add-reaction", {
      roomId: activeRoom,
      messageId,
      emoji,
      username
    });
  };

  /* ===========================
      📡 SOCKET LISTENERS
  =========================== */

  useEffect(() => {
    socket.on("receive-message", (msg) => {
      // Logic to only show messages meant for this room
      if (msg.roomId !== activeRoom) return;

      const decrypted = decrypt(msg.message);
      setMessages(prev => [
        ...prev,
        { ...msg, message: decrypted, status: "delivered" }
      ]);
    });

    socket.on("user-typing", (user) => {
      setTypingUsers(prev => (prev.includes(user) ? prev : [...prev, user]));
    });

    socket.on("user-stop-typing", (user) => {
      setTypingUsers(prev => prev.filter(u => u !== user));
    });

    socket.on("online-users", (users) => {
      setOnlineUsers(users);
    });

    // Cleanup listeners on unmount or when roomKey changes
    return () => {
      socket.off("receive-message");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("online-users");
    };
  }, [roomKey, activeRoom]); 

  return (
    <ChatContext.Provider value={{
      username,
      rooms,
      activeRoom,
      messages,
      typingUsers,
      onlineUsers,
      joinRoom,
      createRoom, // Added to exports
      sendMessage,
      handleTyping,
      addReaction,
      socket
    }}>
      {children}
    </ChatContext.Provider>
  );
};