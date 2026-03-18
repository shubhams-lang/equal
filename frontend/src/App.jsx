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
  // Pulling values from context with fallbacks to prevent destructuring errors
  const context = useContext(ChatContext) || {};
  const {
    roomId,
    setRoomId,
    users = [],
    opponent,
    activeGame,
    scores = {},
    updateScore,
    sendGameRequest,
    closeGame,
    joinRoom,
    socket,
    connected: contextConnected // Using context-based connection status
  } = context;

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🐱");
  const [copied, setCopied] = useState(false);
  const [localConnected, setLocalConnected] = useState(true);

  const AVATARS = ["🐱", "🐶", "🦊", "🤖", "👻", "👽", "👾", "🥷", "🧙", "🦁"];
  const API_URL = "https://equal.onrender.com";

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble }
  ];

  // 1. Handle Join Link Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code && typeof setRoomId === "function") {
      setRoomId(code);
      setView("setup");
      // Clean URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setRoomId]);

  // 2. Sync connection status
  useEffect(() => {
    if (!socket) return;
    setLocalConnected(socket.connected);
    socket.on("connect", () => setLocalConnected(true));
    socket.on("disconnect", () => setLocalConnected(false));
    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  const handleGenerateRoom = async () => {
    try {
      const res = await fetch(`${API_URL}/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Server error " + res.status);
      const data = await res.json();
      
      const newRoomId = data.roomId || data.room || data.id;
      if (newRoomId && typeof setRoomId === "function") {
        setRoomId(newRoomId);
        setView("setup");
      } else {
        alert("Failed to create room ID");
      }
    } catch (err) {
      console.error("Room creation failed:", err);
      alert("Server is waking up. Please wait 30 seconds and try again.");
    }
  };

  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Enter a nickname");
    if (typeof joinRoom === "function") {
      joinRoom(roomId, `${avatar} ${nickname}`);
      setView("chat");
    }
  };

  const handleExitRoom = () => {
    if (!window.confirm("Leave this room?")) return;
    if (socket && roomId) {
      socket.emit("leave-room", { roomId, username: `${avatar} ${nickname}` });
    }
    setRoomId(null);
    setNickname("");
    setView("landing");
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}?join=${roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert("Link Copied!");
  };

  const handleReaction = (msgId, emoji) => {
    if (socket && roomId) {
      socket.emit("send-reaction", {
        roomId, msgId, emoji, username: `${avatar} ${nickname}`
      });
    }
  };

  const renderGame = () => {
    const game = GAMES.find(g => g.id === activeGame);
    if (!game) return null;
    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 bg-[#111b21]">
          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <span className="text-xs font-bold uppercase">{game.name}</span>
          </div>
          <button onClick={() => closeGame && closeGame()} className="bg-red-500/20 px-4 py-2 rounded-lg text-xs">
            End Game
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Suspense fallback={<div className="text-[#25D366] font-bold">Loading Game Assets...</div>}>
            <SelectedGame
              socket={socket}
              roomId={roomId}
              scores={scores}
              username={`${avatar} ${nickname}`}
              opponent={opponent}
              updateScore={updateScore}
            />
          </Suspense>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#0b141a] text-white flex flex-col font-sans">
      {/* LANDING VIEW */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <h1 className="text-7xl font-black text-[#25D366] tracking-tighter">EQUAL</h1>
          <button
            onClick={handleGenerateRoom}
            className="bg-[#25D366] px-10 py-4 rounded-2xl font-black text-black hover:scale-105 transition-transform"
          >
            Create Private Room
          </button>
          <div className="flex gap-2">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Room Code"
              className="bg-white/5 p-4 rounded-xl border border-white/10 outline-none focus:border-[#25D366]"
            />
            <button
              onClick={() => { if(roomInput) { setRoomId(roomInput); setView("setup"); } }}
              className="bg-slate-700 px-8 rounded-xl font-bold"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* SETUP VIEW */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-[#111b21] p-10 rounded-[40px] w-full max-w-sm border border-white/5 shadow-2xl">
            <h2 className="text-center text-xs font-black uppercase tracking-widest mb-8 text-slate-500">Identity</h2>
            <div className="flex gap-3 overflow-x-auto pb-4 mb-6 custom-scrollbar">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-3xl p-4 rounded-2xl transition-all ${avatar === a ? "bg-[#25D366] scale-110 shadow-lg shadow-[#25D366]/20" : "bg-white/5 hover:bg-white/10"}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              className="w-full bg-black/40 p-5 rounded-2xl mb-6 text-center font-bold text-xl outline-none border border-white/5 focus:border-[#25D366]"
            />
            <button
              onClick={handleEnterChat}
              className="w-full bg-[#25D366] py-5 rounded-2xl text-black font-black uppercase tracking-widest shadow-lg shadow-[#25D366]/20"
            >
              Enter Chat
            </button>
          </div>
        </div>
      )}

      {/* CHAT VIEW */}
      {view === "chat" && (
        <div className="flex flex-1 relative overflow-hidden">
          <div className="flex flex-col flex-1">
            <header className="bg-[#111b21] p-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-3xl drop-shadow-md">{avatar}</span>
                <div>
                  <div className="text-sm font-black text-[#25D366] flex gap-1 items-center uppercase tracking-tight">
                    {nickname} <FiShield size={12} />
                  </div>
                  <div className="text-[9px] text-slate-500 font-bold">ROOM {roomId}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={copyInviteLink} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <FiShare2 />
                </button>
                <button onClick={() => setShowMembers(!showMembers)} className="p-3 bg-white/5 rounded-xl flex gap-2 items-center hover:bg-white/10">
                  <FiUsers />
                  <span className="text-xs font-black">{users?.length || 1}</span>
                </button>
                <button onClick={handleExitRoom} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                  <FiLogOut />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
              <Chat onReact={handleReaction} />
            </div>

            <div className="bg-[#111b21] p-3 flex gap-2 overflow-x-auto border-t border-white/5">
              {GAMES.map(game => (
                <button
                  key={game.id}
                  onClick={() => sendGameRequest && sendGameRequest(game.id)}
                  className="bg-white/5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 whitespace-nowrap border border-white/5"
                >
                  <span className="text-lg">{game.icon}</span> {game.name}
                </button>
              ))}
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className={`fixed right-0 top-0 h-full w-72 bg-[#0e161b] z-50 transform transition-transform duration-300 ease-in-out border-l border-white/5 ${showMembers ? "translate-x-0 shadow-2xl" : "translate-x-full"}`}>
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Online Users</span>
              <button onClick={() => setShowMembers(false)} className="p-2 hover:bg-white/5 rounded-lg"><FiX /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-80px)]">
              {users?.map((u, i) => {
                const parts = u.split(" ");
                const uAvatar = parts[0];
                const uName = parts.slice(1).join(" ");
                return (
                  <div key={i} className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-2xl">{uAvatar}</span>
                    <span className="text-sm font-bold truncate">
                      {uName} {uName === nickname && <span className="text-[#25D366] text-[10px] ml-1">(YOU)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>

          {showMembers && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setShowMembers(false)} />}
        </div>
      )}

      {activeGame && renderGame()}
    </div>
  );
}

export default App;