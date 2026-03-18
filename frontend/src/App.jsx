import React, { useContext, useState, useEffect, lazy, Suspense } from "react";
import { ChatContext } from "./context/ChatContext";
import { FiUsers, FiShare2, FiLogOut, FiShield, FiPlus, FiArrowRight } from "react-icons/fi";
import Chat from "./components/Chat";

// Lazy loading for performance optimization
const Pong = lazy(() => import("./components/Games/Pong"));
const TicTacToe = lazy(() => import("./components/Games/TicTacToe"));

function App() {
  const context = useContext(ChatContext) || {};
  const { 
    roomId, setRoomId, connected, joinRoom, users = [], 
    activeGame, closeGame, socket, scores = {}, username 
  } = context;
  
  const [view, setView] = useState("landing");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const API_URL = "https://equal.onrender.com";

  // URL Deep Linking for Room Joins
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code && typeof setRoomId === "function") {
      setRoomId(code);
      setView("setup");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setRoomId]);

  const handleCreate = async () => {
    if (isLoading || typeof setRoomId !== "function") return;
    setIsLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/create-room`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error(`Server status: ${res.status}`);

      const data = await res.json();
      console.log("Server Payload:", data);

      // Smart Parsing: Handles roomId, room, id, or raw string
      const finalId = data.roomId || data.room || data.id || (typeof data === 'string' ? data : null);

      if (finalId) {
        setRoomId(finalId);
        setView("setup");
      } else {
        throw new Error("Could not find Room ID in server response");
      }

    } catch (err) {
      console.error("Connection Error:", err);
      alert(`Room Creation Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    if (nickname.trim() && typeof joinRoom === "function") {
      joinRoom(roomId, nickname);
      setView("chat");
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}?join=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="h-screen bg-[#0b141a] text-slate-100 overflow-hidden relative font-sans selection:bg-blue-500/30">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Global Connection Status */}
      {!connected && view !== "landing" && (
        <div className="absolute top-0 w-full bg-amber-500/10 text-amber-500 py-1.5 text-[10px] text-center font-black z-50 uppercase tracking-[0.2em] backdrop-blur-md border-b border-amber-500/20">
          Encrypted Connection Interrupted...
        </div>
      )}

      {/* LANDING SCREEN */}
      {view === "landing" && (
        <div className="flex flex-col items-center justify-center h-full relative z-10 px-6">
          <div className="text-center mb-12">
            <h1 className="text-9xl font-black tracking-tighter text-white drop-shadow-2xl">
              EQUAL<span className="text-blue-500">.</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.6em] text-[10px] mt-4">
              End-to-End Private Messaging
            </p>
          </div>

          <button 
            onClick={handleCreate}
            disabled={isLoading}
            className="group relative bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-10 transition-opacity" />
            {isLoading ? "Negotiating..." : "Create Secure Room"}
            <FiPlus className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      )}

      {/* IDENTITY SETUP SCREEN */}
      {view === "setup" && (
        <div className="flex flex-col items-center justify-center h-full p-6 relative z-10">
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] w-full max-w-sm backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="w-20 h-20 bg-blue-600 mx-auto mb-8 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-3xl font-black">
              {nickname ? nickname.charAt(0).toUpperCase() : "?"}
            </div>
            <h2 className="text-center text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-slate-400">Identify Yourself</h2>
            <input 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="YOUR ALIAS"
              className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl mb-6 text-center font-bold text-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:opacity-20"
            />
            <button 
              onClick={handleStart} 
              className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              Start Session <FiArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* MAIN CHAT INTERFACE */}
      {view === "chat" && (
        <div className="flex flex-col h-full relative z-10">
          <header className="bg-[#111b21]/60 backdrop-blur-xl p-5 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                  {nickname.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#0b141a] ${connected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              </div>
              <div>
                <div className="text-sm font-black uppercase flex gap-2 items-center tracking-tight">
                  {nickname} <FiShield size={14} className="text-blue-500"/>
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                  ID: {roomId}
                  <button onClick={copyLink} className="hover:text-white transition-colors">
                    <FiShare2 size={10} className={copyFeedback ? "text-emerald-400" : ""}/>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-3 border border-white/5">
                <FiUsers className="text-blue-400" size={16}/> 
                <span className="text-xs font-black">{users.length}</span>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/10"
              >
                <FiLogOut size={20}/>
              </button>
            </div>
          </header>
          
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>
        </div>
      )}

      {/* FULLSCREEN GAME MODAL */}
      {activeGame && (
        <div className="fixed inset-0 bg-black/98 z-[1000] flex flex-col p-4 backdrop-blur-3xl animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6 px-4">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
               <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Live {activeGame} Match</span>
            </div>
            <button 
              onClick={() => closeGame && closeGame()} 
              className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-white/5"
            >
              Terminate Session
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center border border-white/5 rounded-[3rem] bg-black/40 overflow-hidden relative">
            <Suspense fallback={<div className="font-black text-blue-500 animate-pulse tracking-widest uppercase text-xs">Synchronizing Game State...</div>}>
              {activeGame === "Pong" && <Pong socket={socket} roomId={roomId} scores={scores} username={username} />}
              {activeGame === "TicTacToe" && <TicTacToe socket={socket} roomId={roomId} scores={scores} username={username} />}
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;