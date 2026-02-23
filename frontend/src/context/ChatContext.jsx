import { createContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

// Ensure this matches your backend deployment URL
const SOCKET_URL = "https://equal.onrender.com";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export const ChatProvider = ({ children }) => {
  // --- AUTH & ROOM STATE ---
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [opponent, setOpponent] = useState(null);

  // --- MESSAGING STATE ---
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  // --- GAME STATE ---
  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({});

  /* ===========================
      🚪 ROOM & IDENTITY
     =========================== */

  const joinRoom = (id, name) => {
    if (!id || !name) return;
    setRoomId(id);
    setUsername(name);
    setMessages([]); // Reset chat history for the new session
    socket.emit("join-room", { roomId: id, username: name });
  };

  // Logic to determine who you are playing against
  useEffect(() => {
    if (users.length > 0 && username) {
      // Find the first user in the list that isn't you
      const foundOpponent = users.find((u) => u !== username);
      setOpponent(foundOpponent || null);
    }
  }, [users, username]);

  /* ===========================
      💬 MESSAGING LOGIC
     =========================== */

  const sendMessage = (text) => {
    if (!text.trim() || !roomId) return;

    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      message: text,
      timestamp: new Date().toISOString(),
      type: "user",
    };

    // Optimistic Update: Add to local state immediately
    setMessages((prev) => [...prev, messageData]);
    socket.emit("send-message", messageData);
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
      🎮 GAME SYNCHRONIZATION
     =========================== */

  // Request to start a new game
  const sendGameRequest = (gameId) => {
    if (!roomId) return;
    socket.emit("start-game", { roomId, gameId });
  };

  // Logic for the GameOverOverlay rematch button
  const sendRematchRequest = () => {
    if (!roomId || !activeGame) return;
    socket.emit("start-game", { roomId, gameId: activeGame });
  };

  const closeGame = () => {
    if (!roomId) return;
    socket.emit("leave-game", { roomId });
    setActiveGame(null);
  };

  const updateScore = (winnerName) => {
    setScores((prev) => ({
      ...prev,
      [winnerName]: (prev[winnerName] || 0) + 1,
    }));
    socket.emit("update-score", { roomId, username: winnerName });
  };

  /* ===========================
      📡 GLOBAL SOCKET LISTENERS
     =========================== */

  useEffect(() => {
    // Chat & Users
    socket.on("receive-message", (msg) => {
      if (msg.username !== username) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("online-users", (userList) => setUsers(userList));

    socket.on("user-typing", ({ username: typingName }) => {
      if (typingName !== username) setTypingUser(typingName);
    });

    socket.on("user-stop-typing", () => setTypingUser(null));

    // Game Events
    socket.on("game-started", (gameId) => {
      setActiveGame(gameId);
    });

    socket.on("game-closed", () => {
      setActiveGame(null);
    });

    socket.on("score-updated", (data) => {
      // Data expected: { username: score }
      setScores((prev) => ({ ...prev, ...data }));
    });

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

  return (
    <ChatContext.Provider
      value={{
        username,
        roomId,
        setRoomId,
        messages,
        users,
        opponent, // CRITICAL for Pong paddle sync
        typingUser,
        activeGame,
        scores,
        joinRoom,
        sendMessage,
        handleTyping,
        sendGameRequest,
        sendRematchRequest,
        closeGame,
        updateScore,
        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};