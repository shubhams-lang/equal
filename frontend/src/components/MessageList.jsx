import React, { useContext, useEffect, useRef } from "react";
import { ChatContext } from "../context/ChatContext";
import Message from "./Message";

export default function MessageList() {
  const { messages } = useContext(ChatContext);
  const bottomRef = useRef(null);

  // Smooth auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col min-h-full justify-end">
      {/* Empty State: Optional 
         If there are no messages, you can show a small hint 
      */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 opacity-20">
          <div className="w-12 h-12 border-2 border-dashed border-white rounded-full mb-4 animate-spin-slow" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Encrypted Logs</p>
        </div>
      )}

      {messages.map((msg, i) => {
        // --- Date Separator Logic ---
        // Check if this is the first message of a new day
        const showDateSeparator = i === 0 || 
          new Date(messages[i].timestamp).toDateString() !== 
          new Date(messages[i-1].timestamp).toDateString();

        return (
          <React.Fragment key={msg.id || i}>
            {/* Optional: Simple Date Separator */}
            {showDateSeparator && msg.timestamp && (
              <div className="flex justify-center my-6">
                <span className="text-[9px] font-black bg-white/5 px-3 py-1 rounded-full text-slate-500 uppercase tracking-widest border border-white/5">
                  {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
              {/* Pass the whole 'msg' object as a single prop */}
              <Message msg={msg} />
            </div>
          </React.Fragment>
        );
      })}

      {/* Anchor for Auto-Scroll */}
      <div ref={bottomRef} className="h-4 w-full shrink-0" />
    </div>
  );
}