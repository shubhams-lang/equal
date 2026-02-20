import React, { createContext, useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(null); // Changed to null initially
  const [users, setUsers] = useState([]);

  // 1. Persistent username logic
  const [username] = useState(() => {
    const stored = localStorage.getItem("username");
    if (stored) return stored;
    const newName = `Anon${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem("username", newName);
    return newName;
  });

  // 2. Initialize socket with useMemo to prevent multiple connections
  // Forcing websocket bypasses the red "polling" errors in your logs
  const socket = useMemo(() => 
    io("https://equal.onrender.com", {
      transports: ["websocket"], 
      withCredentials: true,
      autoConnect: true
    }), 
  []);

  useEffect(() => {
    if (!socket) return;

    // Only join a room if roomId is actually set (after Create or Join)
    if (roomId) {
      console.log(`Socket attempting to join: ${roomId}`);
      socket.emit("join-room", { roomId, username });
    }

    // Listen for room updates (This updates the "ONLINE" count)
    socket.on("room-update", (data) => {
      console.log("Update received:", data);
      if (data.messages) setMessages(data.messages);
      if (data.users) setUsers(data.users);
    });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Debugging connection states
    socket.on("connect", () => console.log("Connected to Render server"));
    socket.on("connect_error", (err) => console.error("Socket Error:", err.message));

    return () => {
      socket.off("room-update");
      socket.off("receive-message");
      socket.off("connect");
      socket.off("connect_error");
    };
  }, [socket, roomId, username]); // Runs whenever roomId changes

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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};