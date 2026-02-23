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
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [myStickers, setMyStickers] = useState(() => {
    const saved = localStorage.getItem("custom_stickers");
    return saved ? JSON.parse(saved) : [];
  });
  
  const typingTimeoutRef = useRef(null);

  // --- GAME STATE ---
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
      💬 MESSAGING & MEDIA
     =========================== */

  const sendMessage = ({ content, type = "text", metadata = {} }) => {
    if (!content || !roomId) return;
    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      content, 
      type,
      metadata,
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

  const createCustomSticker = (file) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 320;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setMyStickers((prev) => {
          const updated = [compressedBase64, ...prev].slice(0, 24);
          localStorage.setItem("custom_stickers", JSON.stringify(updated));
          return updated;
        });
      };
    };
  };

  const deleteCustomSticker = (index) => {
    setMyStickers((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      localStorage.setItem("custom_stickers", JSON.stringify(updated));
      return updated;
    });
  };

  /* ===========================
      🎮 GAME LOGIC (ADDED MISSING)
     =========================== */

  // 1. Send Request to start a game
  const sendGameRequest = (gameId) => {
    if (!roomId) return;
    console.log("Starting game:", gameId);
    socket.emit("start-game", { roomId, gameId });
  };

  // 2. Update scores during a game
  const updateScore = (winnerName) => {
    if (!roomId) return;
    socket.emit("update-score", { roomId, username: winnerName });
  };

  // 3. Reset scores
  const resetScores = useCallback(() => {
    if (!roomId) return;
    socket.emit("reset-scores", { roomId });
  }, [roomId]);

  // 4. Close/Exit game
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
      if (msg && msg.username !== username) setMessages((prev) => [...prev, msg]);
    });

    socket.on("online-users", (userList) => setUsers(userList));
    
    socket.on("user-typing", ({ username: tName }) => { 
      if (tName !== username) setTypingUser(tName); 
    });

    socket.on("user-stop-typing", () => setTypingUser(null));

    // Game Specific Listeners
    socket.on("game-started", (gameId) => {
      console.log("Game started event received:", gameId);
      setActiveGame(gameId);
    });

    socket.on("game-closed", () => {
      setActiveGame(null);
      setScores({});
    });

    socket.on("score-updated", (data) => setScores(data));
    socket.on("scores-reset-confirmed", (data) => setScores(data));

    socket.on("leaderboard-updated", (data) => {
      setLeaderboard(data.leaderboard || {});
      setStreak(data.streak || { lastWinner: null, count: 0 });
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
        deleteCustomSticker,
        sendGameRequest, // ADDED
        updateScore,     // ADDED
        closeGame,       // ADDED
        resetScores
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};