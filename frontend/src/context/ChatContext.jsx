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
  const [myStickers, setMyStickers] = useState([]); // Custom Stickers List
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
      💬 ADVANCED MESSAGING LOGIC
     =========================== */

  /**
   * @param content - Text, Base64 Media, or Sticker ID
   * @param type - 'text', 'image', 'video', 'audio', 'sticker'
   */
  const sendMessage = (content, type = "text", metadata = {}) => {
    if (!content || !roomId) return;

    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      content, 
      type,
      metadata, // e.g. { duration: '0:05' }
      // Human-readable timestamp for the UI
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  // Logic to add a custom image to your sticker tray
  const createCustomSticker = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setMyStickers((prev) => [...prev, e.target.result]);
    };
    reader.readAsDataURL(file);
  };

  /* ===========================
      🎮 GAME SYNCHRONIZATION
     =========================== */

  const sendGameRequest = (gameId) => {
    if (!roomId) return;
    resetScores();
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

  const recordMatchWin = (winnerName) => {
    if (!roomId) return;
    socket.emit("match-victory", { roomId, username: winnerName });
  };

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
    socket.on("receive-message", (msg) => {
      if (msg.username !== username) setMessages((prev) => [...prev, msg]);
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
        sendMessage,
        handleTyping,
        createCustomSticker,
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