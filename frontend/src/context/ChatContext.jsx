import { createContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

// Replace with your actual Render URL
const SOCKET_URL = "https://equal.onrender.com";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export const ChatProvider = ({ children }) => {
  // --- USER & ROOM STATE ---
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  
  // --- MESSAGING STATE ---
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  // --- GAME STATE ---
  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({});

  /* ===========================
      🚪 ROOM ACTIONS
     =========================== */

  const joinRoom = (id, name) => {
    if (!id || !name) return;
    setRoomId(id);
    setUsername(name);
    setMessages([]); // Clear chat history for new room
    socket.emit("join-room", { roomId: id, username: name });
  };

  /* ===========================
      💬 MESSAGE ACTIONS
     =========================== */

  const sendMessage = (text) => {
    if (!text.trim() || !roomId) return;

    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      message: text,
      timestamp: new Date().toISOString(),
      type: "user"
    };

    // 1. Add to local state immediately so sender sees it
    setMessages((prev) => [...prev, messageData]);

    // 2. Emit to others
    socket.emit("send-message", messageData);
    
    // 3. Stop typing status
    socket.emit("stop-typing", { roomId, username });
  };

  const handleTyping = () => {
    if (!roomId) return;
    socket.emit("typing", { roomId, username });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", { roomId, username });
    }, 2000);
  };

  /* ===========================
      🎮 GAME ACTIONS
     =========================== */

  const sendGameRequest = (gameId) => {
    if (!roomId) return;
    console.log(`🎮 Requesting Game: ${gameId} for Room: ${roomId}`);
    // We emit to the server, which will broadcast "game-started" to everyone
    socket.emit("start-game", { roomId, gameId });
  };

  const closeGame = () => {
    if (!roomId) return;
    socket.emit("leave-game", { roomId });
    setActiveGame(null);
  };

  const updateScore = (newScore) => {
    socket.emit("update-score", { roomId, username, score: newScore });
  };

  /* ===========================
      📡 SOCKET LISTENERS
     =========================== */

  useEffect(() => {
    // Message Listener
    socket.on("receive-message", (msg) => {
      // Only add if it's from someone else (to prevent duplicates)
      if (msg.username !== username) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Room Presence Listeners
    socket.on("online-users", (userList) => {
      setUsers(userList);
    });

    // Typing Listeners
    socket.on("user-typing", ({ username: typingName }) => {
      if (typingName !== username) {
        setTypingUser(typingName);
      }
    });

    socket.on("user-stop-typing", () => {
      setTypingUser(null);
    });

    // Game Sync Listeners
    socket.on("game-started", (gameId) => {
      console.log("🚀 Game Signal Received from Server:", gameId);
      setActiveGame(gameId);
    });

    socket.on("game-closed", () => {
      setActiveGame(null);
    });

    socket.on("score-updated", (data) => {
      setScores((prev) => ({ ...prev, ...data }));
    });

    // Cleanup on unmount
    return () => {
      socket.off("receive-message");
      socket.off("online-users");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("game-started");
      socket.off("game-closed");
      socket.off("score-updated");
    };
  }, [username, roomId]);

  /* ===========================
      📦 EXPORT PROVIDER
     =========================== */

  return (
    <ChatContext.Provider
      value={{
        username,
        roomId,
        setRoomId,
        messages,
        users,
        typingUser,
        activeGame,
        scores,
        joinRoom,
        sendMessage,
        handleTyping,
        sendGameRequest,
        closeGame,
        updateScore,
        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};