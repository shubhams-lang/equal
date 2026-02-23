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
  
  // Typing Indicator State
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Game State
  const [activeGame, setActiveGame] = useState(null);
  const [scores, setScores] = useState({});

  /* ===========================
      🚪 ROOM & SYSTEM ACTIONS
  =========================== */

  const joinRoom = (targetRoomId, chosenIdentity) => {
    if (!targetRoomId || !chosenIdentity) return;
    setRoomId(targetRoomId);
    setUsername(chosenIdentity);
    setMessages([]);
    socket.emit("join-room", { roomId: targetRoomId, username: chosenIdentity });
  };

  const addSystemMessage = (text) => {
    setMessages((prev) => [
      ...prev, 
      { id: uuidv4(), message: text, type: "system", username: "System" }
    ]);
  };

  /* ===========================
      💬 MESSAGING & TYPING
  =========================== */

  const sendMessage = (text) => {
    if (!text || !roomId) return;
    
    // Stop typing immediately when sending
    socket.emit("stop-typing", { roomId, username });
    
    const messageData = {
      id: uuidv4(),
      roomId,
      username,
      message: text,
      type: "user"
    };
    
    socket.emit("send-message", messageData);
    setMessages((prev) => [...prev, messageData]);
  };

  const handleTyping = () => {
    if (!roomId || !username) return;

    socket.emit("typing", { roomId, username });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", { roomId, username });
    }, 2000);
  };

  /* ===========================
      📡 SOCKET LISTENERS
  =========================== */

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      if (msg.roomId !== roomId || msg.username === username) return;
      setMessages((prev) => [...prev, { ...msg, type: "user" }]);
    };

    const handleOnlineUsers = (userList) => setUsers(userList);

    const handleUserOnline = (user) => {
      if (user !== username) addSystemMessage(`${user} joined the room`);
    };

    const handleUserOffline = (user) => {
      if (user) addSystemMessage(`${user} left the room`);
    };

    const handleUserTyping = ({ username: remoteUser }) => {
      if (remoteUser !== username) setTypingUser(remoteUser);
    };

    const handleUserStopTyping = () => setTypingUser(null);

    socket.on("receive-message", handleReceiveMessage);
    socket.on("online-users", handleOnlineUsers);
    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);

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
      joinRoom, sendMessage, handleTyping, socket, 
      activeGame, scores, setActiveGame, setScores
    }}>
      {children}
    </ChatContext.Provider>
  );
};