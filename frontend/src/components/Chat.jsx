import React, { useRef, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiUsers } from "react-icons/fi";

export default function ChatLayout({
  messages,
  username,
  users,
  typingUser,
  onSend,
  onGameSelect,
}) {
  const messageEndRef = useRef(null);
  const [text, setText] = useState("");
  const [membersOpen, setMembersOpen] = useState(true);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#0b141a] text-white font-sans overflow-hidden">
      
      {/* MEMBERS PANEL */}
      <aside 
        className={`bg-[#111b21] border-r border-white/5 transition-all duration-300 ease-in-out flex flex-col
          ${membersOpen ? "w-64" : "w-16"}`}
      >
        {/* Header with Toggle */}
        <div className="flex items-center justify-between p-4 min-h-[70px] border-b border-white/5">
          {membersOpen && <h2 className="font-bold text-lg animate-fadeIn">Members</h2>}
          <button
            onClick={() => setMembersOpen(!membersOpen)}
            className={`text-gray-400 hover:text-white transition-all p-2 rounded-lg hover:bg-white/5 
              ${!membersOpen ? "mx-auto" : ""}`}
            title={membersOpen ? "Collapse" : "Expand"}
          >
            {membersOpen ? <FiChevronLeft size={22} /> : <FiUsers size={22} />}
          </button>
        </div>

        {/* User List */}
        <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {users.map((u) => {
            const isMe = u === username;
            return (
              <div
                key={u}
                className={`flex items-center gap-3 p-2 rounded-xl cursor-default group transition-all
                  ${isMe ? "bg-blue-600/20 border border-blue-600/30" : "hover:bg-white/5"}`}
              >
                {/* Avatar / Status Dot */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-inner">
                    {u[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#111b21] rounded-full animate-pulse"></div>
                </div>

                {/* Name - Hidden when collapsed */}
                {membersOpen && (
                  <span className="truncate text-sm font-medium animate-fadeIn">
                    {u} {isMe && <span className="text-xs text-blue-400 opacity-70 ml-1">(You)</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#111b21]/50 backdrop-blur-md border-b border-white/5">
          <div>
            <h1 className="font-bold text-lg">Secure Channel</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">End-to-End Encrypted</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            Invite
          </button>
        </div>

        {/* MESSAGES - Focus on Spacing */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#0b141a]">
          {messages.map((msg, i) => {
            const isMe = msg.username === username;
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm transition-all
                    ${isMe
                      ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20"
                      : "bg-[#202c33] text-gray-200 rounded-tl-none border border-white/5"}`}
                >
                  {!isMe && <p className="text-[10px] text-blue-400 font-bold mb-1 uppercase tracking-tighter">{msg.username}</p>}
                  <p className="leading-relaxed">{msg.message}</p>
                  <p className="text-[9px] opacity-50 text-right mt-1">{msg.timestamp}</p>
                </div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
        </div>

        {/* INPUT BAR - Glassmorphism style */}
        <footer className="p-4 bg-[#111b21]/80 backdrop-blur-xl border-t border-white/5">
          {typingUser && (
             <div className="text-[10px] text-blue-400 animate-pulse mb-2 ml-4 italic">{typingUser} is typing...</div>
          )}
          <div className="flex items-center gap-3 bg-[#202c33] border border-white/5 px-4 py-2 rounded-2xl focus-within:border-blue-500/50 transition-all shadow-2xl">
            <button className="opacity-60 hover:opacity-100 transition-opacity">😊</button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Start the transmission..."
              className="flex-1 bg-transparent outline-none text-sm py-2"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 hover:bg-blue-500 p-2 rounded-xl transition-all active:scale-95"
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}