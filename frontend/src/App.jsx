import React, { useContext, useState, useEffect, useRef } from "react";
import { ChatContext } from "./context/ChatContext";

// --- GAME IMPORTS ---
import Pong from "./components/Games/Pong";
import SliderRace from "./components/Games/SlideRace";
import TapTap from "./components/Games/TapTap";
import TicTacToe from "./components/Games/TicTacToe";
import WordScramble from "./components/Games/WordScramble";

function App() {
  const { messages, roomId, setRoomId, users, username, socket } = useContext(ChatContext);

  // --- UI STATES ---
  const [view, setView] = useState("landing");
  const [activeGame, setActiveGame] = useState(null);
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [roomSettings, setRoomSettings] = useState({ name: "", isEphemeral: true });
  const [isWaking, setIsWaking] = useState(false); // New state for Render wake-up

  // --- 1v1 STATES ---
  const [opponent, setOpponent] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);

  const scrollRef = useRef(null);

  const GAMES = [
    { id: "pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "tictactoe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "taptap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "slider", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "word", name: "Scramble", icon: "🔠", Component: WordScramble },
  ];

  const API_URL = "https://equal.onrender.com"; 

  // --- EFFECTS ---
  useEffect(() => {
    if (!socket) return;
    socket.on("receive-game-invite", (data) => {
      if (data.targetUser === username) setPendingInvite(data);
    });
    return () => socket.off("receive-game-invite");
  }, [socket, username]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("join");
    if (inviteCode && !roomId) handleJoinRoom(inviteCode);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- ROOM HANDLERS ---
  const handleCreateRoom = async () => {
    setIsWaking(true); 
    try {
      const res = await fetch(`${API_URL}/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomSettings),
      });

      if (!res.ok) throw new Error("Server is still waking up...");

      const data = await res.json();
      setRoomId(data.roomId);
      setView("summary");
    } catch (err) {
      console.error("Create Room Error:", err);
      alert("The server is currently waking up (Render Free Tier). Please wait 30 seconds and try again!");
    } finally {
      setIsWaking(false);
    }
  };

  const handleJoinRoom = async (code) => {
    const targetCode = code || roomInput;
    if (!targetCode) return;
    setIsWaking(true);
    try {
      const res = await fetch(`${API_URL}/room/${targetCode}`);
      if (!res.ok) throw new Error("Room lookup failed");
      const data = await res.json();

      if (data.exists) {
        setRoomId(targetCode);
        socket.emit("join-room", { roomId: targetCode, username });
        setView("chat");
        window.history.replaceState({}, "", "/");
      } else {
        alert("Invite code invalid or expired.");
      }
    } catch (err) {
      console.error("Join error:", err);
      alert("Connection failed. The server might be sleeping.");
    } finally {
      setIsWaking(false);
    }
  };

  // --- CHAT & GAME HANDLERS ---
  const sendMessage = () => {
    if (!msgInput.trim()) return;
    socket.emit("send-message", { roomId, message: msgInput, username });
    setMsgInput("");
  };

  const sendInvite = (gameId) => {
    if (!opponent) return alert("Select an opponent first!");
    setActiveGame(gameId);
    socket.emit("send-game-invite", { roomId, gameId, targetUser: opponent, sender: username });
  };

  const acceptInvite = () => {
    setOpponent(pendingInvite.sender);
    setActiveGame(pendingInvite.gameId);
    setView("games");
    setPendingInvite(null);
  };

  const inviteLink = `${window.location.origin}?join=${roomId}`;

  return (
    <div className="h-screen bg-[#0e1621] text-white font-sans flex flex-col overflow-hidden selection:bg-[#2481cc]/30">
      
      {/* 1v1 INVITE POPUP */}
      {pendingInvite && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-[#17212b] border-2 border-[#2481cc] p-4 rounded-2xl shadow-2xl animate-bounce">
          <p className="text-sm font-bold mb-3">🎮 {pendingInvite.sender} challenged you to {pendingInvite.gameId}!</p>
          <div className="flex gap-2">
            <button onClick={acceptInvite} className="flex-1 bg-[#2481cc] py-2 rounded-xl text-xs font-bold">ACCEPT</button>
            <button onClick={() => setPendingInvite(null)} className="flex-1 bg-red-500/20 text-red-500 py-2 rounded-xl text-xs font-bold">DECLINE</button>
          </div>
        </div>
      )}

      {/* VIEW: LANDING */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-sm text-center space-y-8">
            <div className="space-y-4">
              <div className="w-24 h-24 bg-gradient-to-tr from-[#2aabee] to-[#2481cc] rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
              </div>
              <h1 className="text-4xl font-black">SecureChat</h1>
              <p className="text-gray-400">Anonymous, ephemeral, secure.</p>
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => setView("setup")} 
                disabled={isWaking}
                className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold hover:bg-[#2b8fdb] transition-all disabled:opacity-50"
              >
                {isWaking ? "WAKING SERVER..." : "CREATE ROOM"}
              </button>
              <div className="bg-[#17212b] p-2 rounded-2xl flex gap-2 border border-white/5">
                <input 
                  value={roomInput} 
                  onChange={(e) => setRoomInput(e.target.value)} 
                  placeholder="Invite Code" 
                  className="bg-transparent flex-1 px-4 outline-none uppercase font-mono text-sm" 
                />
                <button 
                   onClick={() => handleJoinRoom()} 
                   disabled={isWaking}
                   className="bg-[#2481cc] px-6 py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  JOIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SETUP */}
      {view === "setup" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom-8">
          <div className="w-full max-w-md bg-[#17212b] rounded-3xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold mb-6">Room Settings</h2>
            <div className="space-y-6">
              <input 
                onChange={(e) => setRoomSettings({...roomSettings, name: e.target.value})} 
                className="w-full bg-[#0e1621] border border-gray-700 rounded-xl p-4 outline-none focus:border-[#2481cc]" 
                placeholder="Name your secret room..." 
              />
              <div className="flex items-center justify-between p-4 bg-[#0e1621] rounded-2xl border border-gray-800">
                <div>
                  <p className="font-bold text-sm">Ephemeral Mode</p>
                  <p className="text-xs text-gray-500">History wipes on disconnect</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={roomSettings.isEphemeral} 
                  onChange={(e) => setRoomSettings({...roomSettings, isEphemeral: e.target.checked})} 
                  className="w-5 h-5 accent-[#2481cc]" 
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setView("landing")} className="flex-1 text-gray-500 font-bold">BACK</button>
                <button 
                  onClick={handleCreateRoom} 
                  disabled={isWaking}
                  className="flex-[2] bg-[#2481cc] py-4 rounded-xl font-bold hover:brightness-110"
                >
                  {isWaking ? "CREATING..." : "CREATE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SUMMARY */}
      {view === "summary" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in zoom-in-95">
          <div className="w-full max-w-sm bg-[#17212b] rounded-3xl p-8 text-center border border-white/5">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Room Created!</h2>
            <div className="bg-[#0e1621] p-3 rounded-xl mb-6 flex items-center justify-between border border-gray-700">
              <code className="text-[#64b5f6] font-mono text-xs truncate mr-2">{inviteLink}</code>
              <button onClick={() => {navigator.clipboard.writeText(inviteLink); alert("Link Copied!")}} className="bg-[#2481cc] text-[10px] px-3 py-1.5 rounded-lg font-black">COPY</button>
            </div>
            <button onClick={() => { socket.emit("join-room", { roomId, username }); setView("chat"); }} className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold">ENTER CHAT</button>
          </div>
        </div>
      )}

      {/* VIEW: CHAT ROOM */}
      {view === "chat" && (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-[#0e1621] relative shadow-2xl">
          <div className="bg-[#17212b]/95 backdrop-blur-md h-16 flex items-center px-4 justify-between border-b border-black/20 z-20">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("landing")} className="p-2 hover:bg-white/5 rounded-full text-gray-400">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2aabee] to-[#2481cc] flex items-center justify-center font-bold">
                {roomSettings.name?.charAt(0).toUpperCase() || "R"}
              </div>
              <div>
                <h3 className="font-bold text-[15px]">{roomSettings.name || `Room ${roomId}`}</h3>
                <p className="text-[11px] text-[#64b5f6] font-bold">{users.length} ONLINE</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView("games")} className="p-2 text-orange-400 hover:bg-orange-400/10 rounded-full">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21,6H3C1.9,6,1,6.9,1,8v8c0,1.1,0.9,2,2,2h18c1.1,0,2-0.9,2-2V8C23,6.9,22.1,6,21,6z M10,13.5c0,0.8-0.7,1.5-1.5,1.5 S7,14.3,7,13.5V13H6.5C5.7,13,5,12.3,5,11.5S5.7,10,6.5,10H7v-0.5C7,8.7,7.7,8,8.5,8S10,8.7,10,9.5V10h0.5 c0.8,0,1.5,0.7,1.5,1.5S11.3,13,10.5,13H10V13.5z"/></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0e1621] custom-scrollbar">
            {messages.map((m, i) => {
              const isMe = m.username === username;
              return (
                <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl ${isMe ? "bg-[#2b5278] rounded-tr-none" : "bg-[#182533] rounded-tl-none"}`}>
                    {!isMe && <p className="text-[12px] font-black text-[#64b5f6] mb-0.5">{m.username}</p>}
                    <p className="text-[15px]">{m.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          <div className="bg-[#17212b] p-3 flex items-center gap-2 border-t border-black/10">
            <input 
              value={msgInput} 
              onChange={(e) => setMsgInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
              placeholder="Message" 
              className="flex-1 bg-transparent px-2 outline-none" 
            />
            <button onClick={sendMessage} className="text-[#2481cc] p-2">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
            </button>
          </div>
        </div>
      )}

      {/* VIEW: GAME CENTER */}
      {view === "games" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0e1621] animate-in zoom-in-95">
          <div className="w-full max-w-2xl bg-[#17212b] rounded-3xl p-8 border border-white/5 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black">Game Center</h2>
              <button onClick={() => { setView("chat"); setActiveGame(null); }} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            {!activeGame ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">1. Select Opponent</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {users.filter(u => u !== username).length > 0 ? (
                      users.filter(u => u !== username).map(u => (
                        <button key={u} onClick={() => setOpponent(u)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${opponent === u ? 'bg-[#2481cc] border-[#2481cc]' : 'border-gray-700 hover:border-gray-500'}`}>
                          {u}
                        </button>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-600 italic">Waiting for others to join...</p>
                    )}
                  </div>
                </div>

                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">2. Choose Game</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {GAMES.map((game) => (
                    <button 
                      key={game.id} 
                      disabled={!opponent}
                      onClick={() => sendInvite(game.id)} 
                      className={`p-6 bg-[#0e1621] rounded-2xl border transition-all flex flex-col items-center gap-3 ${!opponent ? 'opacity-20' : 'border-white/5 hover:border-[#2481cc]'}`}
                    >
                      <span className="text-4xl">{game.icon}</span>
                      <span className="font-bold text-[10px] uppercase tracking-widest">{game.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in fade-in duration-500">
                <div className="mb-4 text-[10px] font-bold text-[#2481cc] uppercase tracking-widest">Playing VS: {opponent}</div>
                <div className="w-full aspect-video bg-black/20 rounded-2xl mb-6 flex items-center justify-center border border-white/5">
                  {GAMES.map(game => (
                    activeGame === game.id && (
                      <game.Component 
                        key={game.id} 
                        socket={socket} 
                        roomId={roomId} 
                        username={username} 
                        opponent={opponent} 
                      />
                    )
                  ))}
                </div>
                <button onClick={() => {setActiveGame(null); setOpponent(null);}} className="text-xs font-bold text-red-500 hover:underline">Exit Menu</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;