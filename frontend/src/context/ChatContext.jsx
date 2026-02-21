import { createContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import CryptoJS from "crypto-js";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

// 🔥 Ensure this matches your backend deployment URL
const SOCKET_URL = "https://equal.onrender.com/";

// Vite environment variable for the Public VAPID key
// Make sure to add VITE_PUBLIC_VAPID_KEY to your .env and Vercel settings
const PUBLIC_VAPID_KEY = import.meta.env.VITE_PUBLIC_VAPID_KEY;

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true
});

export const ChatProvider = ({ children }) => {
  // --- IDENTITY & ROOM STATE ---
  const [username, setUsername] = useState(""); 
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]); 
  const [roomKey, setRoomKey] = useState("init-key-123");

  // --- GAME STATE ---
  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({});

  /* ===========================
      🔐 ENCRYPTION LOGIC
  =========================== */
  
  // SHA256 ensures the key is consistent for everyone in the same room
  const generateKeyFromRoom = (id) => {
    return CryptoJS.SHA256(id).toString();
  };

  const encrypt = (msg) => {
    try {
      return CryptoJS.AES.encrypt(msg, roomKey).toString();
    } catch (e) {
      return msg;
    }
  };

  const decrypt = (cipher) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, roomKey);
      const decoded = bytes.toString(CryptoJS.enc.Utf8);
      // If decryption fails (wrong key), show the specific error message
      return decoded || "--- Decryption Failed ---";
    } catch (e) {
      return "--- Decryption Failed ---";
    }
  };

  /* ===========================
      🚪 ROOM ACTIONS
  =========================== */

  const joinRoom = (targetRoomId, chosenIdentity) => {
    if (!targetRoomId || !chosenIdentity) return;

    // 1. Set the encryption key immediately
    const key = generateKeyFromRoom(targetRoomId);
    setRoomKey(key);

    // 2. Update local state
    setRoomId(targetRoomId);
    setUsername(chosenIdentity);
    setMessages([]);

    // 3. Emit to socket server
    socket.emit("join-room", { roomId: targetRoomId, username: chosenIdentity });
  };

  /* ===========================
      💬 MESSAGING
  =========================== */

  const sendMessage = (text) => {
    if (!text || !roomId) return;

    const encrypted = encrypt(text);

    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      message: encrypted,
    };

    socket.emit("send-message", messageData);

    // Add your own message locally (decrypted) for instant UI feedback
    setMessages((prev) => [
      ...prev,
      { ...messageData, message: text }
    ]);
  };

  /* ===========================
      🎮 GAME LOGIC
  =========================== */

  const sendGameRequest = (gameId) => {
    socket.emit("send-game-request", { roomId, gameId, username });
    setActiveGame(gameId); 
  };

  const updateScore = (newScore) => {
    setScores((prev) => ({ ...prev, [username]: newScore }));
    socket.emit("update-score", { roomId, username, score: newScore });
  };

  const closeGame = () => {
    setActiveGame(null);
    socket.emit("leave-game", { roomId, username });
  };

  /* ===========================
      📡 SOCKET LISTENERS
  =========================== */

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      if (msg.roomId !== roomId) return;
      if (msg.username === username) return; // Ignore your own broadcast

      const decrypted = decrypt(msg.message);
      setMessages((prev) => [
        ...prev,
        { ...msg, message: decrypted }
      ]);
    };

    const handleOnlineUsers = (userList) => {
      setUsers(userList);
    };

    const handleGameStart = (gameId) => {
      setActiveGame(gameId);
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("online-users", handleOnlineUsers);
    socket.on("start-game", handleGameStart);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("online-users", handleOnlineUsers);
      socket.off("start-game", handleGameStart);
    };
  }, [roomId, roomKey, username]); 

  return (
    <ChatContext.Provider
      value={{
        username,
        roomId,
        setRoomId,
        messages,
        users,
        joinRoom,
        sendMessage,
        socket,
        activeGame,
        scores,
        updateScore,
        sendGameRequest,
        closeGame,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};