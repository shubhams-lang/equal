import React, { useRef, useEffect, useState, useContext } from "react";
import { 
  FiSend, 
  FiPlus, 
  FiSmile, 
  FiChevronDown, 
  FiX, 
  FiCheck,
  FiShield
} from "react-icons/fi";
import { GiGamepad } from "react-icons/gi";
import { ChatContext } from "../context/ChatContext";
import Message from "./Message";

export default function Chat() {
  const { 
    messages, 
    sendMessage, 
    typingUser, 
    activeGameRequest, 
    acceptGameRequest, 
    declineGameRequest,
    handleReaction // Destructured from context
  } = useContext(ChatContext);

  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  
  const [text, setText] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // --- SCROLL LOGIC ---
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Show button if user is > 300px from bottom
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when new messages arrive, unless user is looking at history
  useEffect(() => {
    if (!showScrollBtn) {
      scrollToBottom();
    }
  }, [messages, typingUser]);

  // --- HANDLERS ---
  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
    // Forced scroll on manual send
    setTimeout(scrollToBottom, 50);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
      
      {/* --- GAME REQUEST OVERLAY --- */}
      {activeGameRequest && (
        <div className="absolute top-4 left-4 right-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-[#1c2733]/90 backdrop-blur-2xl border border-blue-500/30 p-4 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                <GiGamepad size={20}  className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/80">Incoming Challenge</h4>
                <p className="text-sm font-bold text-white">
                  {activeGameRequest.sender} <span className="text-slate-400 font-medium text-xs uppercase tracking-tighter">invites you to</span> <span className="text-blue-400">{activeGameRequest.gameId}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={declineGameRequest}
                className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 active:scale-95"
              >
                <FiX size={20} />
              </button>
              <button 
                onClick={acceptGameRequest}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-95"
              >
                <FiCheck size={16} /> Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MESSAGES LIST --- */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-2 custom-scrollbar bg-[radial-gradient(circle_at_center,_#111b21_0%,_#0b141a_100%)]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-1000">
            <div className="relative mb-6">
              <div className="w-24 h-24 border-2 border-dashed border-blue-500/20 rounded-full flex items-center justify-center text-blue-500/30">
                <FiShield size={40} className="animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0b141a] shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
            </div>
            <h3 className="uppercase tracking-[0.5em] text-[11px] font-black text-white/40 mb-2">Secure Link Established</h3>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No logs detected. Start the transmission.</p>
          </div>
        ) : (
          <div className="flex flex-col min-h-full justify-end">
            {messages.map((msg, i) => (
              <Message 
                key={msg.id || i} 
                msg={msg} 
              />
            ))}
          </div>
        )}
        
        {/* Typing Indicator Bubble */}
        {typingUser && (
          <div className="flex items-center gap-3 py-2 px-4 bg-[#202c33]/40 backdrop-blur-sm rounded-2xl w-fit border border-white/5 animate-in slide-in-from-left-4 duration-300 mb-4 ml-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
            </div>
            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{typingUser} is typing...</span>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      {/* --- FLOATING SCROLL BUTTON --- */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 right-8 p-3.5 bg-blue-600 text-white rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:scale-110 transition-all animate-in fade-in slide-in-from-bottom-4 z-50 group border border-blue-400/20"
        >
          <div className="relative">
            <FiChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-blue-600 animate-pulse" />
          </div>
        </button>
      )}

      {/* --- INPUT FOOTER --- */}
      <footer className="p-6 bg-gradient-to-t from-[#0b141a] via-[#0b141a]/95 to-transparent pt-12">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-[#202c33]/90 backdrop-blur-xl border border-white/10 p-2 rounded-[24px] shadow-2xl focus-within:border-blue-500/40 transition-all group/input">
          
          <button className="p-3 text-slate-400 hover:text-blue-400 transition-all hover:bg-white/5 rounded-full">
            <FiPlus size={22} />
          </button>
          
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-[15px] px-2 text-slate-100 placeholder:text-slate-500 font-medium"
          />

          <button className="p-3 text-slate-400 hover:text-yellow-500 transition-all hover:bg-white/5 rounded-full">
            <FiSmile size={22} />
          </button>

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`p-4 rounded-[20px] transition-all duration-500 flex items-center justify-center ${
              text.trim() 
                ? "bg-blue-600 text-white shadow-[0_0_25px_rgba(37,99,235,0.5)] scale-100 rotate-0" 
                : "bg-slate-800 text-slate-600 scale-90 opacity-40 cursor-not-allowed"
            }`}
          >
            <FiSend size={20} className={text.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
          </button>
        </div>
      </footer>
    </div>
  );
}