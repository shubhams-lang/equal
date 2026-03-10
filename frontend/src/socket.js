import { io } from "socket.io-client";

const SERVER_URL = "https://equal.onrender.com";

export const socket = io("https://equal.onrender.com", {
  transports: ["websocket", "polling"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000
});

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});