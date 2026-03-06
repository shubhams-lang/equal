import React, { useRef, useEffect, useState, useContext } from "react";
import { 
  FiSend, 
  FiPlus, 
  FiSmile, 
  FiChevronDown, 
  FiGamepad, 
  FiX, 
  FiCheck 
} from "react-icons/fi";
import { ChatContext } from "../context/ChatContext";
import Message from "./Message";

export default function Chat({ onReact }) {
  const { 
    messages, 
    sendMessage, 
    typingUser, 
    activeGameRequest, // From Context: { gameId, sender }
    acceptGameRequest, 
    declineGameRequest 
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
        <div className="absolute top-4 left-4 right-4 z-[60] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-[#1c2733]/90 backdrop-blur-2xl border border-blue-500/30 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                <FiGamepad size={24} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Incoming Challenge</h4>
                <p className="text-sm font-bold text-white">
                  {activeGameRequest.sender} wants to play <span className="text-blue-400">{activeGameRequest.gameId}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={declineGameRequest}
                className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
              >
                <FiX size={20} />
              </button>
              <button 
                onClick={acceptGameRequest}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
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
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-2 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-10">
            <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-4 text-white">
              <FiSend size={30} />
            </div>
            <p className="uppercase tracking-[0.4em] text-[9px] font-black text-white">Secure Link Established</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Message 
              key={msg.id || i} 
              msg={msg} 
              onReact={onReact} 
            />
          ))
        )}
        
        {/* Typing Indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 text-[10px] text-blue-400/60 font-bold uppercase tracking-widest animate-pulse ml-2 mb-8">
             <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
            {typingUser} typing...
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      {/* --- FLOATING SCROLL BUTTON --- */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 md:right-10 p-3 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-500 hover:scale-110 transition-all animate-in fade-in zoom-in z-50 border border-white/10 group"
        >
          <div className="relative">
            <FiChevronDown size={22} className="group-hover:translate-y-0.5 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-600 animate-pulse"></span>
          </div>
        </button>
      )}

      {/* --- INPUT FOOTER --- */}
      <footer className="p-4 bg-gradient-to-t from-[#0b141a] via-[#0b141a]/90 to-transparent pt-10">
        <div className="max-w-4xl mx-auto flex items-center gap-2 bg-[#202c33]/80 backdrop-blur-md border border-white/5 p-2 rounded-[22px] shadow-2xl focus-within:border-blue-500/50 transition-all">
          
          <button className="p-3 text-slate-400 hover:text-blue-400 transition-colors hidden sm:block">
            <FiPlus size={20} />
          </button>
          
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-[15px] px-2 text-slate-100 placeholder:text-slate-500 font-medium"
          />

          <button className="p-3 text-slate-400 hover:text-yellow-500 transition-colors">
            <FiSmile size={20} />
          </button>

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`p-3.5 rounded-[18px] transition-all duration-500 ${
              text.trim() 
                ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-100 rotate-0" 
                : "bg-slate-700/50 text-slate-500 scale-90 -rotate-12 opacity-50"
            }`}
          >
            <FiSend size={18} className={text.trim() ? "translate-x-0.5" : ""} />
          </button>
        </div>
      </footer>
    </div>
  );
}