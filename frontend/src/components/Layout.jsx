import React, { useRef, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiDownload, FiPlusCircle } from "react-icons/fi";

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
  
  // PWA States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // 1. PWA Install Logic
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  // 2. Auto-scroll logic
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
      
      {/* MEMBERS PANEL (Collapsible) */}
      <div 
        className={`bg-[#111b21] border-r border-white/5 transition-all duration-300 ease-in-out
          ${membersOpen ? "w-full md:w-64 p-4" : "w-0 md:w-16 p-0 md:p-4"} 
          flex flex-col overflow-hidden relative z-20`}
      >
        <div className="flex items-center justify-between mb-6 min-w-[200px]">
          <h2 className={`font-bold text-lg transition-opacity ${membersOpen ? "opacity-100" : "opacity-0 md:hidden"}`}>
            Members
          </h2>
          <button
            onClick={() => setMembersOpen(!membersOpen)}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors"
          >
            {membersOpen ? <FiChevronLeft size={24} /> : <FiChevronRight size={24} />}
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-w-[200px]">
          {users.map((u) => (
            <div
              key={u}
              className={`flex items-center gap-3 p-2 rounded-xl transition-all
                ${u === username ? "bg-blue-600/20 ring-1 ring-blue-500/50" : "hover:bg-white/5"}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-sm shadow-lg">
                {u[0].toUpperCase()}
              </div>
              <span className="truncate font-medium">{u} {u === username && "(You)"}</span>
            </div>
          ))}
        </div>

        {/* PWA Install Button at Bottom of Sidebar */}
        {showInstallBtn && membersOpen && (
          <button 
            onClick={handleInstallClick}
            className="mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 p-3 rounded-xl text-sm font-bold transition-all animate-bounce"
          >
            <FiDownload /> Install App
          </button>
        )}
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 bg-[#111b21]/80 backdrop-blur-md border-b border-white/5 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Toggle (hidden on desktop) */}
            <button onClick={() => setMembersOpen(true)} className="md:hidden p-2 bg-white/5 rounded-lg">
              <FiChevronRight />
            </button>
            <h1 className="font-bold text-lg tracking-tight">Anonymous Room</h1>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-sm font-semibold shadow-lg transition-all active:scale-95">
            Invite
          </button>
        </header>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-6 bg-[#0b141a] custom-scrollbar">
          {messages.map((msg, i) => {
            const isMe = msg.username === username;
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] md:max-w-[70%] group`}>
                  {!isMe && <p className="text-[11px] text-blue-400 font-bold ml-4 mb-1 uppercase tracking-widest">{msg.username}</p>}
                  <div className={`px-4 py-3 shadow-xl ${isMe ? "bg-blue-600 text-white rounded-2xl rounded-tr-none" : "bg-[#202c33] text-gray-100 rounded-2xl rounded-tl-none"}`}>
                    <p className="leading-relaxed text-[15px]">{msg.message}</p>
                    <p className={`text-[10px] mt-1 opacity-60 text-right ${isMe ? "text-white" : "text-gray-400"}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {typingUser && (
            <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse ml-2">
              <div className="flex gap-1"><span className="w-1 h-1 bg-gray-500 rounded-full"></span><span className="w-1 h-1 bg-gray-500 rounded-full"></span></div>
              {typingUser} is typing...
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* FLOATING INPUT BAR */}
        <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-[#0b141a] via-[#0b141a] to-transparent">
          {/* Game Shortcuts (Inline Above Input) */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar py-1">
            {["🏓 Pong", "❌ Tic Tac Toe", "⚡ Tap Tap"].map((game, idx) => (
              <button 
                key={idx} 
                onClick={() => onGameSelect(game)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase hover:bg-blue-600 transition-all shadow-md"
              >
                {game}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-[#2a3942] p-2 rounded-[24px] shadow-2xl ring-1 ring-white/5 focus-within:ring-blue-500/50 transition-all">
            <button className="p-2 text-gray-400 hover:text-blue-400 transition-colors"><FiPlusCircle size={22} /></button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-transparent outline-none text-[15px] px-2"
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim()}
              className={`p-3 rounded-full transition-all shadow-lg ${text.trim() ? "bg-blue-600 hover:bg-blue-500 scale-100" : "bg-gray-600 scale-90 opacity-50"}`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}