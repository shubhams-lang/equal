import { useContext, useState } from "react";
import { ChatContext } from "../context/ChatContext";

export default function Sidebar() {
  const { socket, setInviteCode } = useContext(ChatContext);
  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");

  const createRoom = () => {
    socket.emit("createRoom", { roomName });
    socket.on("roomCreated", ({ inviteCode }) => {
      setInviteCode(inviteCode);
    });
  };

  const joinRoom = () => {
    setInviteCode(code);
  };

  return (
    <div className="w-64 bg-slate-900 p-4 space-y-4">
      <h2 className="text-lg font-semibold">GhostWire</h2>

      <input
        placeholder="Room name"
        onChange={(e) => setRoomName(e.target.value)}
        className="w-full p-2 bg-slate-800 rounded"
      />
      <button onClick={createRoom} className="w-full bg-indigo-500 p-2 rounded">
        Create Room
      </button>

      <input
        placeholder="Invite code"
        onChange={(e) => setCode(e.target.value)}
        className="w-full p-2 bg-slate-800 rounded"
      />
      <button onClick={joinRoom} className="w-full bg-emerald-500 p-2 rounded">
        Join Room
      </button>
    </div>
  );
}
