import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useRef
} from "react";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  /* =============================
     CORE STATE
  ============================= */
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [opponent, setOpponent] = useState(null);

  const [activeGame, setActiveGame] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [scores, setScores] = useState({});
  const [isOpponentTyping, setIsOpponentTyping] = useState(false);

  /* =============================
     GAME MODE / MATCHMAKING
  ============================= */
  const [gameMode, setGameMode] = useState("casual"); // casual | ranked
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [showMatchIntro, setShowMatchIntro] = useState(false);

  /* =============================
     PERSISTENT USERNAME
  ============================= */
  const [username] = useState(() => {
    const stored = localStorage.getItem("username");
    if (stored) return stored;

    const newName = `User_${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem("username", newName);
    return newName;
  });

  /* =============================
     SOCKET CONNECTION
  ============================= */
  const socket = useMemo(
    () =>
      io("https://equal.onrender.com", {
        transports: ["websocket"],
        withCredentials: true,
        autoConnect: true
      }),
    []
  );

  /* =============================
     JOIN ROOM (separate effect)
  ============================= */
  useEffect(() => {
    if (roomId) {
      socket.emit("join-room", { roomId, username });
    }
  }, [roomId, socket, username]);

  /* =============================
     GLOBAL SOCKET LISTENERS
  ============================= */
  useEffect(() => {
    if (!socket) return;

    /* --- ROOM UPDATE --- */
    socket.on("room-update", (data) => {
      if (data.users) {
        setUsers(data.users);

        const other = data.users.find((u) => u !== username);
        setOpponent(other || null);
      }

      if (data.messages) setMessages(data.messages);
      if (data.scores) setScores(data.scores);
    });

    /* --- MESSAGE RECEIVE --- */
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setIsOpponentTyping(false);
      playSound("message.mp3");
    });

    /* --- TYPING --- */
    socket.on("display-typing", (data) => {
      if (data.username !== username) {
        setIsOpponentTyping(data.isTyping);
      }
    });

    /* --- SCORE SYNC --- */
    socket.on("score-update", (newScores) => {
      setScores(newScores);
    });

    /* --- GAME ENGINE --- */
    socket.on("game-state-update", (payload) => {
      if (
        payload.type === "GAME_REQUEST" ||
        payload.type === "REMATCH_REQUEST"
      ) {
        setPendingInvite({
          ...payload,
          isRematch: payload.type === "REMATCH_REQUEST"
        });
      }

      if (payload.type === "GAME_ACCEPTED") {
        setPendingInvite(null);
        setShowMatchIntro(true);

        setTimeout(() => {
          setActiveGame(payload.gameId);
          setShowMatchIntro(false);
        }, 3500);
      }

      if (payload.type === "GAME_DECLINED") {
        setPendingInvite(null);
      }

      if (payload.type === "EXIT_GAME") {
        setActiveGame(null);
        setPendingInvite(null);
      }
    });

    /* --- PUBLIC MATCH FOUND --- */
    socket.on("public-match-found", ({ roomId, opponentName }) => {
      setRoomId(roomId);
      setOpponent(opponentName);
      setIsMatchmaking(false);
    });

    return () => {
      socket.off("room-update");
      socket.off("receive-message");
      socket.off("display-typing");
      socket.off("game-state-update");
      socket.off("score-update");
      socket.off("public-match-found");
    };
  }, [socket, username]);

  /* =============================
     TYPING (Debounced)
  ============================= */
  const typingTimeout = useRef(null);

  const setTypingStatus = (isTyping) => {
    if (!roomId) return;

    socket.emit("typing", { roomId, username, isTyping });

    if (isTyping) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socket.emit("typing", {
          roomId,
          username,
          isTyping: false
        });
      }, 1500);
    }
  };

  /* =============================
     SOUND SYSTEM
  ============================= */
  const playSound = (file) => {
    const audio = new Audio(`/sounds/${file}`);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  /* =============================
     MESSAGE ACTIONS
  ============================= */
  const sendImage = (base64Str) => {
    if (!roomId) return;

    socket.emit("send-message", {
      roomId,
      username,
      type: "image",
      content: base64Str,
      timestamp: new Date().toISOString()
    });

    setTypingStatus(false);
  };

  /* =============================
     SCORE SYSTEM
  ============================= */
  const updateScore = (winnerName) => {
    const newScores = {
      ...scores,
      [winnerName]: (scores[winnerName] || 0) + 1
    };

    setScores(newScores);
    socket.emit("sync-scores", { roomId, scores: newScores });
  };

  /* =============================
     GAME FLOW ACTIONS
  ============================= */
  const sendGameRequest = (gameId) => {
    setPendingInvite({
      gameId,
      sender: username,
      isSentByMe: true,
      isRematch: false
    });

    socket.emit("game-state-sync", {
      roomId,
      payload: {
        type: "GAME_REQUEST",
        gameId,
        sender: username,
        mode: gameMode
      }
    });
  };

  const sendRematchRequest = () => {
    if (!activeGame) return;

    setPendingInvite({
      gameId: activeGame,
      sender: username,
      isSentByMe: true,
      isRematch: true
    });

    socket.emit("game-state-sync", {
      roomId,
      payload: {
        type: "REMATCH_REQUEST",
        gameId: activeGame,
        sender: username
      }
    });
  };

  const acceptGameRequest = (gameId) => {
    socket.emit("game-state-sync", {
      roomId,
      payload: {
        type: "GAME_ACCEPTED",
        gameId,
        sender: username
      }
    });
  };

  const declineGameRequest = () => {
    setPendingInvite(null);

    socket.emit("game-state-sync", {
      roomId,
      payload: {
        type: "GAME_DECLINED",
        sender: username
      }
    });
  };

  const closeGame = () => {
    setActiveGame(null);

    socket.emit("game-state-sync", {
      roomId,
      payload: {
        type: "EXIT_GAME",
        sender: username
      }
    });
  };

  /* =============================
     MATCHMAKING
  ============================= */
  const joinPublicQueue = () => {
    setIsMatchmaking(true);
    socket.emit("join-public-queue", {
      username,
      mode: gameMode
    });
  };

  const leavePublicQueue = () => {
    setIsMatchmaking(false);
    socket.emit("leave-public-queue", { username });
  };

  /* =============================
     PROVIDER
  ============================= */
  return (
    <ChatContext.Provider
      value={{
        messages,
        roomId,
        setRoomId,
        users,
        opponent,
        username,
        socket,
        activeGame,
        pendingInvite,
        scores,
        isOpponentTyping,

        // Mode / matchmaking
        gameMode,
        setGameMode,
        isMatchmaking,
        joinPublicQueue,
        leavePublicQueue,
        showMatchIntro,

        // Actions
        setTypingStatus,
        updateScore,
        sendImage,
        sendGameRequest,
        sendRematchRequest,
        acceptGameRequest,
        declineGameRequest,
        closeGame
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};