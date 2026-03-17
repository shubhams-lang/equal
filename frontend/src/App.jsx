import React, { useContext, useState, useEffect, lazy, Suspense } from "react";
import { ChatContext } from "./context/ChatContext";
import { FiX, FiShield, FiUsers, FiShare2, FiLogOut } from "react-icons/fi";

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
    username // This is the full "Avatar + Nickname" string from context
  } = useContext(ChatContext);

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🐱");
  const [copied, setCopied] = useState(false);

  const AVATARS = ["🐱", "🐶", "🦊", "🤖", "👻", "👽", "👾", "🥷", "🧙", "🦁"];
  const API_URL = "https://equal.onrender.com";

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble }
  ];

  // Handle URL Joins
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
    try {
      const res = await fetch(`${API_URL}/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data?.roomId) {
        setRoomId(data.roomId);
        setView("setup");
      }
    } catch (err) {
      alert("Server is waking up. Please wait 30 seconds.");
    }
  };

  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Enter a nickname");
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
      <div className="fixed inset-0 bg-black/95 z-[1000] flex flex-col">
        <div className="flex justify-between items-center p-4 bg-[#111b21] border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <span className="text-xs font-black uppercase tracking-widest">{game.name}</span>
          </div>
          <button 
            onClick={closeGame}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
          >
            End Game
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Suspense fallback={<div className="font-black text-blue-500 animate-pulse">LOADING GAME...</div>}>
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
    <div className="h-screen bg-[#0b141a] text-white flex flex-col overflow-hidden relative">
      
      {/* CONNECTION STATUS BANNER */}
      {!connected && view !== "landing" && (
        <div className="absolute top-0 left-0 w-full bg-yellow-500/20 text-yellow-500 text-[9px] font-black text-center py-1 uppercase tracking-[0.2em] z-[50] pointer-events-none">
          RECONNECTING TO SECURE SERVER...
        </div>
      )}

      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <h1 className="text-8xl font-black text-blue-500 tracking-tighter">EQUAL</h1>
          <button
            onClick={handleGenerateRoom}
            className="bg-blue-600 hover:bg-blue-500 px-10 py-5 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-blue-600/20"
          >
            Create Private Room
          </button>
          <div className="flex gap-2">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="ROOM CODE"
              className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
            />
            <button
              onClick={() => { if(roomInput) { setRoomId(roomInput); setView("setup"); } }}
              className="bg-slate-800 px-6 rounded-xl font-black text-[10px] uppercase"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#111b21] p-10 rounded-[40px] w-full max-w-sm border border-white/5 shadow-2xl">
            <h2 className="text-center text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-slate-500">Identity</h2>
            <div className="flex gap-3 overflow-x-auto pb-4 mb-6 custom-scrollbar">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-3xl min-w-[64px] h-[64px] rounded-2xl transition-all ${
                    avatar === a ? "bg-blue-600 scale-110 shadow-lg shadow-blue-600/40" : "bg-white/5"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="NICKNAME"
              className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl mb-6 text-center font-bold text-xl outline-none focus:border-blue-500"
            />
            <button
              onClick={handleEnterChat}
              className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest"
            >
              Enter Chat
            </button>
          </div>
        </div>
      )}

      {view === "chat" && (
        <div className="flex flex-1 relative overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0">
            <header className="bg-[#111b21] p-4 flex justify-between items-center border-b border-white/5 z-20">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{avatar}</span>
                <div>
                  <div className="text-sm font-black uppercase flex gap-1 items-center">
                    {nickname} <FiShield size={12} className="text-blue-500"/>
                  </div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Room: {roomId}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={copyInviteLink} className={`p-3 rounded-xl transition-all ${copied ? "bg-green-600" : "bg-white/5 text-slate-400"}`}>
                  <FiShare2 size={18}/>
                </button>
                <button onClick={() => setShowMembers(!showMembers)} className="p-3 bg-white/5 text-slate-400 rounded-xl flex gap-2 items-center">
                  <FiUsers size={18}/>
                  <span className="text-xs font-black">{users?.length || 1}</span>
                </button>
                <button onClick={() => setView("landing")} className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                  <FiLogOut size={18}/>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
              <Chat />
            </div>

            <div className="bg-[#111b21] p-3 flex gap-2 overflow-x-auto border-t border-white/5 z-20">
              {GAMES.map(game => (
                <button
                  key={game.id}
                  onClick={() => sendGameRequest(game.id)}
                  className="bg-white/5 hover:bg-blue-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 shrink-0 border border-white/5"
                >
                  <span className="text-base">{game.icon}</span> {game.name}
                </button>
              ))}
            </div>
          </div>

          {/* Members Sidebar */}
          <aside className={`fixed right-0 top-0 h-full w-80 bg-[#0e161b] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-[100] transform transition-transform duration-300 ${showMembers ? "translate-x-0" : "translate-x-full"}`}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Online</span>
              <button onClick={() => setShowMembers(false)}><FiX size={20}/></button>
            </div>
            <div className="p-4 space-y-2">
              {users?.map((u, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-2xl">{u.split(" ")[0]}</span>
                  <span className="text-sm font-bold">{u.split(" ").slice(1).join(" ")}</span>
                </div>
              ))}
            </div>
          </aside>

          {showMembers && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={() => setShowMembers(false)}></div>
          )}
        </div>
      )}

      {activeGame && renderGame()}
    </div>
  );
}

export default App;