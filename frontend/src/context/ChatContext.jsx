import React, { createContext, useState, useEffect } from "react";
import { socket } from "../socket";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [users, setUsers] = useState([]);
  const [username] = useState("Anon" + Math.floor(Math.random() * 1000));

  useEffect(() => {
    socket.on("receive-message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("room-update", ({ messages, users }) => {
      setMessages(messages);
      setUsers(users);
    });

    return () => {
      socket.off("receive-message");
      socket.off("room-update");
    };
  }, []);

  return (
    <ChatContext.Provider value={{ messages, setMessages, roomId, setRoomId, users, username, socket }}>
      {children}
    </ChatContext.Provider>
  );
};
