import React, { useContext, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { ChatContext } from "../context/ChatContext";
import Message from "./Message";
import MessageInput from "./MessageInput";

export default function Chat() {
  const { messages, typingUser } = useContext(ChatContext);
  const bottomRef = useRef(null);

  // Auto-scroll when messages or typing changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  return (
    <>
      {/* SEO META TAGS */}
      <Helmet>
        <title>Anonymous Chat Room – Talk Privately Online</title>

        <meta
          name="description"
          content="Join a free anonymous chat room. Talk to strangers privately without registration. Secure real-time messaging with no logs."
        />

        <meta
          name="keywords"
          content="anonymous chat, anonymous chat room, chat with strangers, private chat online, anonymous messaging"
        />

        <link rel="canonical" href="https://ekpyrotic.vercel.app/chat" />

        {/* OpenGraph */}
        <meta property="og:title" content="Anonymous Chat Room" />
        <meta
          property="og:description"
          content="Secure anonymous chat with strangers. No signup required."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ekpyrotic.vercel.app/chat" />
      </Helmet>

      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0b141a]">
        
        {/* Messages Container */}
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

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            >
              <Message msg={msg} />
            </div>
          ))}

          {/* Typing Indicator */}
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

          {/* Scroll Anchor */}
          <div ref={bottomRef} className="h-2 w-full" />
        </div>

        {/* Message Input */}
        <div className="backdrop-blur-xl bg-[#202c33]/80 border-t border-white/5 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
          <MessageInput />
        </div>

      </div>
    </>
  );
}