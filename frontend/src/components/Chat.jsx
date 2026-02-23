import React, { useContext, useEffect, useRef } from "react";
import { ChatContext } from "../context/ChatContext";
import Message from "./Message";
import MessageInput from "./MessageInput";

export default function Chat() {
  const { messages, typingUser } = useContext(ChatContext);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0b141a]">
      
      {/* --- Messages Area --- */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 scroll-smooth custom-scrollbar">
        
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
            <div className="w-16 h-16 border-2 border-dashed border-slate-500 rounded-full mb-4 animate-spin-slow" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
              Secure Channel Established
            </p>
            <p className="text-[10px] mt-2 text-slate-500 uppercase tracking-widest">
              No logs detected. Start the transmission.
            </p>
          </div>
        )}

        {/* Message Mapping */}
        {messages.map((msg, i) => (
          <div 
            key={msg.id || i} 
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
          >
            {/* We pass 'msg' as a single object prop for multimedia support */}
            <Message msg={msg} />
          </div>
        ))}

        {/* Premium Typing Indicator */}
        {typingUser && (
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl w-fit border border-white/10 shadow-xl animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-bounce" />
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {typingUser} is typing...
            </span>
          </div>
        )}

        {/* Anchor for Auto-scroll */}
        <div ref={bottomRef} className="h-2 w-full" />
      </div>

      {/* --- Elevated Input Bar --- */}
      <div className="backdrop-blur-xl bg-[#202c33]/80 border-t border-white/5 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <MessageInput />
      </div>

    </div>
  );
}