import React, { useContext, useState, useEffect } from "react";
import { ChatContext } from "./context/ChatContext";

// ---- MODULAR COMPONENTS ----
import Chat from "./components/Chat";

// ---- GAME IMPORTS ----
import Pong from "./components/Games/Pong";
import SliderRace from "./components/Games/SlideRace";
import TapTap from "./components/Games/TapTap";
import TicTacToe from "./components/Games/TicTacToe";
import WordScramble from "./components/Games/WordScramble";

function App() {
  const {
    roomId,
    setRoomId,
    users,
    opponent,
    activeGame,
    scores,
    updateScore,
    sendGameRequest,
    closeGame,
    joinRoom,
    socket
  } = useContext(ChatContext);

  // --- UI STATE ---
  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // --- IDENTITY STATE ---
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [avatar, setAvatar] = useState(localStorage.getItem("avatar") || "🐱");

  const API_URL = "https://equal.onrender.com";
  const AVATARS = ["🐱", "🐶", "🦊", "🤖", "👻", "👽", "👾", "🥷", "🧙", "🦁"];

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble },
  ];

  // --- INVITE & JOIN LOGIC ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      setRoomId(code);
      setView("setup");
    }
  }, [setRoomId]);

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
      alert("Server connection error.");
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

  const copyInviteLink = () => {
    const url = `${window.location.origin}?join=${roomId}`;
    navigator.clipboard.writeText(url);
    alert("Invite link copied to clipboard!");
  };

  // --- GAME RENDERER ---
  const renderGame = () => {
    const game = GAMES.find((g) => g.id === activeGame);
    if (!game) return null;
    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col animate-in fade-in duration-300">
        <div className="flex justify-between items-center p-4 bg-[#202c33] border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <h2 className="font-black text-xs tracking-widest uppercase">{game.name}</h2>
          </div>
          <button 
            onClick={closeGame} 
            className="bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-[10px] transition-all"
          >
            EXIT GAME
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
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
    <div className="h-screen bg-[#0b141a] text-white flex flex-col font-sans overflow-hidden">
      
      {/* 1. LANDING VIEW */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-7xl font-black mb-2 text-[#25D366] tracking-tighter italic">EQUAL</h1>
          <p className="text-slate-500 mb-10 uppercase tracking-[0.4em] text-[10px] font-bold">Multimedia Gaming Hub</p>
          <button 
            onClick={handleGenerateRoom} 
            className="w-full max-w-xs bg-[#25D366] text-black font-black py-5 rounded-2xl mb-4 transition-all active:scale-95 shadow-lg shadow-[#25D366]/20 hover:brightness-110"
          >
            {isLoading ? "INITIALIZING..." : "CREATE PRIVATE ROOM"}
          </button>
          <div className="flex gap-2 w-full max-w-xs">
            <input 
              value={roomInput} 
              onChange={(e) => setRoomInput(e.target.value)} 
              placeholder="Room Code" 
              className="flex-1 bg-white/5 p-4 rounded-xl outline-none border border-white/10 focus:border-[#25D366]/50" 
            />
            <button onClick={() => { setRoomId(roomInput); setView("setup"); }} className="bg-slate-800 px-6 rounded-xl font-bold hover:bg-slate-700 transition-colors">JOIN</button>
          </div>
        </div>
      )}

      {/* 2. SETUP VIEW */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#202c33] p-10 rounded-[3rem] w-full max-w-md border border-white/5 shadow-2xl">
            <h2 className="text-xs font-black mb-8 text-center uppercase tracking-[0.2em] text-slate-400">Identity Setup</h2>
            <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
              {AVATARS.map(a => (
                <button 
                  key={a} onClick={() => setAvatar(a)} 
                  className={`text-2xl p-3 rounded-2xl transition-all ${avatar === a ? 'bg-[#25D366] scale-110 shadow-lg shadow-[#25D366]/20' : 'bg-black/20 opacity-40 hover:opacity-100'}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              placeholder="Nickname" 
              className="w-full bg-black/20 text-xl font-bold text-center p-4 rounded-2xl mb-8 outline-none border-2 border-transparent focus:border-[#25D366]" 
            />
            <button onClick={handleEnterChat} className="w-full bg-[#25D366] text-black font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">ENTER CHAT</button>
          </div>
        </div>
      )}

      {/* 3. CHAT VIEW */}
      {view === "chat" && (
        <div className="flex h-full relative">
          <div className="flex-1 flex flex-col relative">
            
            {/* Header */}
            <header className="bg-[#202c33] p-4 flex justify-between items-center border-b border-white/5 z-10 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl">{avatar}</span>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#25D366] border-2 border-[#202c33] rounded-full" />
                </div>
                <div>
                  <h2 className="font-black text-[#25D366] text-sm leading-tight uppercase tracking-tighter">{nickname}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Room: {roomId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={copyInviteLink}
                  className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                >
                  🔗 INVITE
                </button>
                <button onClick={() => setShowMembers(!showMembers)} className="bg-slate-700/50 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border border-white/5 hover:bg-slate-700 transition-all">
                  👥 {users?.length || 1}
                </button>
              </div>
            </header>

            {/* MAIN CONTENT AREA (Modular Chat) */}
            <Chat />

            {/* GAME BAR */}
            <div className="bg-[#1e272e] p-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-white/5 z-20">
              {GAMES.map((game) => (
                <button 
                  key={game.id} 
                  onClick={() => sendGameRequest(game.id)} 
                  className="bg-white/5 hover:bg-white/10 active:bg-[#25D366] active:text-black whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all border border-white/5"
                >
                  <span className="text-base">{game.icon}</span> {game.name}
                </button>
              ))}
            </div>
            
          </div>

          {/* Members Sidebar */}
          {showMembers && (
            <div className="absolute right-0 top-0 h-full w-64 bg-[#0b141a] border-l border-white/5 z-50 p-6 animate-in slide-in-from-right duration-300 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Online Operatives</h3>
                 <button onClick={() => setShowMembers(false)} className="text-xl opacity-50 hover:opacity-100">&times;</button>
               </div>
               <div className="space-y-4">
                 {users?.map((u, i) => (
                   <div key={i} className="flex items-center gap-3 bg-[#202c33] p-3 rounded-xl border border-white/5">
                     <span className="text-xs font-bold text-slate-200">{u}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}

      {/* OVERLAY: ACTIVE GAME */}
      {activeGame && renderGame()}
    </div>
  );
}

export default App;