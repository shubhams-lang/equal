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
  const typingTimeoutRef = useRef(null);

  /* ==========================
      IDENTITY & CHAT STATE 
  ========================== */
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [connected, setConnected] = useState(false);

  /* ==========================
      GAME & PERSISTENCE
  ========================== */
  const [activeGame, setActiveGame] = useState(null);
  const [activeGameRequest, setActiveGameRequest] = useState(null);
  const [scores, setScores] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [streak, setStreak] = useState({ lastWinner: null, count: 0 });
  const [myStickers] = useState(() => {
    try {
      const saved = localStorage.getItem("custom_stickers");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  /* ==========================
      SOCKET INITIALIZATION
  ========================== */
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // Monitor Connection Status
    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
    });

    // Message Handlers
    socket.on("receive-message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("update-reactions", ({ msgId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, reactions } : m))
      );
    });

    // User & Presence Handlers
    socket.on("online-users", setUsers);
    socket.on("user-typing", ({ username: name }) => {
      if (name !== username) setTypingUser(name);
    });
    socket.on("user-stop-typing", () => setTypingUser(null));

    // Game Handlers
    socket.on("game-requested", (req) => {
      setActiveGameRequest(req);
    });

    socket.on("game-started", (gameId) => {
      setActiveGame(gameId);
      setActiveGameRequest(null);
    });

    socket.on("game-closed", () => {
      setActiveGame(null);
      setScores({});
    });

    socket.on("score-updated", setScores);
    socket.on("leaderboard-updated", (data) => {
      setLeaderboard(data.leaderboard || {});
      setStreak(data.streak || { lastWinner: null, count: 0 });
    });

    return () => {
      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
    };
  }, [username]); // Reload listeners if identity changes

  /* ==========================
      ACTIONS & HELPERS
  ========================= */
  const joinRoom = useCallback((id, name) => {
    setMessages([]);
    setRoomId(id);
    setUsername(name);
    socketRef.current?.emit("join-room", { roomId: id, username: name });
  }, []);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("leave-room", { roomId, username });
      setRoomId(null);
      setUsername("");
      setMessages([]);
    }
  }, [roomId, username]);

  const sendMessage = useCallback((content, type = "text", metadata = {}) => {
    if (!content || !roomId || !socketRef.current) return;

    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      content,
      type,
      metadata,
      reactions: [],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, messageData]);
    socketRef.current.emit("send-message", messageData);
  }, [roomId, username]);

  const handleReaction = useCallback((msgId, emoji) => {
    if (!roomId || !socketRef.current) return;
    
    // Emit to server
    socketRef.current.emit("message-reaction", { roomId, msgId, emoji, username });

    // Optimistic UI Update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg;
        const reactions = [...(msg.reactions || [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);

        if (idx > -1) {
          const hasReacted = reactions[idx].users?.includes(username);
          reactions[idx] = {
            ...reactions[idx],
            count: hasReacted ? reactions[idx].count - 1 : reactions[idx].count + 1,
            users: hasReacted 
              ? reactions[idx].users.filter(u => u !== username) 
              : [...reactions[idx].users, username]
          };
        } else {
          reactions.push({ emoji, count: 1, users: [username] });
        }
        return { ...msg, reactions: reactions.filter(r => r.count > 0) };
      })
    );
  }, [roomId, username]);

  const handleTyping = useCallback(() => {
    if (!roomId || !socketRef.current) return;
    socketRef.current.emit("typing", { roomId, username });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stop-typing", { roomId, username });
    }, 1500);
  }, [roomId, username]);

  // Game Logic
  const sendGameRequest = (gameId) => socketRef.current?.emit("request-game", { roomId, gameId, sender: username });
  const acceptGameRequest = () => {
    if (!activeGameRequest) return;
    socketRef.current?.emit("start-game", { roomId, gameId: activeGameRequest.gameId });
    setActiveGameRequest(null);
  };
  const declineGameRequest = () => setActiveGameRequest(null);
  const updateScore = (winner) => socketRef.current?.emit("update-score", { roomId, username: winner });
  const closeGame = () => {
    socketRef.current?.emit("leave-game", { roomId });
    setActiveGame(null);
  };

  useEffect(() => {
    const other = users.find((u) => u !== username);
    setOpponent(other || null);
  }, [users, username]);

  /* ==========================
      CONTEXT VALUE
  ========================== */
  const value = useMemo(() => ({
    username, roomId, messages, users, opponent, typingUser, connected,
    activeGame, activeGameRequest, scores, leaderboard, streak, myStickers,
    socket: socketRef.current, joinRoom, leaveRoom, sendMessage, 
    handleReaction, handleTyping, sendGameRequest, acceptGameRequest, 
    declineGameRequest, updateScore, closeGame
  }), [
    username, roomId, messages, users, opponent, typingUser, connected,
    activeGame, activeGameRequest, scores, leaderboard, streak, myStickers
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};