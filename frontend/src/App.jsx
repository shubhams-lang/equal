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
    opponent,
    typingUser,
    activeGame,
    scores,
    updateScore,
    sendGameRequest,
    closeGame,
    joinRoom,
    sendMessage,
    handleTyping,
    socket
  } = useContext(ChatContext);

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // Local state for setup
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
      alert("Server error.");
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
      <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col animate-in fade-in duration-300">
        <div className="flex justify-between items-center p-4 bg-[#202c33] border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span>{game.icon}</span>
            <h2 className="font-bold text-sm tracking-widest uppercase">{game.name}</h2>
          </div>
          <button 
            onClick={closeGame} 
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-black text-xs transition-colors"
          >
            EXIT GAME
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <SelectedGame
            socket={socket}
            roomId={roomId}
            username={`${avatar} ${nickname}`}
            opponent={opponent}
            updateScore={updateScore}
            scores={scores}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#111b21] text-white flex flex-col font-sans overflow-hidden">
      
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-6xl font-black mb-2 text-[#25D366] tracking-tighter">EQUAL</h1>
          <p className="text-gray-500 mb-8 uppercase tracking-widest text-[10px] font-bold">Anonymous Multiplayer Hub</p>
          <button 
            onClick={handleGenerateRoom} 
            className="w-full max-w-xs bg-[#25D366] text-black font-black py-5 rounded-2xl mb-4 transition-transform active:scale-95 shadow-lg shadow-[#25D366]/10"
          >
            {isLoading ? "LOADING..." : "CREATE PRIVATE ROOM"}
          </button>
          <div className="flex gap-2 w-full max-w-xs">
            <input 
              value={roomInput} 
              onChange={(e) => setRoomInput(e.target.value)} 
              placeholder="Room Code" 
              className="flex-1 bg-[#202c33] p-4 rounded-xl outline-none border border-transparent focus:border-[#25D366]/50" 
            />
            <button onClick={() => { setRoomId(roomInput); setView("setup"); }} className="bg-gray-700 px-6 rounded-xl font-bold">JOIN</button>
          </div>
        </div>
      )}

      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#202c33] p-8 rounded-[2.5rem] w-full max-w-md border border-gray-800 shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-center">CHOOSE IDENTITY</h2>
            <div className="flex justify-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {AVATARS.map(a => (
                <button 
                  key={a} onClick={() => setAvatar(a)} 
                  className={`text-xl p-3 rounded-xl transition-all ${avatar === a ? 'bg-[#25D366] scale-110' : 'bg-[#111b21] opacity-50'}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              placeholder="Nickname" 
              className="w-full bg-[#111b21] text-xl font-bold text-center p-4 rounded-xl mb-6 outline-none border-2 border-transparent focus:border-[#25D366]" 
            />
            <button onClick={handleEnterChat} className="w-full bg-[#25D366] text-black font-black py-4 rounded-xl shadow-lg">ENTER CHAT</button>
          </div>
        </div>
      )}

      {view === "chat" && (
        <div className="flex h-full relative">
          <div className="flex-1 flex flex-col relative">
            <header className="bg-[#202c33] p-4 flex justify-between items-center border-b border-gray-800 z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{avatar}</span>
                <h2 className="font-bold text-[#25D366]">{nickname}</h2>
              </div>
              <button onClick={() => setShowMembers(!showMembers)} className="bg-gray-700 px-3 py-1 rounded-lg text-xs font-bold transition-colors hover:bg-gray-600">
                👥 {users?.length || 1}
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.username === `${avatar} ${nickname}` ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] ${msg.username === `${avatar} ${nickname}` ? "bg-[#005c4b]" : "bg-[#202c33]"}`}>
                    {msg.username !== `${avatar} ${nickname}` && <p className="text-[9px] text-[#25D366] font-black mb-1 uppercase">{msg.username}</p>}
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
              {typingUser && (
                <div className="flex items-center gap-2 py-1">
                  <span className="text-[10px] text-gray-500 font-bold animate-pulse uppercase tracking-widest">{typingUser} is typing...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* GAME BAR */}
            <div className="bg-[#202c33] p-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-800 z-20 relative shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
              {GAMES.map((game) => (
                <button 
                  key={game.id} 
                  onClick={() => sendGameRequest(game.id)} 
                  className="bg-[#2a3942] hover:bg-[#374954] active:bg-[#25D366] active:text-black whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-base">{game.icon}</span> {game.name}
                </button>
              ))}
            </div>

            <div className="p-4 bg-[#202c33] flex gap-2 z-20">
              <input 
                value={msgInput} 
                onChange={(e) => { setMsgInput(e.target.value); handleTyping(); }} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                className="flex-1 bg-[#111b21] p-3 rounded-xl outline-none text-sm" 
                placeholder="Type a message..." 
              />
              <button 
                onClick={handleSendMessage} 
                className="bg-[#25D366] text-black font-black px-6 rounded-xl text-sm active:scale-95 transition-transform"
              >
                SEND
              </button>
            </div>
          </div>

          {showMembers && (
            <div className="absolute right-0 top-0 h-full w-64 bg-[#111b21] border-l border-gray-800 z-50 p-6 animate-in slide-in-from-right duration-300">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Online Users</h3>
                 <button onClick={() => setShowMembers(false)} className="text-xl">&times;</button>
               </div>
               <div className="space-y-4">
                 {users?.map((u, i) => (
                   <div key={i} className="flex items-center gap-3 bg-[#202c33] p-3 rounded-xl">
                     <span className="text-xs font-bold">{u}</span>
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