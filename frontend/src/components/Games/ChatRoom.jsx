import { useState } from "react";
import { FiUsers, FiMenu } from "react-icons/fi";
import Chat from "./Chat";

export default function ChatRoom({ members = [], onReact }) {

  const [membersOpen, setMembersOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#0b141a] text-white overflow-hidden">

      {/* MEMBERS PANEL */}
      <aside
        className={`bg-[#111b21] border-r border-white/5 transition-all duration-300 
        ${membersOpen ? "w-64" : "w-0"} overflow-hidden`}
      >

        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <FiUsers />
          <span className="font-bold text-sm uppercase tracking-wider">
            Members ({members.length})
          </span>
        </div>

        <div className="p-3 space-y-2 overflow-y-auto h-full">
          {members.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg bg-[#202c33] hover:bg-[#2a3942] transition"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                {m[0]}
              </div>

              <span className="text-sm font-medium">{m}</span>
            </div>
          ))}
        </div>

      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex flex-col flex-1 relative">

        {/* HEADER */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#111b21]">

          <div className="flex items-center gap-3">

            {/* TOGGLE BUTTON */}
            <button
              onClick={() => setMembersOpen(!membersOpen)}
              className="p-2 hover:bg-[#202c33] rounded-lg transition"
            >
              <FiMenu size={20} />
            </button>

            <h1 className="text-sm font-bold uppercase tracking-wider">
              Anonymous Room
            </h1>

          </div>

        </header>

        {/* CHAT COMPONENT */}
        <div className="flex-1">
          <Chat onReact={onReact} />
        </div>

      </div>

    </div>
  );
}