import React, { useContext, useState, useEffect, lazy, Suspense } from "react";
import { ChatContext } from "./context/ChatContext";
import { FiX, FiShield, FiUsers, FiShare2, FiLogOut, FiPlus } from "react-icons/fi";

import Chat from "./components/Chat";

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
    socket,
    connected,
    username
  } = useContext(ChatContext);

  // UI State
  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🐱");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const AVATARS = ["🐱", "🐶", "🦊", "🤖", "👻", "👽", "👾", "🥷", "🧙", "🦁"];
  const API_URL = "https://equal.onrender.com";

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble }
  ];

  // Auto-join from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      setRoomId(code);
      setView("setup");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setRoomId]);

  const handleGenerateRoom = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error("Server not responding");

      const data = await res.json();
      if (data?.roomId) {
        setRoomId(data.roomId);
        setView("setup");
      }
    } catch (err) {
      console.error(err);
      alert("Server is waking up (Render Free Tier). Please wait 10 seconds and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Please enter a nickname");
    joinRoom(roomId, `${avatar} ${nickname}`);
    setView("chat");
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}?join=${roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderGame = () => {
    const game = GAMES.find(g => g.id === activeGame);
    if (!game) return null;
    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black/98 z-[1000] flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center p-4 bg-[#111b21] border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <span className="text-xs font-black uppercase tracking-widest">{game.name}</span>
          </div>
          <button 
            onClick={closeGame}
            className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-red-500/20"
          >
            End Session
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
          <Suspense fallback={<div className="font-black text-blue-500 animate-bounce">SYNCING GAME STATE...</div>}>
            <SelectedGame
              socket={socket}
              roomId={roomId}
              scores={scores}
              username={username}
              opponent={opponent}
              updateScore={updateScore}
            />
          </Suspense>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#0b141a] text-white flex flex-col overflow-hidden relative font-sans">
      
      {/* CONNECTION STATUS BANNER - Click-through enabled */}
      {!connected && view !== "landing" && (
        <div className="absolute top-0 left-0 w-full bg-yellow-500/10 text-yellow-500 text-[9px] font-black text-center py-1 uppercase tracking-[0.3em] z-[50] pointer-events-none backdrop-blur-sm border-b border-yellow-500/10">
          Re-establishing secure connection...
        </div>
      )}

      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#111b21_0%,_#0b141a_100%)]">
          <div className="mb-12 text-center">
            <h1 className="text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
              EQUAL<span className="text-blue-500">.</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.5em] uppercase mt-2">Private Secure Messaging</p>
          </div>

          <button
            onClick={handleGenerateRoom}
            disabled={isLoading}
            className={`group relative overflow-hidden bg-blue-600 px-12 py-6 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-blue-600/30 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500'}`}
          >
            <span className={isLoading ? "opacity-0" : "opacity-100"}>Create Private Room</span>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>

          <div className="mt-12 flex flex-col items-center gap-4 w-full max-w-xs">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Or join existing</p>
            <div className="flex gap-2 w-full">
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="ROOM ID"
                className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white/10 transition-all uppercase"
              />
              <button
                onClick={() => { if(roomInput) { setRoomId(roomInput); setView("setup"); } }}
                className="bg-slate-800 hover:bg-slate-700 px-6 rounded-xl font-black text-[10px] uppercase transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#111b21] p-10 rounded-[40px] w-full max-w-sm border border-white/5 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <h2 className="text-center text-[10px] font-black uppercase tracking-[0.4em] mb-10 text-slate-500">Configure Identity</h2>
            
            <div className="flex gap-4 overflow-x-auto pb-6 mb-8 custom-scrollbar">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-3xl min-w-[70px] h-[70px] rounded-[24px] transition-all duration-300 ${
                    avatar === a ? "bg-blue-600 scale-110 shadow-xl shadow-blue-600/40" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="DISPLAY NAME"
              maxLength={12}
              className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl mb-8 text-center font-bold text-xl outline-none focus:border-blue-500 transition-all placeholder:opacity-20"
            />

            <button
              onClick={handleEnterChat}
              className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
            >
              Initialize Link
            </button>
          </div>
        </div>
      )}

      {view === "chat" && (
        <div className="flex flex-1 relative overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0">
            <header className="bg-[#111b21]/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/5 z-20">
              <div className="flex items-center gap-3">
                <div className="relative">
                   <span className="text-3xl">{avatar}</span>
                   <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#111b21] ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <div>
                  <div className="text-sm font-black uppercase flex gap-1 items-center">
                    {nickname} <FiShield size={12} className="text-blue-500"/>
                  </div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Channel: {roomId}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={copyInviteLink} 
                  className={`p-3 rounded-xl transition-all active:scale-90 ${copied ? "bg-green-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
                >
                  <FiShare2 size={18}/>
                </button>
                <button 
                  onClick={() => setShowMembers(!showMembers)} 
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl flex gap-2 items-center transition-all"
                >
                  <FiUsers size={18}/>
                  <span className="text-xs font-black">{users?.length || 1}</span>
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                >
                  <FiLogOut size={18}/>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
              <Chat />
            </div>

            {/* Game Launcher Bar */}
            <div className="bg-[#111b21] p-3 flex gap-2 overflow-x-auto border-t border-white/5 z-20 custom-scrollbar">
              {GAMES.map(game => (
                <button
                  key={game.id}
                  onClick={() => sendGameRequest(game.id)}
                  className="bg-[#202c33] hover:bg-blue-600 hover:text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 shrink-0 border border-white/5"
                >
                  <span className="text-lg">{game.icon}</span> {game.name}
                </button>
              ))}
            </div>
          </div>

          {/* Members Sidebar */}
          <aside className={`fixed right-0 top-0 h-full w-80 bg-[#0e161b] shadow-[-30px_0_60px_rgba(0,0,0,0.8)] z-[100] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${showMembers ? "translate-x-0" : "translate-x-full"}`}>
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Live Presence</span>
              <button onClick={() => setShowMembers(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><FiX size={20}/></button>
            </div>
            <div className="p-6 space-y-3">
              {users?.map((u, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/10">
                  <span className="text-2xl drop-shadow-md">{u.split(" ")[0]}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight">{u.split(" ").slice(1).join(" ")}</span>
                    {u.includes(nickname) && <span className="text-[8px] font-black text-blue-500 uppercase mt-0.5">Primary Device</span>}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {showMembers && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-in fade-in duration-500" onClick={() => setShowMembers(false)}></div>
          )}
        </div>
      )}

      {activeGame && renderGame()}
    </div>
  );
}

export default App;