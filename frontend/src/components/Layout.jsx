import React, { useRef, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiDownload, FiPlusCircle, FiUsers } from "react-icons/fi";

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
  const [membersOpen, setMembersOpen] = useState(false); // Closed by default for cleaner start
  
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
  }, [messages, typingUser]);

  const sendMessage = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="h-screen flex bg-[#0b141a] text-white font-sans overflow-hidden relative">
      
      {/* MOBILE OVERLAY */}
      {membersOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setMembersOpen(false)}
        />
      )}

      {/* MEMBERS PANEL */}
      <aside 
        className={`bg-[#111b21] border-r border-white/5 transition-all duration-300 ease-in-out flex-shrink-0
          ${membersOpen ? "w-[280px]" : "w-0 md:w-[72px]"} 
          flex flex-col overflow-hidden relative z-40 h-full`}
      >
        <div className="p-4 flex flex-col h-full min-w-[280px]">
          {/* Header inside Panel */}
          <div className="flex items-center justify-between mb-8">
            <h2 className={`font-black text-xs uppercase tracking-[0.2em] text-blue-400 transition-opacity duration-200 ${membersOpen ? "opacity-100" : "opacity-0"}`}>
              Online Users
            </h2>
            <button
              onClick={() => setMembersOpen(!membersOpen)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-600/20 text-gray-400 hover:text-blue-400 transition-all hidden md:block"
            >
              {membersOpen ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
            </button>
          </div>

          {/* Users List */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
            {users.map((u) => (
              <div
                key={u}
                className={`flex items-center gap-4 group cursor-pointer transition-all
                  ${membersOpen ? "p-2 rounded-2xl hover:bg-white/5" : "justify-center"}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1e293b] to-[#334155] flex items-center justify-center font-bold text-blue-400 border border-white/5 shadow-lg group-hover:border-blue-500/50 transition-colors">
                    {u[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#111b21] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                </div>
                
                {membersOpen && (
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-bold text-sm text-gray-200 group-hover:text-white transition-colors">
                      {u} {u === username && <span className="text-[10px] text-blue-500 ml-1">(You)</span>}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">Active Now</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* PWA Install Button */}
          {showInstallBtn && membersOpen && (
            <button 
              onClick={handleInstallClick}
              className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 p-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
            >
              <FiDownload /> Install App
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* HEADER */}
        <header className="h-20 flex items-center justify-between px-6 bg-[#111b21]/40 backdrop-blur-xl border-b border-white/5 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMembersOpen(true)} 
              className={`p-2.5 bg-white/5 hover:bg-blue-600/20 text-blue-400 rounded-xl transition-all ${membersOpen ? 'md:hidden' : 'flex'}`}
            >
              <FiUsers size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className="font-black text-sm uppercase tracking-widest text-white">Secure Channel</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Encrypted Connection</span>
              </div>
            </div>
          </div>
          
          <button className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95">
            Invite
          </button>
        </header>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-6 custom-scrollbar scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-4">
                <FiUsers size={32} />
              </div>
              <p className="uppercase tracking-[0.4em] text-[10px] font-black">Waiting for transmission</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.username === username;
              return (
                <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
                  <div className={`max-w-[85%] md:max-w-[65%]`}>
                    {!isMe && <p className="text-[10px] text-blue-500 font-black ml-4 mb-1.5 uppercase tracking-widest">{msg.username}</p>}
                    <div className={`px-4 py-3 shadow-2xl transition-all ${
                      isMe 
                        ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl rounded-tr-none shadow-blue-500/10" 
                        : "bg-[#202c33] text-gray-100 rounded-2xl rounded-tl-none border border-white/5"
                    }`}>
                      <p className="leading-relaxed text-[15px] font-medium tracking-tight break-words">{msg.message}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-2 opacity-40">
                        <span className="text-[9px] font-bold">{msg.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {typingUser && (
            <div className="flex items-center gap-3 py-2 px-4 bg-white/5 rounded-full w-fit animate-pulse ml-2">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              </div>
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{typingUser} is typing...</span>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-6 bg-gradient-to-t from-[#0b141a] to-transparent">
          <div className="max-w-4xl mx-auto">
            {/* Game Shortcuts */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
              {["🏓 Pong", "❌ Tic Tac Toe", "⚡ Tap Tap"].map((game, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onGameSelect(game)}
                  className="whitespace-nowrap px-4 py-2 rounded-xl bg-[#111b21] border border-white/5 text-[10px] font-black uppercase tracking-widest hover:border-blue-500/50 hover:text-blue-400 transition-all shadow-xl"
                >
                  {game}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-[#1c2733]/80 backdrop-blur-xl p-2 rounded-[22px] shadow-2xl border border-white/10 focus-within:border-blue-500/50 transition-all">
              <button className="p-3 text-gray-500 hover:text-blue-400 transition-colors"><FiPlusCircle size={22} /></button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Secure transmission..."
                className="flex-1 bg-transparent outline-none text-[15px] px-2 text-gray-100 placeholder:text-gray-600"
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim()}
                className={`p-4 rounded-full transition-all duration-300 ${
                  text.trim() 
                    ? "bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                    : "bg-gray-800 opacity-40 grayscale"
                }`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={text.trim() ? "translate-x-0.5" : ""}><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}