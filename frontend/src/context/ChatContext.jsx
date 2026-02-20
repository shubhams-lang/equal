import React, { createContext, useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeGame, setActiveGame] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [scores, setScores] = useState({});
  const [isOpponentTyping, setIsOpponentTyping] = useState(false);

  // 1. Persistent Identity
  const [username] = useState(() => {
    const stored = localStorage.getItem("username");
    if (stored) return stored;
    const newName = `User_${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem("username", newName);
    return newName;
  });

  // 2. Socket Connection
  const socket = useMemo(() => 
    io("https://equal.onrender.com", {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
    }), 
  []);

  useEffect(() => {
    if (!socket) return;

    if (roomId) {
      socket.emit("join-room", { roomId, username });
    }

    // --- GLOBAL LISTENERS ---
    socket.on("room-update", (data) => {
      if (data.users) setUsers(data.users);
      if (data.messages) setMessages(data.messages);
      if (data.scores) setScores(data.scores);
    });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      // When a message is received, the opponent has clearly stopped typing
      setIsOpponentTyping(false);
    });

    socket.on("score-update", (newScores) => {
      setScores(newScores);
    });

    // --- TYPING LISTENER ---
    socket.on("display-typing", (data) => {
      if (data.username !== username) {
        setIsOpponentTyping(data.isTyping);
      }
    });

    // --- GAME ENGINE LISTENERS ---
    socket.on("game-state-update", (payload) => {
      if (payload.type === "GAME_REQUEST" || payload.type === "REMATCH_REQUEST") {
        setPendingInvite({
          ...payload,
          isRematch: payload.type === "REMATCH_REQUEST"
        }); 
      }

      if (payload.type === "GAME_ACCEPTED") {
        setActiveGame(payload.gameId);
        setPendingInvite(null); 
      }

      if (payload.type === "EXIT_GAME") {
        setActiveGame(null);
        setPendingInvite(null);
      }
      
      if (payload.type === "GAME_DECLINED") {
        setPendingInvite(null);
      }
    });

    return () => {
      socket.off("room-update");
      socket.off("receive-message");
      socket.off("game-state-update");
      socket.off("score-update");
      socket.off("display-typing");
    };
  }, [socket, roomId, username]);

  // --- TYPING ACTION ---
  const setTypingStatus = (isTyping) => {
    if (!roomId) return;
    socket.emit("typing", { roomId, username, isTyping });
  };

  // --- MULTIMEDIA ACTIONS ---
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

  // --- SCOREBOARD ACTIONS ---
  const updateScore = (winnerName) => {
    const newScores = {
      ...scores,
      [winnerName]: (scores[winnerName] || 0) + 1
    };
    setScores(newScores);
    socket.emit("sync-scores", { roomId, scores: newScores });
  };

  // --- GAME FLOW ACTIONS ---
  const sendGameRequest = (gameId) => {
    setPendingInvite({ gameId, sender: username, isSentByMe: true, isRematch: false });
    socket.emit("game-state-sync", {
      roomId,
      payload: { type: "GAME_REQUEST", gameId, sender: username }
    });
  };

  const sendRematchRequest = () => {
    if (!activeGame) return;
    setPendingInvite({ gameId: activeGame, sender: username, isSentByMe: true, isRematch: true });
    socket.emit("game-state-sync", {
      roomId,
      payload: { type: "REMATCH_REQUEST", gameId: activeGame, sender: username }
    });
  };

  const acceptGameRequest = (gameId) => {
    setActiveGame(gameId);
    setPendingInvite(null);
    socket.emit("game-state-sync", {
      roomId,
      payload: { type: "GAME_ACCEPTED", gameId, sender: username }
    });
  };

  const declineGameRequest = () => {
    setPendingInvite(null);
    socket.emit("game-state-sync", {
      roomId,
      payload: { type: "GAME_DECLINED", sender: username }
    });
  };

  const closeGame = () => {
    setActiveGame(null);
    socket.emit("game-state-sync", {
      roomId,
      payload: { type: "EXIT_GAME", sender: username }
    });
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        roomId,
        setRoomId,
        users,
        username,
        socket,
        activeGame,
        pendingInvite,
        setPendingInvite,
        scores,
        isOpponentTyping,
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