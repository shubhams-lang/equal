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

  /* ==========================
      IDENTITY STATE 
  ========================== */
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  /* ==========================
      STICKERS (Persistence)
  ========================== */
  const [myStickers, setMyStickers] = useState(() => {
    try {
      const saved = localStorage.getItem("custom_stickers");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  /* ==========================
      GAME STATE
  ========================== */
  const [activeGame, setActiveGame] = useState(null);
  const [activeGameRequest, setActiveGameRequest] = useState(null); // New: For the invite toast
  const [scores, setScores] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [streak, setStreak] = useState({ lastWinner: null, count: 0 });
  const [settings, setSettings] = useState({ winTarget: 10 });

  /* ==========================
      SOCKET INIT & CLEANUP
  ========================== */
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });

    const handleBeforeUnload = () => {
      if (socketRef.current && roomId) {
        socketRef.current.emit("leave-room", { roomId, username });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socketRef.current?.disconnect();
    };
  }, [roomId, username]);

  const socket = socketRef.current;

  /* ==========================
      REACTION LOGIC (Optimistic)
  ========================== */
  const handleReaction = useCallback((msgId, emoji) => {
    if (!roomId || !socketRef.current) return;

    // Send to server
    socketRef.current.emit("message-reaction", { roomId, msgId, emoji, username });

    // Update locally immediately (Optimistic UI)
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
              count: hasReacted ? r.count - 1 : r.count + 1,
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
  const sendMessage = useCallback(
    (content, type = "text", metadata = {}) => {
      if (!content || !roomId || !socketRef.current) return;

      const messageData = {
        id: uuidv4(),
        roomId,
        username,
        content,
        type,
        metadata,
        reactions: [], // Initialize reactions array
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, messageData]);
      socketRef.current.emit("send-message", messageData);
    },
    [roomId, username]
  );

  const handleTyping = useCallback(() => {
    if (!roomId || !socketRef.current) return;
    socketRef.current.emit("typing", { roomId, username });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stop-typing", { roomId, username });
    }, 1500);
  }, [roomId, username]);

  /* ==========================
      GAME ACTIONS
  ========================== */
  const sendGameRequest = (gameId) => {
    if (!roomId || !socketRef.current) return;
    // Emit "request" instead of "start" to trigger the toast for the other user
    socketRef.current.emit("request-game", { roomId, gameId, sender: username });
  };

  const acceptGameRequest = () => {
    if (!activeGameRequest || !socketRef.current) return;
    socketRef.current.emit("start-game", { roomId, gameId: activeGameRequest.gameId });
    setActiveGameRequest(null);
  };

  const declineGameRequest = () => setActiveGameRequest(null);

  const updateScore = (winnerName) => {
    if (!roomId || !socketRef.current) return;
    socketRef.current.emit("update-score", { roomId, username: winnerName });
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
    const s = socketRef.current;

    s.on("receive-message", (msg) => {
      if (msg.username !== username) setMessages((prev) => [...prev, msg]);
    });

    s.on("update-reactions", ({ msgId, reactions }) => {
      setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, reactions } : m));
    });

    s.on("game-requested", (request) => {
      if (request.sender !== username) setActiveGameRequest(request);
    });

    s.on("online-users", setUsers);

    s.on("user-typing", ({ username: name }) => {
      if (name !== username) setTypingUser(name);
    });

    s.on("user-stop-typing", () => setTypingUser(null));
    s.on("game-started", (gameId) => {
      setActiveGame(gameId);
      setActiveGameRequest(null);
    });

    s.on("game-closed", () => {
      setActiveGame(null);
      setScores({});
    });

    s.on("score-updated", setScores);
    s.on("scores-reset-confirmed", setScores);
    s.on("leaderboard-updated", (data) => {
      setLeaderboard(data.leaderboard || {});
      setStreak(data.streak || { lastWinner: null, count: 0 });
    });

    return () => {
      s.off("receive-message");
      s.off("update-reactions");
      s.off("game-requested");
      s.off("online-users");
      s.off("user-typing");
      s.off("user-stop-typing");
      s.off("game-started");
      s.off("game-closed");
      s.off("score-updated");
      s.off("leaderboard-updated");
    };
  }, [username]);

  /* ==========================
      ROOM HELPERS
  ========================== */
  const joinRoom = useCallback((id, name) => {
    setMessages([]);
    setRoomId(id);
    setUsername(name);
    socketRef.current.emit("join-room", { roomId: id, username: name });
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

  /* ==========================
      CONTEXT VALUE
  ========================== */
  const value = useMemo(() => ({
    username, roomId, setRoomId, messages, users, opponent, typingUser,
    activeGame, activeGameRequest, scores, leaderboard, streak, settings, myStickers,
    socket, joinRoom, leaveRoom, sendMessage, handleReaction, handleTyping,
    sendGameRequest, acceptGameRequest, declineGameRequest, updateScore, closeGame, resetScores
  }), [username, roomId, messages, users, opponent, typingUser, activeGame, activeGameRequest, scores, leaderboard, streak, myStickers]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};