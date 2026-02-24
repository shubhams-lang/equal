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

  /* ===========================
      🎨 STICKER STUDIO LOGIC
     =========================== */

  const createCustomSticker = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Optimize: Center-Crop to 250x250 square
        const size = 250;
        canvas.width = size;
        canvas.height = size;
        
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        
        const compressedBase64 = canvas.toDataURL("image/png"); // PNG for transparency
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

  const backupStickers = () => {
    if (myStickers.length === 0) return alert("No stickers to backup!");
    const data = JSON.stringify(myStickers);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stickers-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const restoreStickers = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          setMyStickers((prev) => {
            const merged = [...new Set([...imported, ...prev])].slice(0, 24);
            localStorage.setItem("custom_stickers", JSON.stringify(merged));
            return merged;
          });
          alert("Restore complete!");
        }
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  /* ===========================
      🎮 GAME LOGIC
     =========================== */

  const sendGameRequest = (gameId) => {
    if (!roomId) return;
    socket.emit("start-game", { roomId, gameId });
  };

  const updateScore = (winnerName) => {
    if (!roomId) return;
    socket.emit("update-score", { roomId, username: winnerName });
  };

  const resetScores = useCallback(() => {
    if (!roomId) return;
    socket.emit("reset-scores", { roomId });
  }, [roomId]);

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

    socket.on("game-started", (gameId) => setActiveGame(gameId));

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
        backupStickers,
        restoreStickers,
        sendGameRequest,
        updateScore,
        closeGame,
        resetScores
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};