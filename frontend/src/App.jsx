import React, { useContext, useState, useEffect, lazy, Suspense } from "react";
import { ChatContext } from "./context/ChatContext";
import { FiX, FiShield, FiExternalLink, FiPlusCircle } from "react-icons/fi";

// ---- MODULAR COMPONENTS ----
import Chat from "./components/Chat";

// ---- LAZY LOAD GAMES (Optimized performance) ----
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

  // ---------------- IDENTITY (Strict Empty Start) ----------------
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

  // ---------------- THE "REFRESH TO START" LOGIC ----------------
  useEffect(() => {
    // 1. Immediately wipe storage to prevent auto-rejoin
    localStorage.removeItem("roomId");
    localStorage.removeItem("nickname");
    localStorage.removeItem("avatar");

    // 2. Parse URL for invite code
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");

    if (code) {
      setRoomId(code);
      setView("setup");
    } else {
      setView("landing");
    }

    // 3. Clean up the URL bar
    window.history.pushState({}, "", window.location.pathname);
  }, [setRoomId]);

  // ---------------- SOCKET STATUS MONITOR ----------------
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  // ---------------- HANDLERS ----------------
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
      alert("Encryption server unreachable. Please try again.");
    }
    setIsLoading(false);
  };

  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Callsign required!");
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
      <div className="fixed inset-0 bg-black/98 z-[100] flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center p-4 bg-[#111b21] border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{game.icon}</span>
            <h2 className="font-black text-[10px] tracking-[0.3em] uppercase text-slate-300">{game.name} Session</h2>
          </div>
          <button onClick={closeGame} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/40 px-6 py-2 rounded-xl font-bold text-[10px] transition-all">
            TERMINATE GAME
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Suspense fallback={<div className="animate-pulse text-[#25D366] font-black uppercase tracking-widest">Loading Game Module...</div>}>
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
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <h1 className="text-8xl font-black mb-2 text-[#25D366] italic tracking-tighter drop-shadow-2xl">EQUAL</h1>
          <p className="text-slate-500 mb-12 uppercase tracking-[0.6em] text-[10px] font-bold opacity-70">Multimedia Gaming Hub</p>
          
          <button 
            onClick={handleGenerateRoom} 
            className="w-full max-w-xs bg-[#25D366] hover:bg-[#20bd5b] text-black font-black py-5 rounded-2xl mb-4 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(37,211,102,0.2)]"
          >
            {isLoading ? "GENERATING KEY..." : "CREATE PRIVATE ROOM"}
          </button>

          <div className="flex gap-2 w-full max-w-xs">
            <input 
              value={roomInput} 
              onChange={(e) => setRoomInput(e.target.value)} 
              placeholder="Room Code" 
              className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-[#25D366]/40 transition-all text-center font-mono" 
            />
            <button 
              onClick={() => { setRoomId(roomInput); setView("setup"); }} 
              className="bg-slate-800 hover:bg-slate-700 px-6 rounded-xl font-bold transition-all"
            >
              JOIN
            </button>
          </div>
        </div>
      )}

      {/* ---------------- SETUP VIEW ---------------- */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6 animate-in zoom-in-95 duration-500">
          <div className="bg-[#111b21] border border-white/5 p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
            <h2 className="text-[10px] font-black mb-8 text-center uppercase tracking-[0.3em] text-slate-500">Identity Selection</h2>
            <div className="flex justify-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
              {AVATARS.map((a) => (
                <button 
                  key={a} 
                  onClick={() => setAvatar(a)} 
                  className={`text-3xl p-4 rounded-2xl transition-all duration-300 ${avatar === a ? "bg-[#25D366] scale-125 shadow-lg -translate-y-2" : "bg-white/5 hover:bg-white/10"}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              placeholder="Enter Callsign" 
              className="w-full bg-black/20 border border-white/5 text-xl text-center p-5 rounded-2xl mb-8 focus:border-[#25D366]/50 outline-none transition-all" 
            />
            <button 
              onClick={handleEnterChat} 
              className="w-full bg-[#25D366] hover:bg-[#20bd5b] text-black font-black py-5 rounded-2xl transition-all active:scale-95 shadow-xl"
            >
              INITIALIZE CONNECTION
            </button>
          </div>
        </div>
      )}

      {/* ---------------- CHAT VIEW ---------------- */}
      {view === "chat" && (
        <div className="flex h-full flex-1 overflow-hidden">
          
          <div className="flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out relative">
            <header className="bg-[#111b21] p-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-3xl">{avatar}</span>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111b21] ${connected ? "bg-[#25D366] animate-pulse" : "bg-red-500"}`}></span>
                </div>
                <div>
                  <h2 className="font-black text-[#25D366] text-sm uppercase flex items-center gap-2">
                    {nickname} <FiShield className="text-slate-600 text-[10px]"/>
                  </h2>
                  <p className="text-[9px] text-slate-500 font-mono tracking-tighter">SECURE_ROOM: {roomId}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={copyInviteLink} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all border border-white/5 ${copied ? "bg-green-600 text-white" : "bg-blue-600/10 text-blue-400 hover:bg-blue-600/20"}`}
                >
                  {copied ? "COPIED ✓" : "INVITE LINK"}
                </button>
                <button 
                  onClick={() => setShowMembers(!showMembers)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all border border-white/5 ${showMembers ? "bg-[#25D366] text-black" : "bg-white/5 text-slate-400"}`}
                >
                  USERS ({users?.length || 1})
                </button>
              </div>
            </header>

            <div className="flex-1 relative bg-[#0b141a]">
              <Chat />
            </div>

            <div className="bg-[#111b21] p-3 flex gap-3 overflow-x-auto border-t border-white/5 scrollbar-hide">
              {GAMES.map((game) => (
                <button 
                  key={game.id} 
                  onClick={() => sendGameRequest(game.id)} 
                  className="flex-none bg-white/5 hover:bg-blue-600 hover:scale-105 transition-all px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5"
                >
                  {game.icon} {game.name}
                </button>
              ))}
            </div>
          </div>

          {/* COLLAPSIBLE SIDEBAR PANEL */}
          <aside 
            className={`bg-[#0e161b] border-l border-white/5 transition-all duration-500 ease-in-out overflow-hidden flex flex-col ${showMembers ? "w-80" : "w-0"}`}
          >
            <div className="p-8 w-80 h-full flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Live Active Users</h3>
                <button onClick={() => setShowMembers(false)} className="text-slate-500 hover:text-white transition-colors">
                  <FiX size={20}/>
                </button>
              </div>
              
              <div className="space-y-4 overflow-y-auto custom-scrollbar">
                {users?.map((u, i) => {
                  const [uAvatar, ...uNameArr] = u.split(' ');
                  const uName = uNameArr.join(' ');
                  return (
                    <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-[#25D366]/30 transition-all group">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl shadow-inner">{uAvatar}</div>
                      <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors truncate">{uName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeGame && renderGame()}
    </div>
  );
}

export default App;