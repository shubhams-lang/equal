import React, { useContext, useState, useEffect } from "react";
import { ChatContext } from "./context/ChatContext";

// ---- MODULAR COMPONENTS ----
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import MembersPanel from "./components/MembersPanel";

// ---- GAME IMPORTS ----
import Pong from "./components/Games/Pong";
import SliderRace from "./components/Games/SliderRace";
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

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

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

  // URL Invite Handling
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
    } catch (err) { alert("Server error."); }
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

  const renderGameOverlay = () => {
    const game = GAMES.find((g) => g.id === activeGame);
    if (!game) return null;
    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col animate-in fade-in duration-300">
        <div className="flex justify-between items-center p-4 bg-[#1e293b] border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <h2 className="font-black text-xs tracking-widest uppercase">{game.name}</h2>
          </div>
          <button onClick={closeGame} className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-[10px] transition-all border border-red-500/20">
            CLOSE GAME
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <SelectedGame socket={socket} roomId={roomId} username={`${avatar} ${nickname}`} opponent={opponent} updateScore={updateScore} scores={scores} />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#0b1220] text-slate-200 flex flex-col font-sans overflow-hidden">
      
      {/* 1. LANDING VIEW */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-7xl font-black mb-2 text-white tracking-tighter italic">EQUAL</h1>
          <p className="text-blue-500 mb-10 uppercase tracking-[0.5em] text-[10px] font-bold">Multimedia Anonymous Hub</p>
          <button onClick={handleGenerateRoom} className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl mb-4 transition-all shadow-xl shadow-blue-600/20">
            {isLoading ? "INITIALIZING..." : "CREATE PRIVATE ROOM"}
          </button>
          <div className="flex gap-2 w-full max-w-xs">
            <input value={roomInput} onChange={(e) => setRoomInput(e.target.value)} placeholder="Enter Code" className="flex-1 bg-white/5 p-4 rounded-xl outline-none border border-white/10 focus:border-blue-500/50" />
            <button onClick={() => { setRoomId(roomInput); setView("setup"); }} className="bg-slate-800 px-6 rounded-xl font-bold hover:bg-slate-700 transition-colors">JOIN</button>
          </div>
        </div>
      )}

      {/* 2. SETUP VIEW */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#0b1220]">
          <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] w-full max-w-md border border-white/10 shadow-2xl">
            <h2 className="text-sm font-black mb-8 text-center uppercase tracking-widest text-slate-400">Identify Yourself</h2>
            <div className="flex justify-center gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
              {AVATARS.map(a => (
                <button key={a} onClick={() => setAvatar(a)} className={`text-2xl p-3 rounded-2xl transition-all ${avatar === a ? 'bg-blue-600 scale-110 shadow-lg shadow-blue-600/40' : 'bg-white/5 opacity-40 hover:opacity-100'}`}>{a}</button>
              ))}
            </div>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Your Nickname" className="w-full bg-black/20 text-xl font-bold text-center p-4 rounded-2xl mb-6 outline-none border border-white/10 focus:border-blue-500" />
            <button onClick={handleEnterChat} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-500 active:scale-95 transition-all">START CHATTING</button>
          </div>
        </div>
      )}

      {/* 3. MAIN CHAT VIEW */}
      {view === "chat" && (
        <div className="flex h-full relative">
          <div className="flex-1 flex flex-col relative">
            <header className="bg-[#0b1220]/50 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/5 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xl shadow-lg shadow-blue-600/20">{avatar}</div>
                <div>
                  <h2 className="font-black text-sm text-white leading-none">{nickname}</h2>
                  <span className="text-[9px] text-blue-500 font-bold tracking-widest uppercase">Room: {roomId}</span>
                </div>
              </div>
              <button onClick={() => setShowMembers(!showMembers)} className="bg-white/5 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest hover:bg-white/10 transition-colors border border-white/5">
                MEMBERS ({users?.length || 1})
              </button>
            </header>

            {/* MESSAGE LIST COMPONENT */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#0b1220] custom-scrollbar">
              <MessageList />
            </div>

            {/* GAME BAR */}
            <div className="bg-black/20 p-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-white/5 z-20">
              {GAMES.map((game) => (
                <button key={game.id} onClick={() => sendGameRequest(game.id)} className="bg-white/5 hover:bg-white/10 whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border border-white/5 transition-all">
                  <span className="text-base">{game.icon}</span> {game.name}
                </button>
              ))}
            </div>

            {/* MESSAGE INPUT COMPONENT (Multimedia/Voice/Camera) */}
            <div className="p-4 bg-[#0b1220] border-t border-white/5 z-20">
              <MessageInput />
            </div>
          </div>

          {/* Members Sidebar */}
          {showMembers && <MembersPanel onClose={() => setShowMembers(false)} />}
        </div>
      )}

      {/* Game Overlay */}
      {activeGame && renderGameOverlay()}
    </div>
  );
}

export default App;