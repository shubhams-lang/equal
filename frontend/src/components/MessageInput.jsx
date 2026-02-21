import React, { useContext, useState } from "react";
import { ChatContext } from "../context/ChatContext";

export default function MessageInput() {
  const { socket, inviteCode, username } = useContext(ChatContext);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const sendMessage = () => {
    if (!text.trim() || !inviteCode) return;

    socket.emit("sendMessage", {
      inviteCode,
      message: text.trim(),
      username,
      timestamp: Date.now()
    });

    setText("");
  };

  return (
    <div className="flex items-center gap-3">

      {/* Glass Input Wrapper */}
      <div
        className={`flex-1 flex items-center px-4 py-3 rounded-2xl transition-all backdrop-blur-xl border ${
          focused
            ? "bg-white/10 border-blue-400/40 shadow-[0_0_25px_rgba(59,130,246,0.3)]"
            : "bg-white/5 border-white/10"
        }`}
      >
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            socket.emit("typing", { inviteCode, username });
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          className="flex-1 bg-transparent outline-none text-sm placeholder-slate-400"
          placeholder="Type a message..."
        />
      </div>

      {/* Premium Send Button */}
      <button
        onClick={sendMessage}
        disabled={!text.trim()}
        className={`relative px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 overflow-hidden ${
          text.trim()
            ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(59,130,246,0.4)]"
            : "bg-slate-800 text-slate-500 cursor-not-allowed"
        }`}
      >
        <span className="relative z-10">Send</span>

        {/* Energy hover glow */}
        {text.trim() && (
          <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition blur-xl" />
        )}
      </button>

    </div>
  );
}