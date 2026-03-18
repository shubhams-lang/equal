import React, { useContext, useState, useEffect, lazy, Suspense } from "react";
import { ChatContext } from "./context/ChatContext";
import { FiUsers, FiShare2, FiLogOut, FiShield } from "react-icons/fi";
import Chat from "./components/Chat";

// Lazy loading components
const Pong = lazy(() => import("./components/Games/Pong"));
const TicTacToe = lazy(() => import("./components/Games/TicTacToe"));

function App() {
  // Use an empty object fallback to prevent destructuring errors
  const context = useContext(ChatContext) || {};
  
  const { 
    roomId, 
    setRoomId, 
    connected, 
    joinRoom, 
    users = [], 
    activeGame, 
    closeGame, 
    socket, 
    scores = {}, 
    username 
  } = context;
  
  const [view, setView] = useState("landing");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = "https://equal.onrender.com";

  // URL Join Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    // CRITICAL: Check if setRoomId exists before calling
    if (code && typeof setRoomId === "function") {
      setRoomId(code);
      setView("setup");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setRoomId]);

  const handleCreate = async () => {
    if (isLoading) return;
    
    // SAFETY CHECK: If setRoomId is missing from Context, stop here
    if (typeof setRoomId !== "function") {
      console.error("Context Error: setRoomId is not a function. Check ChatContext provider value.");
      alert("Application Error: Chat Provider is not initialized correctly.");
      return;
    }

    setIsLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/create-room`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data?.roomId) {
        setRoomId(data.roomId);
        setView("setup");
      } else {
        throw new Error("Invalid server response");
      }

    } catch (err) {
      console.error("❌ ROOM CREATION FAILED:", err);
      // Detailed alert to help you debug the actual network failure
      alert(`Failed to create room: ${err.message}. Ensure backend CORS allows this origin.`);
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

  return (
    <div className="h-screen bg-[#0b141a] text-white overflow-hidden relative font-sans">
      
      {/* Banner shows if socket is not 101 Switching Protocols */}
      {!connected && view !== "landing" && (
        <div className="absolute top-0 w-full bg-yellow-500/10 text-yellow-500 py-1 text-[10px] text-center font-black z-50 pointer-events-none uppercase">
          Reconnecting to Secure Server...
        </div>
      )}

      {view === "landing" && (
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-8xl font-black mb-10 tracking-tighter italic">
            EQUAL<span className="text-blue-500">.</span>
          </h1>
          <button 
            onClick={handleCreate}
            disabled={isLoading}
            className="bg-blue-600 px-12 py-5 rounded-2xl font-black uppercase hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Private Room"}
          </button>
        </div>
      )}

      {view === "setup" && (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="bg-[#111b21] p-10 rounded-[40px] w-full max-w-sm border border-white/5">
            <input 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="DISPLAY NAME"
              className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl mb-6 text-center font-bold text-xl outline-none focus:border-blue-500"
            />
            <button 
              onClick={handleStart} 
              className="w-full bg-blue-600 py-5 rounded-2xl font-black"
            >
              Enter Chat
            </button>
          </div>
        </div>
      )}

      {view === "chat" && (
        <div className="flex flex-col h-full">
          <header className="bg-[#111b21] p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
              <FiShield className="text-blue-500"/>
              <span className="text-xs font-black uppercase">{nickname}</span>
            </div>
            <div className="flex gap-2">
              <div className="bg-white/5 px-4 py-2 rounded-xl text-xs font-black">
                <FiUsers className="inline mr-2"/>{users.length}
              </div>
              <button onClick={() => window.location.reload()} className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                <FiLogOut/>
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>
        </div>
      )}

      {activeGame && (
        <div className="fixed inset-0 bg-black/95 z-[1000] flex flex-col p-4">
          <div className="flex justify-end mb-4">
            <button onClick={() => closeGame && closeGame()} className="bg-red-500 px-4 py-2 rounded-lg font-bold">CLOSE</button>
          </div>
          <Suspense fallback={<div>Loading Game...</div>}>
            {activeGame === "Pong" && <Pong socket={socket} roomId={roomId} scores={scores} username={username} />}
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default App;