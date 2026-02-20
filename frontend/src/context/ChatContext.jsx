import React, { createContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState("general"); // default room
  const [users, setUsers] = useState([]);

  // Persistent username
  const [username] = useState(() => {
    const stored = localStorage.getItem("username");
    if (stored) return stored;
    const newName = `Anon${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem("username", newName);
    return newName;
  });

  // Initialize socket
  const [socket] = useState(() =>
  io("https://equal.onrender.com", {
    // 1. Force WebSocket from the start to skip the "polling" phase
    // that often triggers the browser's local network check.
    transports: ["websocket"], 
    
    // 2. Explicitly disable credentials to signal this is a standard 
    // public API request.
    withCredentials: false,
    
    // 3. Add these to stabilize the connection on Render's free tier
    autoConnect: true,
    reconnection: true
  })
);

  useEffect(() => {
    // Auto-join default room
    socket.emit("join-room", { roomId, username });

    // Listen for messages
    socket.on("receive-message", (msg) => setMessages((prev) => [...prev, msg]));

    // Listen for room updates
    socket.on("room-update", ({ messages, users }) => {
      setMessages(messages);
      setUsers(users);
    });

    // Logs for debugging
    socket.on("connect", () => console.log("Connected to chat server"));
    socket.on("disconnect", () => console.log("Disconnected from chat server"));

    // Cleanup
    return () => {
      socket.off("receive-message");
      socket.off("room-update");
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [socket, roomId, username]);

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