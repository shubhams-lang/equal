import { io } from "socket.io-client";

export const socket = io("https://equal.onrender.com", {
  transports: ["websocket", "polling"],

  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,

  timeout: 20000,

  autoConnect: true
});