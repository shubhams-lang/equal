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

  /* ==========================
      PERSISTENCE & GAMES
  ========================== */
  const [myStickers, setMyStickers] = useState(() => {
    try {
      const saved = localStorage.getItem("custom_stickers");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activeGame, setActiveGame] = useState(null);
  const [activeGameRequest, setActiveGameRequest] = useState(null);
  const [scores, setScores] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [streak, setStreak] = useState({ lastWinner: null, count: 0 });
  const [settings] = useState({ winTarget: 10 });

  /* ==========================
      SOCKET INITIALIZATION
  ========================== */
  useEffect(() => {
    // Initialize socket once
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // Cleanup on unmount
    return () => {
      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
    };
  }, []);

  /* ==========================
      REACTION LOGIC (Optimized)
  ========================== */
  const handleReaction = useCallback((msgId, emoji) => {
    if (!roomId || !socketRef.current) return;

    socketRef.current.emit("message-reaction", { roomId, msgId, emoji, username });

    // Optimistic Update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg;
        const currentReactions = msg.reactions || [];
        const existing = currentReactions.find((r) => r.emoji === emoji);

        let newReactions;
        if (existing) {
          const hasReacted = existing.users?.includes(username);
          newReactions = currentReactions.map((r) => {
            if (r.emoji !== emoji) return r;
            return {
              ...r,
              count: hasReacted ? Math.max(0, r.count - 1) : r.count + 1,
              users: hasReacted 
                ? r.users.filter((u) => u !== username) 
                : [...(r.users || []), username],
            };
          }).filter(r => r.count > 0);
        } else {
          newReactions = [...currentReactions, { emoji, count: 1, users: [username] }];
        }
        return { ...msg, reactions: newReactions };
      })
    );
  }, [roomId, username]);

  /* ==========================
      MESSAGING LOGIC
  ========================== */
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

    // Update locally then emit
    setMessages((prev) => [...prev, messageData]);
    socketRef.current.emit("send-message", messageData);
  }, [roomId, username]);

  const handleTyping = useCallback(() => {
    if (!roomId || !socketRef.current) return;
    socketRef.current.emit("typing", { roomId, username });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stop-typing", { roomId, username });
    }, 1500);
  }, [roomId, username]);

  /* ==========================
      SOCKET LISTENERS (Stable)
  ========================== */
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    // Use functional updates in listeners to avoid dependency array issues
    const messageHandler = (msg) => {
      if (msg.username !== username) {
        setMessages((prev) => {
          // Prevent duplicate messages if socket reconnects
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const reactionHandler = ({ msgId, reactions }) => {
      setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, reactions } : m));
    };

    s.on("receive-message", messageHandler);
    s.on("update-reactions", reactionHandler);
    s.on("online-users", setUsers);
    s.on("user-typing", ({ username: name }) => name !== username && setTypingUser(name));
    s.on("user-stop-typing", () => setTypingUser(null));
    s.on("game-requested", (req) => req.sender !== username && setActiveGameRequest(req));
    s.on("game-started", (gameId) => { setActiveGame(gameId); setActiveGameRequest(null); });
    s.on("game-closed", () => { setActiveGame(null); setScores({}); });
    s.on("score-updated", setScores);
    s.on("leaderboard-updated", (data) => {
      setLeaderboard(data.leaderboard || {});
      setStreak(data.streak || { lastWinner: null, count: 0 });
    });

    return () => {
      s.off("receive-message", messageHandler);
      s.off("update-reactions", reactionHandler);
      s.off("online-users");
      s.off("user-typing");
      s.off("user-stop-typing");
      s.off("game-requested");
      s.off("game-started");
      s.off("game-closed");
      s.off("score-updated");
      s.off("leaderboard-updated");
    };
  }, [username]); // Only reset listeners if username identity changes

  /* ==========================
      ROOM & GAME HELPERS
  ========================== */
  const joinRoom = useCallback((id, name) => {
    setMessages([]);
    setRoomId(id);
    setUsername(name);
    socketRef.current?.emit("join-room", { roomId: id, username: name });
  }, []);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("leave-room", { roomId, username });
      setRoomId(null); setUsername(""); setUsers([]); setMessages([]);
    }
  }, [roomId, username]);

  useEffect(() => {
    const other = users.find((u) => u !== username);
    setOpponent(other || null);
  }, [users, username]);

  // Game utility wrappers
  const sendGameRequest = (gameId) => socketRef.current?.emit("request-game", { roomId, gameId, sender: username });
  const acceptGameRequest = () => {
    if (!activeGameRequest) return;
    socketRef.current?.emit("start-game", { roomId, gameId: activeGameRequest.gameId });
    setActiveGameRequest(null);
  };
  const declineGameRequest = () => setActiveGameRequest(null);
  const updateScore = (winner) => socketRef.current?.emit("update-score", { roomId, username: winner });
  const resetScores = useCallback(() => socketRef.current?.emit("reset-scores", { roomId }), [roomId]);
  const closeGame = () => { socketRef.current?.emit("leave-game", { roomId }); setActiveGame(null); };

  /* ==========================
      FINAL CONTEXT VALUE
  ========================== */
  const value = useMemo(() => ({
    username, roomId, setRoomId, messages, users, opponent, typingUser,
    activeGame, activeGameRequest, scores, leaderboard, streak, settings, myStickers,
    joinRoom, leaveRoom, sendMessage, handleReaction, handleTyping,
    sendGameRequest, acceptGameRequest, declineGameRequest, updateScore, closeGame, resetScores
  }), [
    username, roomId, messages, users, opponent, typingUser, 
    activeGame, activeGameRequest, scores, leaderboard, streak, myStickers, 
    joinRoom, leaveRoom, sendMessage, handleReaction, handleTyping, resetScores
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};