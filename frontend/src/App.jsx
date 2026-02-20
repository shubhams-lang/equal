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
  
  const [view, setView] = useState("landing");
  const [activeGame, setActiveGame] = useState(null);
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [roomSettings, setRoomSettings] = useState({ name: "", isEphemeral: true });

  // 1v1 States
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

  useEffect(() => {
    if (!socket) return;
    
    // Listen for 1v1 Challenges
    socket.on("receive-game-invite", (data) => {
      if (data.targetUser === username) {
        setPendingInvite(data);
      }
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

  const handleCreateRoom = async () => {
    try {
      const res = await fetch("http://localhost:5000/create-room", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomSettings)
      });
      const data = await res.json();
      setRoomId(data.roomId);
      setView("summary");
    } catch (err) { console.error("Failed to create room", err); }
  };

  const handleJoinRoom = async (code) => {
    const targetCode = code || roomInput;
    if (!targetCode) return;
    try {
      const res = await fetch(`http://localhost:5000/room/${targetCode}`);
      const data = await res.json();
      if (data.exists) {
        setRoomId(targetCode);
        socket.emit("join-room", { roomId: targetCode, username });
        setView("chat");
        window.history.replaceState({}, "", "/");
      } else alert("Room not found");
    } catch (err) { console.error(err); }
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    socket.emit("send-message", { roomId, message: msgInput, username });
    setMsgInput("");
  };

  // 1v1 Actions
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

      {/* PHASE 1: LANDING */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-sm text-center space-y-8">
            <div className="space-y-4">
              <div className="w-24 h-24 bg-gradient-to-tr from-[#2aabee] to-[#2481cc] rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-3 hover:rotate-0 transition-all">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
              </div>
              <h1 className="text-4xl font-black">Telegram</h1>
              <p className="text-gray-400">Anonymous, ephemeral, secure.</p>
            </div>
            <div className="space-y-4">
              <button onClick={() => setView("setup")} className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold hover:bg-[#2b8fdb] transition-all">CREATE ROOM</button>
              <div className="bg-[#17212b] p-2 rounded-2xl flex gap-2 border border-white/5">
                <input value={roomInput} onChange={(e) => setRoomInput(e.target.value)} placeholder="Invite Code" className="bg-transparent flex-1 px-4 outline-none uppercase font-mono text-sm" />
                <button onClick={() => handleJoinRoom()} className="bg-[#2481cc] px-6 py-3 rounded-xl font-bold">JOIN</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: SETUP */}
      {view === "setup" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom-8">
          <div className="w-full max-w-md bg-[#17212b] rounded-3xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold mb-6">Room Settings</h2>
            <div className="space-y-6">
              <input onChange={(e) => setRoomSettings({...roomSettings, name: e.target.value})} className="w-full bg-[#0e1621] border border-gray-700 rounded-xl p-4 outline-none focus:border-[#2481cc]" placeholder="Name your secret room..." />
              <div className="flex items-center justify-between p-4 bg-[#0e1621] rounded-2xl border border-gray-800">
                <div>
                  <p className="font-bold text-sm">Ephemeral Mode</p>
                  <p className="text-xs text-gray-500">History wipes on disconnect</p>
                </div>
                <input type="checkbox" checked={roomSettings.isEphemeral} onChange={(e) => setRoomSettings({...roomSettings, isEphemeral: e.target.checked})} className="w-5 h-5 accent-[#2481cc]" />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setView("landing")} className="flex-1 text-gray-500 font-bold">BACK</button>
                <button onClick={handleCreateRoom} className="flex-[2] bg-[#2481cc] py-4 rounded-xl font-bold">CREATE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: SUMMARY */}
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

      {/* PHASE 4: CHAT ROOM */}
      {view === "chat" && (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-[#0e1621] relative shadow-2xl">
          <div className="bg-[#17212b]/95 backdrop-blur-md h-16 flex items-center px-4 justify-between border-b border-black/20 z-20">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("landing")} className="p-2 hover:bg-white/5 rounded-full text-gray-400"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg></button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2aabee] to-[#2481cc] flex items-center justify-center font-bold">{roomSettings.name?.charAt(0).toUpperCase() || "R"}</div>
              <div>
                <h3 className="font-bold text-[15px]">{roomSettings.name || `Room ${roomId}`}</h3>
                <p className="text-[11px] text-[#64b5f6] font-bold">{users.length} ONLINE</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView("games")} className="p-2 text-orange-400 hover:bg-orange-400/10 rounded-full transition"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21,6H3C1.9,6,1,6.9,1,8v8c0,1.1,0.9,2,2,2h18c1.1,0,2-0.9,2-2V8C23,6.9,22.1,6,21,6z M10,13.5c0,0.8-0.7,1.5-1.5,1.5 S7,14.3,7,13.5V13H6.5C5.7,13,5,12.3,5,11.5S5.7,10,6.5,10H7v-0.5C7,8.7,7.7,8,8.5,8S10,8.7,10,9.5V10h0.5 c0.8,0,1.5,0.7,1.5,1.5S11.3,13,10.5,13H10V13.5z"/></svg></button>
              <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="p-2 text-gray-400 hover:text-white"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0e1621] custom-scrollbar" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`, backgroundBlendMode: 'soft-light' }}>
            {messages.map((m, i) => {
              const isMe = m.username === username;
              return (
                <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                  <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl ${isMe ? "bg-[#2b5278] rounded-tr-none" : "bg-[#182533] rounded-tl-none"}`}>
                    {!isMe && <p className="text-[12px] font-black text-[#64b5f6] mb-0.5 tracking-tight">{m.username}</p>}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <p className="text-[15px]">{m.text}</p>
                      <span className="text-[9px] text-white/40 font-bold ml-auto">12:00</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          <div className="bg-[#17212b] p-3 flex items-center gap-2 border-t border-black/10">
            <button className="p-2 text-gray-500 hover:text-[#2481cc]"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z" /></svg></button>
            <input value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Message" className="flex-1 bg-transparent px-2 outline-none text-[16px]" />
            <button onClick={sendMessage} className="text-[#2481cc] p-2"><svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg></button>
          </div>
        </div>
      )}

      {/* PHASE 5: GAME CENTER */}
      {view === "games" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0e1621] animate-in zoom-in-95">
          <div className="w-full max-w-2xl bg-[#17212b] rounded-3xl p-8 border border-white/5 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black">Game Center</h2>
                <p className="text-gray-400 text-xs">Room: {roomSettings.name || roomId}</p>
              </div>
              <button onClick={() => { setView("chat"); setActiveGame(null); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-full">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            {!activeGame ? (
              <div className="space-y-6">
                {/* 1v1 OPPONENT SELECTOR */}
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
                      <p className="text-[10px] text-gray-600 italic">Waiting for someone else to join the room...</p>
                    )}
                  </div>
                </div>

                {/* GAME LIST */}
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">2. Choose Game</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {GAMES.map((game) => (
                    <button 
                      key={game.id} 
                      disabled={!opponent}
                      onClick={() => sendInvite(game.id)} 
                      className={`group p-6 bg-[#0e1621] rounded-2xl border transition-all flex flex-col items-center gap-3 ${!opponent ? 'opacity-20 cursor-not-allowed' : 'border-white/5 hover:border-[#2481cc]'}`}
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">{game.icon}</span>
                      <span className="font-bold text-[10px] uppercase tracking-widest">{game.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in fade-in duration-500">
                <div className="mb-4 text-[10px] font-bold text-[#2481cc] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Playing VS: {opponent}
                </div>
                <div className="w-full aspect-video bg-black/20 rounded-2xl mb-6 flex items-center justify-center border border-white/5 overflow-hidden">
                  {GAMES.map(game => (
                    activeGame === game.id && (
                      <game.Component 
                        key={game.id} 
                        socket={socket} 
                        roomId={roomId} 
                        username={username} 
                        opponent={opponent} // Passing opponent prop to games
                      />
                    )
                  ))}
                </div>
                <button onClick={() => {setActiveGame(null); setOpponent(null);}} className="text-xs font-bold text-red-500 hover:underline uppercase tracking-tighter">Exit to Menu</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;