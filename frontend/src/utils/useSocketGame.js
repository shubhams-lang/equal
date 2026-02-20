// frontend/src/utils/useSocketGame.js
import { useEffect } from "react";

export default function useSocketGame(socket, roomId, onUpdate) {
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => onUpdate(data);
    socket.on("game-update", handler);
    return () => socket.off("game-update", handler);
  }, [socket, onUpdate]);

  const sendMove = (game, payload) => {
    if (!socket) return;
    socket.emit("game-move", { roomId, game, payload });
  };

  return sendMove;
}
