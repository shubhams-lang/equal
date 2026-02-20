import React, { useContext, useState } from "react";
import { ChatContext } from "../context/ChatContext";

export default function MessageInput() {
  const { socket, inviteCode, username } = useContext(ChatContext);
  const [text, setText] = useState("");

  const sendMessage = () => {
    if (!text || !inviteCode) return;

    socket.emit("sendMessage", {
      inviteCode,
      message: text,
      username
    });

    setText("");
  };

  return (
    <div className="p-4 border-t border-slate-800 flex gap-2">
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          socket.emit("typing", { inviteCode, username });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") sendMessage();
        }}
        className="flex-1 p-3 bg-slate-900 rounded outline-none"
        placeholder="Type a message..."
      />

      <button
        onClick={sendMessage}
        className="bg-indigo-500 hover:bg-indigo-600 px-4 rounded transition"
      >
        Send
      </button>
    </div>
  );
}
