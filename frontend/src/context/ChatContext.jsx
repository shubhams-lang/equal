import { createContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import CryptoJS from "crypto-js";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

// 🔥 Ensure this matches your backend deployment URL
const SOCKET_URL = "https://equal.onrender.com/";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true
});

export const ChatProvider = ({ children }) => {
  // --- IDENTITY & ROOM STATE ---
  const [username, setUsername] = useState(""); 
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]); // Maps to online-users from server
  const [roomKey, setRoomKey] = useState("init-key-123");

  // --- GAME STATE ---
  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({});

  /* ===========================
      🔐 ENCRYPTION LOGIC
  =========================== */
  
  // Generates a deterministic key so all users in the same room share the same encryption
  const generateKeyFromRoom = (id) => {
    return CryptoJS.SHA256(id + "salt-secret-99").toString();
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
      return decoded || "--- Decryption Failed ---";
    } catch (e) {
      return "--- Encrypted Message ---";
    }
  };

  /* ===========================
      🚪 ROOM ACTIONS
  =========================== */

  const joinRoom = (targetRoomId, chosenIdentity) => {
    if (!targetRoomId || !chosenIdentity) return;

    setRoomId(targetRoomId);
    setUsername(chosenIdentity);
    setMessages([]);

    // Set the encryption key for this specific room
    const key = generateKeyFromRoom(targetRoomId);
    setRoomKey(key);

    // Join via Socket
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

    // Optimistic UI: Add your own message immediately
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
    setActiveGame(gameId); // For the requester, open game immediately
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
      // Don't process messages from other rooms
      if (msg.roomId !== roomId) return;
      
      // Don't add your own message again (already added optimistically)
      if (msg.username === username) return;

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
  }, [roomId, roomKey, username]); // Dependencies ensure listeners stay in sync with identity

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
        // Game Exports
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