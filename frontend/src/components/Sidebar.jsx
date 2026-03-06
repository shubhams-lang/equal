import { useContext, useState, useEffect } from "react";
import { ChatContext } from "../context/ChatContext";
import { FiUsers, FiPlus, FiLogIn, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Sidebar() {
  const { socket, setInviteCode } = useContext(ChatContext);

  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  /* ------------------------
     Socket listener safely
  ------------------------ */
  useEffect(() => {
    if (!socket) return;

    socket.on("roomCreated", ({ inviteCode }) => {
      setInviteCode(inviteCode);
    });

    return () => socket.off("roomCreated");
  }, [socket]);

  /* ------------------------
     Actions
  ------------------------ */

  const createRoom = () => {
    if (!roomName.trim()) return;
    socket.emit("createRoom", { roomName });
  };

  const joinRoom = () => {
    if (!code.trim()) return;
    setInviteCode(code);
  };

  return (
    <div
      className={`bg-[#111b21] border-r border-white/5 transition-all duration-300
      ${collapsed ? "w-16" : "w-64"} flex flex-col`}
    >

      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">

        {!collapsed && (
          <h2 className="text-sm font-bold tracking-widest uppercase text-blue-400">
            GhostWire
          </h2>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-[#202c33] rounded-lg transition"
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      {/* CONTENT */}
      {!collapsed && (
        <div className="p-4 space-y-6">

          {/* CREATE ROOM */}
          <div className="space-y-2">

            <label className="text-[10px] uppercase tracking-widest text-slate-400">
              Create Room
            </label>

            <input
              placeholder="Room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full p-2 bg-[#202c33] rounded-lg outline-none text-sm"
            />

            <button
              onClick={createRoom}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 p-2 rounded-lg text-sm font-bold transition"
            >
              <FiPlus /> Create
            </button>

          </div>

          {/* JOIN ROOM */}
          <div className="space-y-2">

            <label className="text-[10px] uppercase tracking-widest text-slate-400">
              Join Room
            </label>

            <input
              placeholder="Invite code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2 bg-[#202c33] rounded-lg outline-none text-sm"
            />

            <button
              onClick={joinRoom}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 p-2 rounded-lg text-sm font-bold transition"
            >
              <FiLogIn /> Join
            </button>

          </div>

        </div>
      )}

      {/* COLLAPSED ICONS */}
      {collapsed && (
        <div className="flex flex-col items-center gap-6 py-6">

          <FiUsers size={20} className="text-slate-400" />
          <FiPlus size={20} className="text-slate-400" />
          <FiLogIn size={20} className="text-slate-400" />

        </div>
      )}
    </div>
  );
}