import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";

export default function Message({ username, message, system, timestamp }) {
  const { currentUser } = useContext(ChatContext);
  const isOwn = username === currentUser;

  if (system) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 text-xs uppercase tracking-wider text-slate-400 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
          {message || username}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 items-end transition-all duration-300 ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      {/* Avatar (only show for others) */}
      {!isOwn && (
        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold shadow-lg">
          {username?.charAt(0).toUpperCase()}
          <div className="absolute inset-0 rounded-full bg-indigo-500 blur-md opacity-40" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl backdrop-blur-xl border transition hover:scale-[1.01] ${
          isOwn
            ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white border-blue-400/30 shadow-[0_8px_25px_rgba(37,99,235,0.35)]"
            : "bg-white/5 text-slate-200 border-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.3)]"
        }`}
      >
        {!isOwn && (
          <div className="text-xs font-semibold text-slate-400 mb-1">
            {username}
          </div>
        )}

        <div className="text-sm leading-relaxed">{message}</div>

        {/* Timestamp */}
        <div className="text-[10px] text-slate-400 mt-2 text-right opacity-70">
          {timestamp
            ? new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </div>
      </div>
    </div>
  );
}