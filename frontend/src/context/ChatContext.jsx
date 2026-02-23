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
  const typingTimeoutRef = useRef(null);
  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({});

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

  const sendGameRequest = (gameId) => {
    if (!roomId) return;
    // Reset scores whenever a brand new game type is picked
    resetScores();
    socket.emit("start-game", { roomId, gameId });
  };

  // NEW: Reset scores to 0 locally and on server
  const resetScores = useCallback(() => {
    const freshScores = {};
    users.forEach(u => freshScores[u] = 0);
    setScores(freshScores);
    socket.emit("reset-scores", { roomId });
  }, [roomId, users]);

  // FIXED: Logic for simultaneous rematch
  const sendRematchRequest = () => {
    if (!roomId || !activeGame) return;
    
    // 1. Reset the points
    resetScores();
    
    // 2. Send a specific signal that the game components listen for to clear their boards
    socket.emit("game-data", { roomId, type: "GAME_RESTART_SIGNAL" });
    
    // 3. Re-trigger the game start to ensure both players see the overlay disappear
    socket.emit("start-game", { roomId, gameId: activeGame });
  };

  const closeGame = () => {
    if (!roomId) return;
    socket.emit("leave-game", { roomId });
    setActiveGame(null);
    setScores({});
  };

  const updateScore = (winnerName) => {
    setScores((prev) => ({
      ...prev,
      [winnerName]: (prev[winnerName] || 0) + 1,
    }));
    socket.emit("update-score", { roomId, username: winnerName });
  };

  /* ===========================
      📡 GLOBAL SOCKET LISTENERS
     =========================== */

  useEffect(() => {
    socket.on("receive-message", (msg) => {
      if (msg.username !== username) setMessages((prev) => [...prev, msg]);
    });

    socket.on("online-users", (userList) => setUsers(userList));

    socket.on("user-typing", ({ username: typingName }) => {
      if (typingName !== username) setTypingUser(typingName);
    });

    socket.on("user-stop-typing", () => setTypingUser(null));

    socket.on("game-started", (gameId) => {
      setActiveGame(gameId);
    });

    socket.on("game-closed", () => {
      setActiveGame(null);
      setScores({});
    });

    socket.on("score-updated", (data) => {
      // Merges the new score state from server
      setScores((prev) => ({ ...prev, ...data }));
    });

    // NEW: Listen for score resets from opponent
    socket.on("scores-reset-confirmed", () => {
      const freshScores = {};
      users.forEach(u => freshScores[u] = 0);
      setScores(freshScores);
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
    };
  }, [username, roomId, users]);

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
        joinRoom,
        sendMessage,
        handleTyping,
        sendGameRequest,
        sendRematchRequest,
        closeGame,
        updateScore,
        resetScores, // Now available in game components
        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};