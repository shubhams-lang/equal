import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function Layout() {
  const { members, typingUser, inviteCode } = useContext(ChatContext);

  return (
    <div className="h-screen bg-slate-950 text-white flex">

      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        
        <div className="p-4 border-b border-slate-800">
          <div className="text-sm text-slate-400">Room</div>
          <div className="font-semibold">
            {inviteCode || "No Room Joined"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-sm text-slate-400 mb-2">
            Members ({members.length})
          </div>

          {members.map((member, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>{member}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <MessageList />
        </div>

        {/* Typing Indicator */}
        {typingUser && (
          <div className="px-6 py-2 text-sm text-slate-400">
            {typingUser} is typing...
          </div>
        )}

        {/* Input */}
        <MessageInput />
      </div>
    </div>
  );
}
