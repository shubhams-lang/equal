import React, { useContext, useState, useEffect, lazy, Suspense } from "react";
import { ChatContext } from "./context/ChatContext";
import { FiUsers, FiShare2, FiLogOut, FiShield } from "react-icons/fi";
import Chat from "./components/Chat";

// Lazy loading games for performance
const Pong = lazy(() => import("./components/Games/Pong"));
const TicTacToe = lazy(() => import("./components/Games/TicTacToe"));
const SliderRace = lazy(() => import("./components/Games/SlideRace"));
const TapTap = lazy(() => import("./components/Games/TapTap"));
const WordScramble = lazy(() => import("./components/Games/WordScramble"));

function App() {
  const { 
    roomId, setRoomId, connected, joinRoom, users, 
    activeGame, closeGame, socket, scores, username 
  } = useContext(ChatContext);
  
  const [view, setView] = useState("landing");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = "https://equal.onrender.com";

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

  const handleCreate = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      console.log("Attempting to connect to:", `${API_URL}/create-room`);
      
      const res = await fetch(`${API_URL}/create-room`, { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });

      // If the server responds but with an error code (404, 500, etc.)
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server Status ${res.status}: ${errorText}`);
      }

      const rawText = await res.text();
      console.log("Raw Server Response:", rawText);

      // Parse JSON safely
      const data = JSON.parse(rawText);

      if (data && data.roomId) {
        setRoomId(data.roomId);
        setView("setup");
      } else {
        throw new Error("Server did not return a valid roomId string.");
      }

    } catch (err) {
      console.error("❌ ROOM CREATION FAILED:", err);
      // This will now show the REAL error instead of the "Waking Up" message
      alert(`Error connecting to server: ${err.message}\n\nPlease check the Console (F12) for exact details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    if (nickname.trim()) {
      joinRoom(roomId, nickname);
      setView("chat");
    } else {
      alert("Please enter a nickname");
    }
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}?join=${roomId}`;
    await navigator.clipboard.writeText(url);
    alert("Invite link copied to clipboard!");
  };

  return (
    <div className="h-screen bg-[#0b141a] text-white overflow-hidden relative font-sans">
      
      {/* SECURE CONNECTION BANNER */}
      {!connected && view !== "landing" && (
        <div className="absolute top-0 w-full bg-yellow-500/10 text-yellow-500 py-1 text-[10px] text-center font-black z-50 pointer-events-none uppercase tracking-widest backdrop-blur-sm">
          Secure Connection Re-establishing...
        </div>
      )}

      {/* LANDING VIEW */}
      {view === "landing" && (
        <div className="flex flex-col items-center justify-center h-full p-4 bg-[radial-gradient(circle_at_center,_#111b21_0%,_#0b141a_100%)]">
          <h1 className="text-8xl font-black mb-10 tracking-tighter drop-shadow-2xl">
            EQUAL<span className="text-blue-500">.</span>
          </h1>
          <button 
            onClick={handleCreate}
            disabled={isLoading}
            className="bg-blue-600 px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-blue-600/30"
          >
            {isLoading ? "Connecting to Server..." : "Create Private Room"}
          </button>
        </div>
      )}

      {/* SETUP VIEW */}
      {view === "setup" && (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="bg-[#111b21] p-10 rounded-[40px] w-full max-w-sm border border-white/5 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <h2 className="text-center text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-slate-500">Identity</h2>
            <input 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="DISPLAY NAME"
              maxLength={15}
              className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl mb-6 text-center font-bold text-xl outline-none focus:border-blue-500 transition-all placeholder:opacity-30"
            />
            <button 
              onClick={handleStart} 
              className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Enter Chat
            </button>
          </div>
        </div>
      )}

      {/* CHAT VIEW */}
      {view === "chat" && (
        <div className="flex flex-col h-full relative">
          <header className="bg-[#111b21]/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/5 z-20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black text-xl">
                  {nickname.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#111b21] ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <div>
                <div className="text-sm font-black uppercase flex gap-1 items-center">
                  {nickname} <FiShield size={12} className="text-blue-500"/>
                </div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Room: {roomId}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={copyInviteLink} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all">
                <FiShare2 size={18}/>
              </button>
              <div className="bg-white/5 px-4 flex items-center gap-2 rounded-xl text-xs font-black text-slate-300">
                <FiUsers size={16}/> {users.length}
              </div>
              <button onClick={() => window.location.reload()} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all">
                <FiLogOut size={18}/>
              </button>
            </div>
          </header>
          
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>
        </div>
      )}

      {/* GAME OVERLAY */}
      {activeGame && (
        <div className="fixed inset-0 bg-black/98 z-[1000] flex flex-col animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center p-4 bg-[#111b21] border-b border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className="text-white">{activeGame}</span> SESSION
            </span>
            <button 
              onClick={closeGame} 
              className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
            >
              End Game
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Suspense fallback={<div className="font-black text-blue-500 animate-pulse">LOADING GAME ASSETS...</div>}>
              {activeGame === "Pong" && <Pong socket={socket} roomId={roomId} scores={scores} username={username} />}
              {activeGame === "TicTacToe" && <TicTacToe socket={socket} roomId={roomId} scores={scores} username={username} />}
              {activeGame === "SlideRace" && <SliderRace socket={socket} roomId={roomId} scores={scores} username={username} />}
              {activeGame === "TapTap" && <TapTap socket={socket} roomId={roomId} scores={scores} username={username} />}
              {activeGame === "WordScramble" && <WordScramble socket={socket} roomId={roomId} scores={scores} username={username} />}
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;