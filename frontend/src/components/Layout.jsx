import React, { useRef, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

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

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#0b141a] text-white font-sans">
      
      {/* MEMBERS PANEL */}
      <div className={`bg-[#111b21] border-r border-white/5 transition-all duration-300
        ${membersOpen ? "w-56 p-4" : "w-12 p-0"} flex flex-col overflow-hidden`}
      >
        <div className="flex items-center justify-between mb-4">
          {membersOpen && <h2 className="font-bold text-lg">Members</h2>}
          <button
            onClick={() => setMembersOpen(!membersOpen)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {membersOpen ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          {users.map((u) => {
            const isMe = u === username;
            return (
              <div
                key={u}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-default
                  ${isMe ? "bg-blue-600/30" : "hover:bg-white/5 transition-colors"}`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
                  {u[0]}
                </div>
                {membersOpen && <span className="truncate">{u}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#111b21] border-b border-white/5">
          <h1 className="font-bold text-lg">Anonymous Chat Room</h1>
          <div className="flex gap-3">
            <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm shadow-lg">Invite</button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent bg-[#0b141a]">
          {messages.map((msg, i) => {
            const isMe = msg.username === username;
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-lg
                    ${isMe
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-[#202c33] text-gray-200 rounded-bl-md"}
                    animate-[fadeIn_.25s_ease]`}
                >
                  {!isMe && (
                    <p className="text-xs text-blue-400 font-semibold mb-1">
                      {msg.username}
                    </p>
                  )}
                  <p>{msg.message}</p>
                  <p className="text-[10px] text-gray-400 text-right mt-1">
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}
          {typingUser && (
            <div className="text-xs text-gray-400 italic">{typingUser} typing...</div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* INPUT BAR */}
        <div className="px-6 py-4 bg-[#111b21] border-t border-white/5">
          <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3 rounded-full shadow-inner">
            <button className="text-gray-400 hover:text-white">😊</button>
            <button className="text-gray-400 hover:text-white">📷</button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent outline-none text-sm text-white"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full text-sm shadow-lg"
            >
              Send
            </button>
          </div>
        </div>

        {/* GAME PANEL */}
        <div className="flex gap-3 px-6 py-3 bg-[#0b141a] border-t border-white/5 overflow-x-auto">
          {["🏓 Pong","❌ Tic Tac Toe","⚡ Tap Tap","🏎 Slider Race","🔤 Word Scramble"].map((game, idx) => (
            <button
              key={idx}
              onClick={() => onGameSelect(game)}
              className="px-4 py-2 rounded-full bg-white/5 text-xs font-black tracking-widest uppercase text-white/70 hover:bg-blue-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-lg"
            >
              {game}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}