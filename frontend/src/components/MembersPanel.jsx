import { useContext } from "react";
import { ChatContext } from "../context/ChatContext";

export default function MembersPanel() {
  const { members, username } = useContext(ChatContext);

  return (
    <div className="relative w-72 overflow-hidden">

      {/* Ambient Background Layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

      {/* Glass Panel */}
      <div className="relative h-full backdrop-blur-2xl bg-white/[0.04] border-l border-white/10 p-6 flex flex-col">

        {/* Header */}
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 mb-2">
            Connected
          </div>

          <div className="flex items-end gap-3">
            <div className="text-3xl font-semibold text-white">
              {members.length}
            </div>

            <div className="flex items-center gap-1 text-emerald-400 text-xs mb-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="relative flex-1 overflow-y-auto pr-2 space-y-3">

          {members.map((m, i) => {
            const isSelf = m === username;

            return (
              <div
                key={i}
                className="group relative flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 hover:bg-white/[0.05] hover:translate-x-1"
              >

                {/* Avatar */}
                <div className="relative">

                  {/* Outer Glow */}
                  <div className={`absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-70 transition ${
                    isSelf ? "bg-blue-500/40" : "bg-indigo-500/30"
                  }`} />

                  {/* Avatar Circle */}
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-lg transition-all duration-300 ${
                    isSelf
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600"
                      : "bg-gradient-to-br from-slate-700 to-slate-600"
                  }`}>
                    {m.charAt(0).toUpperCase()}
                  </div>

                  {/* Presence Dot */}
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-slate-900 animate-pulse" />
                </div>

                {/* Username & Status */}
                <div className="flex flex-col">
                  <span className={`text-sm transition ${
                    isSelf
                      ? "text-blue-400 font-medium"
                      : "text-slate-200 group-hover:text-white"
                  }`}>
                    {isSelf ? "You" : m}
                  </span>

                  <span className="text-[11px] text-slate-500 tracking-wide">
                    Online
                  </span>
                </div>

                {/* Subtle Divider Glow */}
                <div className="absolute bottom-0 left-12 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition" />

              </div>
            );
          })}

        </div>

      </div>

      {/* Scroll Fade Mask (top) */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black to-transparent pointer-events-none" />

      {/* Scroll Fade Mask (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black to-transparent pointer-events-none" />

    </div>
  );
}