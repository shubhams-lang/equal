import React, { useContext, useState, useEffect, lazy, Suspense } from "react";
import { ChatContext } from "./context/ChatContext";
import { FiUsers, FiX, FiSend, FiCopy, FiChevronRight, FiShield } from "react-icons/fi";

// ---- MODULAR COMPONENTS ----
import Chat from "./components/Chat";

// ---- LAZY LOAD GAMES ----
const Pong = lazy(() => import("./components/Games/Pong"));
const SliderRace = lazy(() => import("./components/Games/SlideRace"));
const TapTap = lazy(() => import("./components/Games/TapTap"));
const TicTacToe = lazy(() => import("./components/Games/TicTacToe"));
const WordScramble = lazy(() => import("./components/Games/WordScramble"));

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

  // ---------------- UI STATE ----------------
  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [connected, setConnected] = useState(true);
  const [copied, setCopied] = useState(false);

  // ---------------- IDENTITY (Reset on Refresh) ----------------
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🐱");

  const API_URL = "https://equal.onrender.com";
  const AVATARS = ["🐱","🐶","🦊","🤖","👻","👽","👾","🥷","🧙","🦁"];

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble },
  ];

  // ---------------- REFRESH PROTECTION & LOGOUT ----------------
  useEffect(() => {
    // Force reset on refresh: Nuke storage and reset view
    localStorage.clear();
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    
    if (code) {
      setRoomId(code);
      setView("setup");
    } else {
      setView("landing");
    }
    
    // Clean URL bar without refreshing
    window.history.pushState({}, "", window.location.pathname);
  }, [setRoomId]);

  // ---------------- SOCKET STATUS ----------------
  useEffect(() => {
    if (!socket) return;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  const handleGenerateRoom = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/create-room`, { method: "POST" });
      const data = await res.json();
      if (data.roomId) {
        setRoomId(data.roomId);
        setView("setup");
      }
    } catch (err) {
      alert("Server connection error.");
    }
    setIsLoading(false);
  };

  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Please enter a nickname!");
    if (roomId && joinRoom) {
      joinRoom(roomId, `${avatar} ${nickname}`);
      setView("chat");
    }
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}?join=${roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderGame = () => {
    const game = GAMES.find((g) => g.id === activeGame);
    if (!game) return null;
    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black/98 z-[100] flex flex-col animate-in fade-in zoom-in duration-300 backdrop-blur-md">
        <div className="flex justify-between items-center p-4 bg-[#111b21]/80 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{game.icon}</span>
            <h2 className="font-black text-xs tracking-widest uppercase">{game.name}</h2>
          </div>
          <button onClick={closeGame} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 px-6 py-2 rounded-xl font-bold text-[10px] transition-all">
            EXIT SESSION
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Suspense fallback={<div className="animate-pulse text-[#25D366] font-black uppercase tracking-[0.3em]">Establishing Transmission...</div>}>
            <SelectedGame 
              socket={socket} roomId={roomId} scores={scores}
              username={`${avatar} ${nickname}`} opponent={opponent} updateScore={updateScore} 
            />
          </Suspense>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#0b141a] text-white flex flex-col font-sans overflow-hidden">
      
      {/* ---------------- LANDING VIEW ---------------- */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-8xl font-black mb-2 text-[#25D366] italic tracking-tighter drop-shadow-[0_0_30px_rgba(37,211,102,0.2)]">
            EQUAL
          </h1>
          <p className="text-slate-500 mb-12 uppercase tracking-[0.5em] text-[10px] font-bold">
            Multimedia Gaming Hub
          </p>
          <button 
            onClick={handleGenerateRoom} 
            className="w-full max-w-xs bg-[#25D366] hover:bg-[#20bd5b] text-black font-black py-5 rounded-2xl mb-4 transition-all transform hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(37,211,102,0.2)]"
          >
            {isLoading ? "INITIALIZING SECURE CHANNEL..." : "CREATE PRIVATE ROOM"}
          </button>
          <div className="flex gap-2 w-full max-w-xs group">
            <input 
              value={roomInput} 
              onChange={(e) => setRoomInput(e.target.value)} 
              placeholder="Enter Room Code" 
              className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-[#25D366]/50 transition-all text-center font-mono tracking-widest" 
            />
            <button 
              onClick={() => { setRoomId(roomInput); setView("setup"); }} 
              className="bg-slate-800 hover:bg-slate-700 px-6 rounded-xl font-bold transition-all border border-white/5"
            >
              JOIN
            </button>
          </div>
        </div>
      )}

      {/* ---------------- SETUP VIEW ---------------- */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6 animate-in zoom-in-95 duration-500">
          <div className="bg-[#111b21] border border-white/5 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl backdrop-blur-xl">
            <h2 className="text-[10px] font-black mb-10 text-center uppercase tracking-[0.4em] text-slate-500">Initialize Identity</h2>
            <div className="flex justify-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
              {AVATARS.map((a) => (
                <button 
                  key={a} 
                  onClick={() => setAvatar(a)} 
                  className={`text-3xl p-4 rounded-2xl transition-all duration-300 ${avatar === a ? "bg-[#25D366] scale-125 shadow-lg -translate-y-2 rotate-6" : "bg-white/5 hover:bg-white/10 hover:scale-110"}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              placeholder="Enter Callsign" 
              className="w-full bg-black/20 border border-white/5 text-xl text-center p-5 rounded-2xl mb-8 focus:border-[#25D366]/50 outline-none transition-all placeholder:text-slate-700" 
            />
            <button 
              onClick={handleEnterChat} 
              className="w-full bg-[#25D366] hover:bg-[#20bd5b] text-black font-black py-5 rounded-2xl transition-all active:scale-95 shadow-lg"
            >
              ESTABLISH CONNECTION
            </button>
          </div>
        </div>
      )}

      {/* ---------------- CHAT VIEW ---------------- */}
      {view === "chat" && (
        <div className="flex h-full flex-1 overflow-hidden">
          
          {/* MAIN CHAT INTERFACE */}
          <div className="flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out">
            <header className="bg-[#111b21]/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/5 z-10">
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer">
                  <span className="text-3xl group-hover:scale-110 transition-transform block">{avatar}</span>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111b21] ${connected ? "bg-[#25D366] animate-pulse shadow-[0_0_10px_rgba(37,211,102,0.8)]" : "bg-red-500"}`}></span>
                </div>
                <div>
                  <h2 className="font-black text-[#25D366] text-sm uppercase tracking-tight flex items-center gap-2">
                    {nickname} <FiShield className="text-[10px] text-slate-500"/>
                  </h2>
                  <p className="text-[9px] text-slate-500 font-mono tracking-tighter opacity-80">CHANNEL: {roomId}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={copyInviteLink} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${copied ? "bg-[#25D366] text-black" : "bg-white/5 text-blue-400 hover:bg-blue-600/20 hover:text-white border border-white/5"}`}
                >
                  {copied ? "COPIED ✓" : "INVITE LINK"}
                </button>
                <button 
                  onClick={() => setShowMembers(!showMembers)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${showMembers ? "bg-[#25D366] text-black shadow-lg" : "bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5"}`}
                >
                  MEMBERS ({users?.length || 1})
                </button>
              </div>
            </header>

            {/* CHAT CONTAINER */}
            <div className="flex-1 relative bg-[#0b141a]">
              <Chat />
            </div>

            {/* GAME SELECTION BAR */}
            <div className="bg-[#111b21]/80 backdrop-blur-xl p-3 flex gap-3 overflow-x-auto border-t border-white/5 scrollbar-hide">
              {GAMES.map((game) => (
                <button 
                  key={game.id} 
                  onClick={() => sendGameRequest(game.id)} 
                  className="flex-none bg-white/5 hover:bg-blue-600 hover:scale-105 transition-all px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 group"
                >
                  <span className="group-hover:scale-125 transition-transform inline-block mr-2">{game.icon}</span> 
                  {game.name}
                </button>
              ))}
            </div>
          </div>

          {/* ---------------- COLLAPSIBLE MEMBER PANEL ---------------- */}
          <aside 
            className={`bg-[#0e161b] border-l border-white/5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden flex flex-col ${showMembers ? "w-80" : "w-0"}`}
          >
            <div className="p-8 w-80 h-full flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Live Connections</h3>
                <button onClick={() => setShowMembers(false)} className="text-slate-500 hover:text-red-500 transition-colors">
                  <FiX size={20}/>
                </button>
              </div>
              
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {users?.map((u, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 bg-white/5 p-4 rounded-[1.25rem] border border-white/5 hover:border-[#25D366]/30 transition-all group animate-in slide-in-from-right-4 duration-300"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">
                      {u.split(' ')[0]} 
                    </div>
                    <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors truncate">
                      {u.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-white/5">
                <p className="text-[9px] text-slate-600 uppercase tracking-widest text-center">Encryption Active</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ---------------- ACTIVE GAME OVERLAY ---------------- */}
      {activeGame && renderGame()}
    </div>
  );
}

export default App;