import { createContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

const SOCKET_URL = "https://equal.onrender.com/";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true
});

export const ChatProvider = ({ children }) => {
  const [username, setUsername] = useState(""); 
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]); 
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  /* 🚪 ROOM ACTIONS */
  const joinRoom = (targetRoomId, chosenIdentity) => {
    if (!targetRoomId || !chosenIdentity) return;
    setRoomId(targetRoomId);
    setUsername(chosenIdentity);
    setMessages([]);
    socket.emit("join-room", { roomId: targetRoomId, username: chosenIdentity });
  };

  /* 📢 SYSTEM NOTIFICATIONS */
  const addSystemMessage = (text) => {
    setMessages((prev) => [
      ...prev, 
      { id: uuidv4(), message: text, type: "system", timestamp: new Date().toISOString() }
    ]);
  };

  /* 💬 MESSAGING LOGIC */
  const sendMessage = (text) => {
    if (!text || !roomId) return;
    
    // Stop typing indicator
    socket.emit("stop-typing", { roomId, username });
    
    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      message: text,
      type: "user",
      timestamp: new Date().toISOString()
    };
    
    // ✅ FIX: Add to local state IMMEDIATELY so you see your own message
    setMessages((prev) => [...prev, { ...messageData, status: "sent" }]);

    // Send to others via server
    socket.emit("send-message", messageData);
  };

  /* ⌨️ TYPING LOGIC */
  const handleTyping = () => {
    if (!roomId || !username) return;
    socket.emit("typing", { roomId, username });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", { roomId, username });
    }, 2000);
  };

  /* 📡 SOCKET LISTENERS */
  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      // ✅ FIX: Only add messages if they are NOT from you (already added in sendMessage)
      if (msg.username !== username) {
        setMessages((prev) => [...prev, { ...msg, status: "delivered" }]);
      }
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("online-users", (list) => setUsers(list));
    socket.on("user-online", (user) => {
      if (user !== username) addSystemMessage(`${user} joined the room`);
    });
    socket.on("user-offline", (user) => {
      if (user) addSystemMessage(`${user} left the room`);
    });
    socket.on("user-typing", ({ username: remoteUser }) => {
      if (remoteUser !== username) setTypingUser(remoteUser);
    });
    socket.on("user-stop-typing", () => setTypingUser(null));

    return () => {
      socket.off("receive-message");
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
      socket.off("user-typing");
      socket.off("user-stop-typing");
    };
  }, [roomId, username]); 

  return (
    <ChatContext.Provider value={{
      username, roomId, setRoomId, messages, users, typingUser,
      joinRoom, sendMessage, handleTyping, socket
    }}>
      {children}
    </ChatContext.Provider>
  );
};