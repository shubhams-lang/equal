import { createContext, useState, useEffect, useRef, useCallback } from "react";
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

  // --- GAME & STATS STATE ---
  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({}); // Round points (0-10)
  const [leaderboard, setLeaderboard] = useState({}); // Total Match Wins
  const [streak, setStreak] = useState({ lastWinner: null, count: 0 }); // Fire Streak 🔥
  const [settings, setSettings] = useState({ winTarget: 10 }); // Game Config

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

  // Request a specific game (from Lobby)
  const sendGameRequest = (gameId) => {
    if (!roomId) return;
    resetScores(); // Always start a fresh game at 0-0
    socket.emit("start-game", { roomId, gameId });
  };

  // Reset round points back to zero
  const resetScores = useCallback(() => {
    if (!roomId) return;
    socket.emit("reset-scores", { roomId });
  }, [roomId]);

  // Handle the "Play Again" button (Rematch)
  const sendRematchRequest = () => {
    if (!roomId || !activeGame) return;
    resetScores();
    // Signal both clients to clear internal board states
    socket.emit("game-data", { roomId, type: "GAME_RESTART_SIGNAL" });
    // Force the game overlay to re-initialize
    socket.emit("start-game", { roomId, gameId: activeGame });
  };

  // Update round score (Race to 10)
  const updateScore = (winnerName) => {
    if (!roomId) return;
    socket.emit("update-score", { roomId, username: winnerName });
  };

  // Update total match victories (Trophies 🏆)
  const recordMatchWin = (winnerName) => {
    if (!roomId) return;
    socket.emit("match-victory", { roomId, username: winnerName });
  };

  // Update win target settings (Host only)
  const updateWinTarget = (newTarget) => {
    if (!roomId) return;
    socket.emit("update-settings", { roomId, settings: { winTarget: newTarget } });
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
    // 💬 Chat Listeners
    socket.on("receive-message", (msg) => {
      if (msg.username !== username) setMessages((prev) => [...prev, msg]);
    });
    socket.on("online-users", (userList) => setUsers(userList));
    socket.on("user-typing", ({ username: tName }) => { if (tName !== username) setTypingUser(tName); });
    socket.on("user-stop-typing", () => setTypingUser(null));

    // 🎮 Game State Listeners
    socket.on("game-started", (gameId) => setActiveGame(gameId));
    socket.on("game-closed", () => {
      setActiveGame(null);
      setScores({});
    });

    // 📊 Score & Stats Listeners
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
        // State
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
        socket,
        // Actions
        joinRoom,
        sendMessage,
        handleTyping,
        sendGameRequest,
        sendRematchRequest,
        closeGame,
        updateScore,
        recordMatchWin,
        updateWinTarget,
        resetScores
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};