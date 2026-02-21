import React, { useContext, useEffect, useRef } from "react";
import { ChatContext } from "../context/ChatContext";
import Message from "./Message";

export default function MessageList() {
  const { messages } = useContext(ChatContext);
  const bottomRef = useRef(null);

  // Smooth auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col space-y-6">

      {messages.map((msg, i) => (
        <div
          key={i}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <Message
            username={msg.username}
            message={msg.message}
            system={msg.system}
            timestamp={msg.timestamp}
          />
        </div>
      ))}

      <div ref={bottomRef} />

    </div>
  );
}