import React, { useRef, useEffect, useState } from "react";
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiDownload, 
  FiPlusCircle, 
  FiUsers, 
  FiShield, 
  FiSend, 
  FiSmile 
} from "react-icons/fi";

export default function ChatLayout({
  messages,
  username,
  users,
  typingUser,
  onSend,
  onGameSelect,
}) {
  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
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
  }, [messages, typingUser]);

  const sendMessage = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="h-screen flex bg-[#0b141a] text-white font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* MOBILE OVERLAY: Closes sidebar when tapping chat area on mobile */}
      {membersOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity animate-in"
          onClick={() => setMembersOpen(false)}
        />
      )}

      {/* MEMBERS PANEL */}
     <aside
  className={`bg-[#111b21] border-r border-white/5 transition-all duration-300 ease-in-out flex-shrink-0 relative z-40 h-full overflow-hidden
  ${membersOpen ? "w-72" : "w-16 md:w-16 sm:w-16"}`}
>

  {/* Toggle Button */}
  <button
    onClick={() => setMembersOpen(!membersOpen)}
    className="absolute right-2 top-4 z-50 p-2 rounded-xl bg-white/5 hover:bg-blue-600/20
    text-gray-400 hover:text-blue-400 transition-all"
  >
    {membersOpen ? (
      <FiChevronLeft size={20} />
    ) : (
      <FiUsers size={20} className="text-blue-500" />
    )}
  </button>

  {/* Content */}
  <div className="h-full flex flex-col p-4">

    {/* Header */}
    <div className="flex items-center justify-between mb-8">
      <h2
        className={`font-black text-[10px] uppercase tracking-[0.2em] text-blue-500 transition-opacity duration-200
        ${membersOpen ? "opacity-100" : "opacity-0"}`}
      >
        Participants
      </h2>
    </div>

    {/* Users */}
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">

      {users.map((u) => (
        <div
          key={u}
          className={`flex items-center gap-4 group cursor-pointer transition-all
          ${membersOpen ? "opacity-100" : "opacity-0"}`}
        >

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1e293b] to-[#334155]
            flex items-center justify-center font-bold text-blue-400 border border-white/5 shadow-lg">

              {u[0].toUpperCase()}

            </div>

            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500
            border-2 border-[#111b21] rounded-full"/>
          </div>

          {/* User Info */}
          <div
            className={`flex flex-col min-w-0 transition-opacity duration-200
            ${membersOpen ? "opacity-100" : "opacity-0"}`}
          >

            <span className="truncate font-bold text-sm text-gray-200">
              {u}
              {u === username && (
                <span className="text-[10px] text-blue-500 ml-1">YOU</span>
              )}
            </span>

            <span className="text-[10px] text-gray-500 uppercase">
              Connected
            </span>

          </div>

        </div>
      ))}

    </div>

    {/* Install Button */}
    {showInstallBtn && membersOpen && (
      <button
        onClick={handleInstallClick}
        className="mt-4 flex items-center justify-center gap-2
        bg-blue-600 hover:bg-blue-500 p-3.5 rounded-2xl
        text-[11px] font-black uppercase tracking-widest"
      >
        <FiDownload />
        Install App
      </button>
    )}

  </div>

</aside>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* HEADER */}
        <header className="h-16 flex items-center justify-between px-6 bg-[#111b21]/40 backdrop-blur-xl border-b border-white/5 z-20">
          <div className="flex items-center gap-4">
            {!membersOpen && (
              <button 
                onClick={() => setMembersOpen(true)} 
                className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all md:hidden"
              >
                <FiUsers size={18} />
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="font-black text-xs uppercase tracking-[0.3em] text-white">Secure Transmission</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Link Active</span>
              </div>
            </div>
          </div>
          
          <button className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all active:scale-95">
            Invite
          </button>
        </header>

        {/* MESSAGES AREA */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_center,_#111b21_0%,_#0b141a_100%)]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center animate-in">
              <FiShield size={48} className="mb-4 text-blue-500" />
              <p className="uppercase tracking-[0.5em] text-[10px] font-black">Waiting for Uplink...</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.username === username;
              return (
                <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in`}>
                  <div className={`max-w-[85%] md:max-w-[70%]`}>
                    {!isMe && <p className="text-[10px] text-blue-500 font-black ml-4 mb-1.5 uppercase tracking-widest">{msg.username}</p>}
                    <div className={`px-4 py-3 shadow-2xl ${
                      isMe 
                        ? "bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-blue-600/10" 
                        : "bg-[#202c33] text-gray-100 rounded-2xl rounded-tl-none border border-white/5"
                    }`}>
                      <p className="leading-relaxed text-[15px]">{msg.message}</p>
                      <p className={`text-[9px] mt-2 font-bold opacity-40 text-right ${isMe ? "text-white" : "text-gray-400"}`}>
                        {msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {typingUser && (
            <div className="flex items-center gap-3 py-2 px-4 bg-white/5 rounded-full w-fit animate-pulse ml-2 border border-white/5">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              </div>
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{typingUser} typing...</span>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* INPUT FOOTER */}
        <footer className="p-6 bg-gradient-to-t from-[#0b141a] via-[#0b141a] to-transparent">
          <div className="max-w-4xl mx-auto">
            {/* Game Shortcuts */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1 pr-4">
              {["🏓 Pong", "❌ Tic Tac Toe", "⚡ Tap Tap", "🧩 Slider Race"].map((game, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onGameSelect(game)}
                  className="whitespace-nowrap px-4 py-2 rounded-xl bg-[#111b21] border border-white/5 text-[9px] font-black uppercase tracking-widest hover:border-blue-500/50 hover:text-blue-400 transition-all shadow-xl"
                >
                  {game}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-3 bg-[#1c2733]/90 backdrop-blur-xl p-2 rounded-[22px] shadow-2xl border border-white/10 focus-within:border-blue-500/40 transition-all">
              <button className="p-3 text-gray-500 hover:text-blue-400 transition-colors"><FiPlusCircle size={22} /></button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent outline-none text-[15px] px-2 text-gray-100 placeholder:text-gray-600"
              />
              <button className="p-3 text-gray-500 hover:text-yellow-500 transition-colors"><FiSmile size={22} /></button>
              <button
                onClick={sendMessage}
                disabled={!text.trim()}
                className={`p-3.5 rounded-2xl transition-all duration-300 ${
                  text.trim() 
                    ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] rotate-0 scale-100" 
                    : "bg-gray-800 text-gray-600 opacity-40 -rotate-12 scale-90"
                }`}
              >
                <FiSend size={18} className={text.trim() ? "translate-x-0.5" : ""} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}