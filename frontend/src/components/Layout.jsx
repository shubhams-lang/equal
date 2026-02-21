import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function Layout() {
  const { members, typingUser, inviteCode } = useContext(ChatContext);

  return (
    <div className="h-screen relative bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-black text-white flex overflow-hidden">

      {/* Ambient Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Sidebar */}
      <div className="relative w-64 backdrop-blur-xl bg-white/5 border-r border-white/10 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)]">

        {/* Room Info */}
        <div className="p-5 border-b border-white/10">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
            Room
          </div>
          <div className="font-semibold text-lg tracking-tight">
            {inviteCode || "No Room Joined"}
          </div>
        </div>

        {/* Members */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="text-xs uppercase tracking-widest text-slate-400">
            Members ({members.length})
          </div>

          {members.map((member, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md"
            >
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-50" />
              </div>
              <span className="text-sm">{member}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
          <MessageList />
        </div>

        {/* Premium Typing Indicator */}
        {typingUser && (
          <div className="px-8 pb-2">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs text-slate-300 shadow-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-150" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-300" />
              </div>
              {typingUser} is typing...
            </div>
          </div>
        )}

        {/* Input (Elevated Bar) */}
        <div className="backdrop-blur-xl bg-white/5 border-t border-white/10 p-5">
          <MessageInput />
        </div>

      </div>
    </div>
  );
}