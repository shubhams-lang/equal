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
    typingUser,
    activeGame,
    scores,
    updateScore,
    sendGameRequest,
    closeGame,
    joinRoom,
    sendMessage,
    handleTyping,
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
  }, [messages, typingUser]);

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
    sendMessage(msgInput);
    setMsgInput("");
  };

  const renderGame = () => {
    const game = GAMES.find((g) => g.id === activeGame);
    if (!game) return null;
    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 z-[100] flex flex-col animate-in fade-in duration-300">
        <div className="flex justify-between items-center p-4 bg-[#202c33] border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <h2 className="font-bold uppercase tracking-widest text-sm">{game.name}</h2>
          </div>
          <button 
            onClick={closeGame} 
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-black transition-colors"
          >
            EXIT GAME
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
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
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-radial-gradient">
          <h1 className="text-7xl font-black mb-2 text-[#25D366] tracking-tighter drop-shadow-2xl">EQUAL</h1>
          <p className="text-gray-500 mb-10 uppercase tracking-[0.3em] text-[10px] font-bold">Secure • Anonymous • Fun</p>
          <button
            onClick={handleGenerateRoom}
            disabled={isLoading}
            className="w-full max-w-xs bg-[#25D366] text-black font-black py-5 rounded-2xl mb-4 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#25D366]/20"
          >
            {isLoading ? "CREATING..." : "CREATE PRIVATE ROOM"}
          </button>
          <div className="flex gap-2 w-full max-w-xs">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Room Code"
              className="flex-1 bg-[#202c33] p-4 rounded-2xl outline-none border border-transparent focus:border-[#25D366]/50 transition-all"
            />
            <button onClick={() => { setRoomId(roomInput); setView("setup"); }} className="bg-gray-700 hover:bg-gray-600 px-6 rounded-2xl font-bold transition-colors">JOIN</button>
          </div>
        </div>
      )}

      {/* SETUP VIEW */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#202c33] p-10 rounded-[3rem] w-full max-w-md border border-gray-800 shadow-2xl">
            <h2 className="text-2xl font-black mb-8 text-center tracking-tight">WHO ARE YOU?</h2>
            <div className="flex justify-center gap-3 mb-8 overflow-x-auto pb-4 no-scrollbar">
              {AVATARS.map(a => (
                <button 
                  key={a} onClick={() => setAvatar(a)}
                  className={`text-2xl p-4 rounded-2xl transition-all ${avatar === a ? 'bg-[#25D366] scale-110 rotate-3' : 'bg-[#111b21] opacity-40 hover:opacity-100'}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter Nickname"
              className="w-full bg-[#111b21] text-xl font-bold text-center p-5 rounded-2xl mb-8 outline-none border-2 border-transparent focus:border-[#25D366] transition-all"
            />
            <button onClick={handleEnterChat} className="w-full bg-[#25D366] text-black font-black py-5 rounded-2xl text-xl shadow-lg shadow-[#25D366]/10 active:scale-95 transition-transform">
              ENTER CHAT
            </button>
          </div>
        </div>
      )}

      {/* CHAT VIEW */}
      {view === "chat" && (
        <div className="flex h-full relative">
          <div className="flex-1 flex flex-col relative">
            <header className="bg-[#202c33] p-4 flex justify-between items-center border-b border-gray-800 shadow-md z-20">
              <div className="flex items-center gap-3">
                <span className="text-3xl bg-[#111b21] p-2 rounded-2xl">{avatar}</span>
                <div>
                  <h2 className="font-black text-[#25D366] leading-none">{nickname}</h2>
                  <p className="text-[9px] text-gray-500 font-bold mt-1 uppercase">Room: {roomId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowMembers(!showMembers)} className="bg-[#2a3942] hover:bg-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                  👥 {users?.length || 1}
                </button>
                <button onClick={() => window.location.href = "/"} className="bg-red-500/10 text-red-500 text-xs px-4 py-2 rounded-xl font-black border border-red-500/20">EXIT</button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b141a] no-scrollbar">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.type === "system" ? (
                    <div className="flex justify-center my-6">
                      <span className="bg-[#111b21] text-gray-600 text-[9px] px-4 py-1 rounded-full border border-gray-800 uppercase tracking-[0.2em] font-black">
                        {msg.message}
                      </span>
                    </div>
                  ) : (
                    <div className={`flex ${msg.username.includes(nickname) ? "justify-end" : "justify-start"}`}>
                      <div className={`p-4 rounded-3xl max-w-[85%] shadow-sm ${msg.username.includes(nickname) ? "bg-[#005c4b] rounded-tr-none" : "bg-[#202c33] rounded-tl-none border border-gray-800"}`}>
                        {!msg.username.includes(nickname) && <p className="text-[10px] text-[#25D366] font-black mb-1 uppercase tracking-tighter">{msg.username}</p>}
                        <p className="text-[14px] leading-relaxed">{msg.message}</p>
                        <p className="text-[8px] text-white/20 text-right mt-1 font-bold italic">
                           {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "just now"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {typingUser && (
                <div className="flex items-center space-x-2 py-2 animate-pulse">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{typingUser} is typing...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* GAME BAR - MOVED ABOVE INPUT FOR BETTER CLICKABILITY */}
            <div className="bg-[#202c33] p-3 flex gap-3 overflow-x-auto no-scrollbar border-t border-gray-800 z-10 relative">
              {GAMES.map((game) => (
                <button 
                  key={game.id} 
                  onClick={() => {
                    console.log("Game Button Clicked:", game.id);
                    sendGameRequest(game.id);
                  }} 
                  className="bg-[#2a3942] hover:bg-[#374954] active:bg-[#25D366] active:text-black whitespace-nowrap px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 transition-all border border-gray-700/50 cursor-pointer shadow-lg"
                >
                  <span className="text-lg">{game.icon}</span> {game.name}
                </button>
              ))}
            </div>

            {/* INPUT BAR */}
            <div className="p-4 bg-[#202c33] flex gap-3 border-t border-gray-800 z-20">
              <input 
                value={msgInput} 
                onChange={(e) => {
                  setMsgInput(e.target.value);
                  handleTyping();
                }} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                className="flex-1 bg-[#111b21] p-4 rounded-2xl outline-none text-sm placeholder-gray-700 border border-transparent focus:border-[#25D366]/30 transition-all" 
                placeholder="Say something..." 
              />
              <button 
                onClick={handleSendMessage} 
                className="bg-[#25D366] hover:bg-[#20b858] text-black font-black px-8 rounded-2xl text-sm transition-all active:scale-90 disabled:opacity-30 disabled:grayscale"
                disabled={!msgInput.trim()}
              >
                SEND
              </button>
            </div>
          </div>

          {/* SIDEBAR */}
          {showMembers && (
            <div className="absolute right-0 top-0 h-full w-72 bg-[#111b21] border-l border-gray-800 z-50 p-8 shadow-2xl animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Online Now</h3>
                <button onClick={() => setShowMembers(false)} className="text-gray-500 text-3xl hover:text-white transition-colors">&times;</button>
              </div>
              <div className="space-y-4">
                {users?.map((u, i) => (
                  <div key={i} className="flex items-center gap-4 bg-[#202c33]/40 p-3 rounded-2xl border border-gray-800/50 hover:border-[#25D366]/30 transition-all">
                    <div className="w-10 h-10 bg-[#111b21] rounded-2xl flex items-center justify-center text-lg ring-1 ring-gray-800">
                      {u.split(' ')[0]}
                    </div>
                    <span className="text-xs font-black text-gray-300 truncate tracking-tight">{u.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME OVERLAY */}
      {activeGame && renderGame()}
    </div>
  );
}

export default App;