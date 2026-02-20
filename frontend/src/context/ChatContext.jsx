import React, { createContext, useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeGame, setActiveGame] = useState(null); // Tracks the current game session

  // 1. Persistent Username Logic
  const [username] = useState(() => {
    const stored = localStorage.getItem("username");
    if (stored) return stored;
    const newName = `User_${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem("username", newName);
    return newName;
  });

  // 2. Optimized Socket Initialization
  // Using 'websocket' transport avoids the polling preflight errors (0.0 kB)
  const socket = useMemo(() => 
    io("https://equal.onrender.com", {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 5,
    }), 
  []);

  useEffect(() => {
    if (!socket) return;

    // Join room when roomId is set (after Create or Join)
    if (roomId) {
      socket.emit("join-room", { roomId, username });
    }

    // --- SOCKET LISTENERS ---

    // Updates user list and "Online" count
    socket.on("room-update", (data) => {
      if (data.users) setUsers(data.users);
      if (data.messages) setMessages(data.messages);
    });

    // Listens for chat messages
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Listens for Game Control (Start/Exit)
    socket.on("game-state-update", (payload) => {
      if (payload.type === "START_GAME") {
        setActiveGame(payload.gameId);
      }
      if (payload.type === "EXIT_GAME") {
        setActiveGame(null);
      }
    });

    // Connection Debugging
    socket.on("connect", () => console.log("✅ Socket Connected"));
    socket.on("connect_error", (err) => console.error("❌ Socket Error:", err.message));

    return () => {
      socket.off("room-update");
      socket.off("receive-message");
      socket.off("game-state-update");
      socket.off("connect");
      socket.off("connect_error");
    };
  }, [socket, roomId, username]);

  // 3. Helper function to launch a game for both players
  const launchGame = (gameId) => {
    setActiveGame(gameId);
    socket.emit("game-state-sync", {
      roomId,
      payload: { type: "START_GAME", gameId, sender: username }
    });
  };

  // 4. Helper function to close the game for both players
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
        setMessages,
        roomId,
        setRoomId,
        users,
        username,
        socket,
        activeGame,
        setActiveGame,
        launchGame,
        closeGame
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};