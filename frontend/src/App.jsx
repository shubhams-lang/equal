import React, { useContext, useState, useEffect, useRef } from "react";
import { ChatContext } from "./context/ChatContext";

// ---- GAME IMPORTS ----
import Pong from "./components/Games/Pong";
import SliderRace from "./components/Games/SlideRace";
import TapTap from "./components/Games/TapTap";
import TicTacToe from "./components/Games/TicTacToe";
import WordScramble from "./components/Games/WordScramble";

function App() {
  const {
    messages,
    roomId,
    setRoomId,
    users,
    username, // Context's version of the identity
    typingUser,
    activeGame,
    scores,
    updateScore,
    sendGameRequest,
    closeGame,
    joinRoom,
    sendMessage, // Use the context version!
    handleTyping, // Added for real-time feedback
  } = useContext(ChatContext);

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [avatar, setAvatar] = useState(localStorage.getItem("avatar") || "🐱");

  const scrollRef = useRef(null);
  const API_URL = "https://equal.onrender.com";

  const AVATARS = ["🐱", "🐶", "🦊", "🤖", "👻", "👽", "👾", "🥷", "🧙", "🦁"];

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      setRoomId(code);
      setView("setup");
    }
  }, [setRoomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]); // Added typingUser to auto-scroll

  const handleGenerateRoom = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/create-room`, { method: "POST" });
      const data = await res.json();
      if (data.roomId) {
        setRoomId(data.roomId);
        window.history.pushState({}, "", `?join=${data.roomId}`);
        setView("setup");
      }
    } catch (err) {
      alert("Server error. Please try again.");
    }
    setIsLoading(false);
  };

  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Please enter a nickname!");
    localStorage.setItem("nickname", nickname);
    localStorage.setItem("avatar", avatar);
    if (roomId && joinRoom) {
      joinRoom(roomId, `${avatar} ${nickname}`);
      setView("chat");
    }
  };

  const handleSendMessage = () => {
    if (!msgInput.trim()) return;
    sendMessage(msgInput); // This calls the context function which adds to local state
    setMsgInput("");
  };

  const renderGame = () => {
    const game = GAMES.find((g) => g.id === activeGame);
    if (!game) return null;
    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 bg-[#202c33]">
          <h2 className="font-bold">{game.name}</h2>
          <button onClick={closeGame} className="bg-red-500 px-4 py-2 rounded-lg font-bold">EXIT</button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <SelectedGame
            roomId={roomId}
            username={`${avatar} ${nickname}`}
            updateScore={updateScore}
            scores={scores}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#111b21] text-white flex flex-col font-sans overflow-hidden">
      
      {/* LANDING VIEW */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-6xl font-black mb-2 text-[#25D366] tracking-tighter">EQUAL</h1>
          <p className="text-gray-500 mb-10 uppercase tracking-widest text-xs font-bold">Private rooms & Mini-games</p>
          <button
            onClick={handleGenerateRoom}
            disabled={isLoading}
            className="w-full max-w-xs bg-[#25D366] text-black font-black py-5 rounded-2xl mb-4 transition-transform active:scale-95 shadow-lg shadow-[#25D366]/20"
          >
            {isLoading ? "LOADING..." : "CREATE ROOM"}
          </button>
          <div className="flex gap-2 w-full max-w-xs">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Enter Code"
              className="flex-1 bg-[#202c33] p-3 rounded-xl outline-none border border-transparent focus:border-[#25D366]/50"
            />
            <button onClick={() => { setRoomId(roomInput); setView("setup"); }} className="bg-gray-700 px-6 rounded-xl font-bold hover:bg-gray-600 transition-colors">JOIN</button>
          </div>
        </div>
      )}

      {/* SETUP VIEW */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#202c33] p-8 rounded-[2.5rem] w-full max-w-md border border-gray-800 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-center">CHOOSE IDENTITY</h2>
            <div className="flex justify-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {AVATARS.map(a => (
                <button 
                  key={a} onClick={() => setAvatar(a)}
                  className={`text-xl p-3 rounded-xl transition-all ${avatar === a ? 'bg-[#25D366] scale-110' : 'bg-[#111b21] grayscale opacity-50'}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              className="w-full bg-[#111b21] text-xl font-bold text-center p-4 rounded-xl mb-6 outline-none border border-transparent focus:border-[#25D366]"
            />
            <button onClick={handleEnterChat} className="w-full bg-[#25D366] text-black font-black py-4 rounded-xl text-lg transition-transform active:scale-95 shadow-xl shadow-[#25D366]/10">
              ENTER CHAT
            </button>
          </div>
        </div>
      )}

      {/* CHAT VIEW */}
      {view === "chat" && (
        <div className="flex h-full relative">
          <div className="flex-1 flex flex-col">
            <header className="bg-[#202c33] p-4 flex justify-between items-center border-b border-gray-800 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl bg-[#111b21] p-2 rounded-full">{avatar}</span>
                <div>
                    <h2 className="font-bold text-[#25D366] leading-none">{nickname}</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Room: {roomId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowMembers(!showMembers)} className="bg-gray-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-600 transition-colors">
                  👥 {users?.length || 1}
                </button>
                <button onClick={() => window.location.href = "/"} className="bg-red-500/10 text-red-500 text-xs px-3 py-1 rounded-lg font-bold border border-red-500/20">EXIT</button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.type === "system" ? (
                    <div className="flex justify-center my-4">
                      <span className="bg-[#202c33]/50 text-gray-500 text-[9px] px-3 py-1 rounded-full uppercase tracking-widest font-black">
                        {msg.message}
                      </span>
                    </div>
                  ) : (
                    <div className={`flex ${msg.username.includes(nickname) ? "justify-end" : "justify-start"}`}>
                      <div className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${msg.username.includes(nickname) ? "bg-[#005c4b] rounded-tr-none" : "bg-[#202c33] rounded-tl-none border border-gray-800"}`}>
                        {!msg.username.includes(nickname) && <p className="text-[10px] text-[#25D366] font-black mb-1 uppercase tracking-tighter">{msg.username}</p>}
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className="text-[9px] text-white/30 text-right mt-1 font-bold italic">
                           {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "now"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {typingUser && (
                <div className="flex items-center space-x-2 py-2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{typingUser} is typing...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Game Bar */}
            <div className="bg-[#202c33] p-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-800/50">
              {GAMES.map((game) => (
                <button key={game.id} onClick={() => sendGameRequest(game.id)} className="bg-[#2a3942] whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-[#374954] transition-colors border border-gray-700/50">
                  <span className="text-sm">{game.icon}</span> {game.name}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-[#202c33] flex gap-2 border-t border-gray-800">
              <input 
                value={msgInput} 
                onChange={(e) => {
                  setMsgInput(e.target.value);
                  handleTyping(); // Real-time typing trigger
                }} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                className="flex-1 bg-[#111b21] p-4 rounded-xl outline-none text-sm placeholder-gray-600 focus:ring-1 focus:ring-[#25D366]/30 transition-all" 
                placeholder="Message..." 
              />
              <button 
                onClick={handleSendMessage} 
                className="bg-[#25D366] text-black font-black px-6 rounded-xl text-sm transition-transform active:scale-90 disabled:opacity-50"
                disabled={!msgInput.trim()}
              >
                SEND
              </button>
            </div>
          </div>

          {/* SIDEBAR */}
          {showMembers && (
            <div className="absolute right-0 top-0 h-full w-64 bg-[#111b21] border-l border-gray-800 z-20 p-6 shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Members</h3>
                <button onClick={() => setShowMembers(false)} className="text-gray-500 text-xl font-bold">&times;</button>
              </div>
              <div className="space-y-4">
                {users?.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#202c33]/50 p-2 rounded-xl border border-gray-800/50">
                    <div className="w-8 h-8 bg-[#111b21] rounded-full flex items-center justify-center text-sm ring-1 ring-[#25D366]/20">
                      {u.split(' ')[0]}
                    </div>
                    <span className="text-xs font-bold text-gray-300 truncate">{u.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeGame && renderGame()}
    </div>
  );
}

export default App;