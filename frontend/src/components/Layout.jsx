import React, { useRef, useEffect, useState } from "react";
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiDownload, 
  FiPlusCircle, 
  FiUsers, 
  FiShield, 
  FiSend, 
  FiSmile,
  FiMoreVertical,
  FiTarget
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
  const [text, setText] = useState("");
  const [membersOpen, setMembersOpen] = useState(true);
  
  // PWA States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

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
      
      {/* MOBILE OVERLAY */}
      {membersOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setMembersOpen(false)}
        />
      )}

      {/* MEMBERS PANEL */}
      <aside
        className={`bg-[#111b21] border-r border-white/5 transition-all duration-500 ease-in-out flex-shrink-0 relative z-40 h-full flex flex-col
        ${membersOpen ? "w-72" : "w-0 md:w-20 overflow-hidden"}`}
      >
        <div className="p-4 flex flex-col h-full min-w-[280px] md:min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className={`font-black text-[10px] uppercase tracking-[0.3em] text-blue-500 transition-opacity ${!membersOpen && "md:opacity-0"}`}>
              Active Nodes
            </h2>
            <button 
              onClick={() => setMembersOpen(false)}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-500 md:hidden"
            >
              <FiChevronLeft size={20} />
            </button>
          </div>

          {/* User List */}
          <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
            {users.map((u, i) => (
              <div key={i} className="flex items-center gap-4 group px-2">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-900/40 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                    {u.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#111b21] rounded-full shadow-lg" />
                </div>
                
                <div className={`flex flex-col min-w-0 transition-all duration-300 ${!membersOpen && "md:opacity-0 md:translate-x-4"}`}>
                  <span className="truncate font-bold text-sm text-gray-200">
                    {u} {u === username && <span className="text-[10px] text-blue-500 ml-1">★</span>}
                  </span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-tighter font-black">Link Established</span>
                </div>
              </div>
            ))}
          </div>

          {/* Install Button */}
          {showInstallBtn && membersOpen && (
            <button
              onClick={handleInstallClick}
              className="mt-4 flex items-center justify-center gap-2 bg-blue-600/10 border border-blue-600/20 hover:bg-blue-600 hover:text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <FiDownload /> Install Node
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* TOP BAR */}
        <header className="h-16 flex items-center justify-between px-6 bg-[#111b21]/60 backdrop-blur-md border-b border-white/5 z-20">
          <div className="flex items-center gap-4">
            {!membersOpen && (
              <button 
                onClick={() => setMembersOpen(true)} 
                className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all"
              >
                <FiUsers size={18} />
              </button>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <FiShield className="text-blue-500 text-xs" />
                <h1 className="font-black text-[11px] uppercase tracking-[0.4em] text-white">Secure_Channel.exe</h1>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">End-to-End Encrypted</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex -space-x-2">
                {users.slice(0, 3).map((u, i) => (
                   <div key={i} className="w-7 h-7 rounded-full border-2 border-[#111b21] bg-gray-800 flex items-center justify-center text-[10px] font-bold">
                      {u[0].toUpperCase()}
                   </div>
                ))}
             </div>
             <button className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20">
               Invite
             </button>
          </div>
        </header>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 custom-scrollbar relative">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
              <div className="relative mb-6">
                <FiShield size={64} className="text-blue-500" />
                <div className="absolute inset-0 blur-2xl bg-blue-500/20" />
              </div>
              <p className="uppercase tracking-[0.8em] text-[10px] font-black text-blue-400">Initializing Uplink...</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.username === username;
              return (
                <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} group animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && (
                      <span className="text-[10px] text-blue-400 font-black ml-1 mb-1.5 uppercase tracking-widest">
                        {msg.username}
                      </span>
                    )}
                    <div className={`relative px-4 py-3 shadow-xl transition-all ${
                      isMe 
                        ? "bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-blue-600/10 border border-blue-400/20" 
                        : "bg-[#1c2733] text-gray-100 rounded-2xl rounded-tl-none border border-white/5"
                    }`}>
                      <p className="leading-relaxed text-[14px] font-medium">{msg.message}</p>
                      <div className={`flex items-center gap-2 mt-2 opacity-50 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className="text-[8px] font-bold uppercase tracking-tighter">
                          {msg.timestamp || "Active"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {typingUser && (
            <div className="flex items-center gap-3 py-2 px-4 bg-blue-500/5 rounded-full w-fit border border-blue-500/10 animate-pulse">
               <div className="flex gap-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
               </div>
               <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{typingUser} encoding...</span>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* INPUT AREA */}
        <footer className="p-4 md:p-6 bg-[#0b141a]">
          <div className="max-w-5xl mx-auto flex flex-col gap-4">
            
            {/* Quick Actions */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {["🏓 Pong", "❌ Tic Tac Toe", "⚡ Tap Tap", "🧩 Slider"].map((game, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onGameSelect(game)}
                  className="flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl bg-[#111b21] border border-white/5 text-[9px] font-black uppercase tracking-[0.2em] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all active:scale-95"
                >
                  <FiTarget className="text-blue-500" /> {game}
                </button>
              ))}
            </div>

            {/* Main Input Bar */}
            <div className="flex items-center gap-3 bg-[#1c2733] p-2 rounded-[24px] border border-white/5 focus-within:border-blue-500/30 focus-within:shadow-[0_0_30px_rgba(37,99,235,0.05)] transition-all">
              <button className="p-3 text-gray-500 hover:text-blue-400 transition-colors">
                <FiPlusCircle size={22} />
              </button>
              
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Secure transmission..."
                className="flex-1 bg-transparent outline-none text-[15px] px-2 text-gray-100 placeholder:text-gray-600 placeholder:font-bold placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
              />
              
              <div className="flex items-center pr-1">
                <button className="p-3 text-gray-500 hover:text-yellow-500 transition-colors">
                  <FiSmile size={20} />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!text.trim()}
                  className={`p-3.5 rounded-2xl transition-all duration-500 ${
                    text.trim() 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 translate-y-0 opacity-100" 
                      : "bg-gray-800 text-gray-600 opacity-50 translate-y-1"
                  }`}
                >
                  <FiSend size={18} className={text.trim() ? "translate-x-0.5" : ""} />
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}