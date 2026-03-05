import {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext(null);

const SOCKET_URL = "https://equal.onrender.com";

export const ChatProvider = ({ children }) => {
  const socketRef = useRef(null);

  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);

  const typingTimeoutRef = useRef(null);

  /* ==========================
     STICKERS
  ========================== */

  const [myStickers, setMyStickers] = useState(() => {
    try {
      const saved = localStorage.getItem("custom_stickers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  /* ==========================
     GAME STATE
  ========================== */

  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [streak, setStreak] = useState({ lastWinner: null, count: 0 });
  const [settings, setSettings] = useState({ winTarget: 10 });

  /* ==========================
     SOCKET INIT
  ========================== */

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const socket = socketRef.current;

  /* ==========================
     ROOM JOIN
  ========================== */

  const joinRoom = useCallback((id, name) => {
    if (!id || !name || !socketRef.current) return;

    setRoomId(id);
    setUsername(name);
    setMessages([]);

    socketRef.current.emit("join-room", {
      roomId: id,
      username: name,
    });
  }, []);

  /* ==========================
     OPPONENT DETECTION
  ========================== */

  useEffect(() => {
    if (!users.length || !username) return;

    const found = users.find((u) => u !== username);
    setOpponent(found || null);
  }, [users, username]);

  /* ==========================
     MESSAGES
  ========================== */

  const sendMessage = useCallback(
    ({ content, type = "text", metadata = {} }) => {
      if (!content || !roomId || !socketRef.current) return;

      const messageData = {
        id: uuidv4(),
        roomId,
        username,
        content,
        type,
        metadata,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, messageData]);

      socketRef.current.emit("send-message", messageData);
    },
    [roomId, username]
  );

  /* ==========================
     TYPING INDICATOR
  ========================== */

  const handleTyping = useCallback(() => {
    if (!roomId || !socketRef.current) return;

    socketRef.current.emit("typing", { roomId, username });

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stop-typing", { roomId, username });
    }, 1500);
  }, [roomId, username]);

  /* ==========================
     STICKER CREATOR
  ========================== */

  const createCustomSticker = (file) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const size = 250;

        canvas.width = size;
        canvas.height = size;

        const sourceSize = Math.min(img.width, img.height);

        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size
        );

        const compressed = canvas.toDataURL("image/webp", 0.8);

        setMyStickers((prev) => {
          const updated = [compressed, ...prev].slice(0, 24);
          localStorage.setItem("custom_stickers", JSON.stringify(updated));
          return updated;
        });
      };
    };

    reader.readAsDataURL(file);
  };

  const deleteCustomSticker = (index) => {
    setMyStickers((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      localStorage.setItem("custom_stickers", JSON.stringify(updated));
      return updated;
    });
  };

  const backupStickers = () => {
    if (!myStickers.length) return alert("No stickers to backup");

    const blob = new Blob([JSON.stringify(myStickers)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `stickers-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const restoreStickers = (file) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);

        if (!Array.isArray(imported)) throw new Error();

        setMyStickers((prev) => {
          const merged = [...new Set([...imported, ...prev])].slice(0, 24);
          localStorage.setItem("custom_stickers", JSON.stringify(merged));
          return merged;
        });

        alert("Stickers restored");
      } catch {
        alert("Invalid backup file");
      }
    };

    reader.readAsText(file);
  };

  /* ==========================
     GAME
  ========================== */

  const sendGameRequest = (gameId) => {
    if (!roomId || !socketRef.current) return;

    socketRef.current.emit("start-game", { roomId, gameId });
  };

  const updateScore = (winnerName) => {
    if (!roomId || !socketRef.current) return;

    socketRef.current.emit("update-score", {
      roomId,
      username: winnerName,
    });
  };

  const resetScores = useCallback(() => {
    if (!roomId || !socketRef.current) return;

    socketRef.current.emit("reset-scores", { roomId });
  }, [roomId]);

  const closeGame = () => {
    if (!roomId || !socketRef.current) return;

    socketRef.current.emit("leave-game", { roomId });

    setActiveGame(null);
  };

  /* ==========================
     SOCKET LISTENERS
  ========================== */

  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    socket.on("receive-message", (msg) => {
      if (msg.username !== username) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("online-users", setUsers);

    socket.on("user-typing", ({ username: name }) => {
      if (name !== username) setTypingUser(name);
    });

    socket.on("user-stop-typing", () => {
      setTypingUser(null);
    });

    socket.on("game-started", setActiveGame);

    socket.on("game-closed", () => {
      setActiveGame(null);
      setScores({});
    });

    socket.on("score-updated", setScores);

    socket.on("scores-reset-confirmed", setScores);

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
  }, [username]);

  /* ==========================
     CONTEXT VALUE
  ========================== */

  const value = useMemo(
    () => ({
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
      resetScores,
    }),
    [
      username,
      roomId,
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
      sendMessage,
      handleTyping,
    ]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};