import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";
import Message from "./Message";

export default function MessageList() {
  const { messages } = useContext(ChatContext);

  return (
    <>
      {messages.map((msg, i) => (
        <div key={i} className="group px-6 py-3 hover:bg-slate-900/40 transition rounded">
          <Message
            username={msg.username}
            message={msg.message}
            system={msg.system}
          />
        </div>
      ))}
    </>
  );
}
