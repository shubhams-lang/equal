import { createContext, useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

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
  const [myStickers, setMyStickers] = useState([]); 
  const typingTimeoutRef = useRef(null);

  // --- GAME & STATS STATE ---
  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [streak, setStreak] = useState({ lastWinner: null, count: 0 });
  const [settings, setSettings] = useState({ winTarget: 10 });

  /* ===========================
      🚪 ROOM & IDENTITY
     =========================== */

  const joinRoom = (id, name) => {
    if (!id || !name) return;
    setRoomId(id);
    setUsername(name);
    setMessages([]);
    socket.emit("join-room", { roomId: id, username: name });
  };

  useEffect(() => {
    if (users.length > 0 && username) {
      const foundOpponent = users.find((u) => u !== username);
      setOpponent(foundOpponent || null);
    }
  }, [users, username]);

  /* ===========================
      💬 MESSAGING LOGIC (FIXED)
     =========================== */

  /**
   * FIXED: Uses destructuring to match MessageInput calls
   * @param {Object} params - { content, type, metadata }
   */
  const sendMessage = ({ content, type = "text", metadata = {} }) => {
    // Prevent crash if data is missing or room isn't set
    if (!content || !roomId) {
      console.warn("Cannot send message: Missing content or Room ID");
      return;
    }

    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      content, 
      type,
      metadata,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Optimistic UI update: Show our own message immediately
    setMessages((prev) => [...prev, messageData]);
    
    // Emit to server
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

  const sendGameRequest = (gameId) => {
    if (!roomId) return;
    socket.emit("start-game", { roomId, gameId });
  };

  const resetScores = useCallback(() => {
    if (!roomId) return;
    socket.emit("reset-scores", { roomId });
  }, [roomId]);

  const sendRematchRequest = () => {
    if (!roomId || !activeGame) return;
    resetScores();
    socket.emit("game-data", { roomId, type: "GAME_RESTART_SIGNAL" });
    socket.emit("start-game", { roomId, gameId: activeGame });
  };

  const updateScore = (winnerName) => {
    if (!roomId) return;
    socket.emit("update-score", { roomId, username: winnerName });
  };

  const closeGame = () => {
    if (!roomId) return;
    socket.emit("leave-game", { roomId });
    setActiveGame(null);
  };

  /* ===========================
      📡 GLOBAL SOCKET LISTENERS
     =========================== */

  useEffect(() => {
    // Listen for messages from others
    socket.on("receive-message", (msg) => {
      if (msg && msg.username !== username) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("online-users", (userList) => setUsers(userList));
    
    socket.on("user-typing", ({ username: tName }) => { 
      if (tName !== username) setTypingUser(tName); 
    });

    socket.on("user-stop-typing", () => setTypingUser(null));
    socket.on("game-started", (gameId) => setActiveGame(gameId));
    
    socket.on("game-closed", () => {
      setActiveGame(null);
      setScores({});
    });

    socket.on("score-updated", (data) => setScores(data));
    socket.on("scores-reset-confirmed", (data) => setScores(data));
    socket.on("settings-updated", (data) => setSettings(data));
    
    socket.on("leaderboard-updated", (data) => {
      setLeaderboard(data.leaderboard);
      setStreak(data.streak);
    });

    return () => {
      socket.off("receive-message");
      socket.off("online-users");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("game-started");
      socket.off("game-closed");
      socket.off("score-updated");
      socket.off("scores-reset-confirmed");
      socket.off("settings-updated");
      socket.off("leaderboard-updated");
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
        opponent,
        typingUser,
        activeGame,
        scores,
        leaderboard,
        streak,
        settings,
        myStickers,
        socket,
        joinRoom,
        sendMessage, // Now safe to use
        handleTyping,
        sendGameRequest,
        sendRematchRequest,
        closeGame,
        updateScore,
        resetScores
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};