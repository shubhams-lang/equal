import { useContext, useEffect, useRef } from "react";
import { ChatContext } from "../context/ChatContext";
import Message from "./Message";
import MessageInput from "./MessageInput";

export default function Chat() {
  const { messages, typingUser } = useContext(ChatContext);
  const bottomRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  return (
    <div className="flex-1 flex flex-col relative">

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scroll-smooth">

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No messages yet. Start the conversation.
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} {...msg} />
        ))}

        {/* Premium Typing Indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl w-fit border border-white/10 shadow-md">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-150" />
              <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-300" />
            </div>
            <span className="text-xs text-slate-300">
              {typingUser} is typing...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Elevated Input Bar */}
      <div className="backdrop-blur-xl bg-white/5 border-t border-white/10 p-5">
        <MessageInput />
      </div>

    </div>
  );
}