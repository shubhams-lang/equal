import React, { useContext, useState, useEffect, useRef } from "react";
import { ChatContext } from "./context/ChatContext";

// --- GAME IMPORTS ---
import Pong from "./components/Games/Pong";
import SliderRace from "./components/Games/SlideRace";
import TapTap from "./components/Games/TapTap";
import TicTacToe from "./components/Games/TicTacToe";
import WordScramble from "./components/Games/WordScramble";

function App() {
  const { 
    messages, roomId, setRoomId, users, username, socket, activeGame, 
    pendingInvite, setPendingInvite, scores, updateScore, sendImage,
    isOpponentTyping, setTypingStatus,
    sendGameRequest, acceptGameRequest, declineGameRequest, closeGame 
  } = useContext(ChatContext);

  // --- UI STATES ---
  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [roomSettings, setRoomSettings] = useState({ name: "", isEphemeral: true });
  const [isWaking, setIsWaking] = useState(false);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Scramble", icon: "🔠", Component: WordScramble },
  ];

  const API_URL = "https://equal.onrender.com"; 
  const opponent = users.find(u => u !== username);
  const isHost = opponent ? username < opponent : true;

  // --- EFFECTS ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("join");
    if (inviteCode && !roomId) handleJoinRoom(inviteCode);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpponentTyping]);

  useEffect(() => {
    if (activeGame) setView("games");
  }, [activeGame]);

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    setMsgInput(e.target.value);
    
    // Typing Logic: Send signal and clear after 2 seconds of no typing
    setTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(false);
    }, 2000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => sendImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleJoinRoom = async (code) => {
    const targetCode = code || roomInput;
    if (!targetCode) return;
    setIsWaking(true);
    try {
      const res = await fetch(`${API_URL}/room/${targetCode}`);
      const data = await res.json();
      if (data.exists) { setRoomId(targetCode); setView("chat"); }
    } catch (err) { alert("Server error."); } finally { setIsWaking(false); }
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    socket.emit("send-message", { roomId, message: msgInput, username, type: "text" });
    setMsgInput("");
    setTypingStatus(false);
  };

  const inviteLink = `${window.location.origin}?join=${roomId}`;

  return (
    <div className="h-screen bg-[#0e1621] text-white font-sans flex flex-col overflow-hidden">
      
      {/* HANDSHAKE POPUP */}
      {pendingInvite && !pendingInvite.isSentByMe && (
        <div className="fixed top-6 left-4 right-4 z-[100] bg-[#17212b] border-2 border-[#2481cc] p-5 rounded-3xl shadow-2xl animate-in slide-in-from-top-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-3xl">{pendingInvite.isRematch ? "🔄" : "🎮"}</div>
            <div>
              <p className="text-[10px] font-black text-[#2481cc] uppercase tracking-widest">{pendingInvite.isRematch ? "Rematch Request" : "Challenge"}</p>
              <p className="text-sm font-bold">{pendingInvite.sender} wants to play {pendingInvite.gameId}!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => acceptGameRequest(pendingInvite.gameId)} className="flex-1 bg-[#2481cc] py-3 rounded-xl font-black text-xs">ACCEPT</button>
            <button onClick={declineGameRequest} className="flex-1 bg-white/5 py-3 rounded-xl font-black text-xs">DECLINE</button>
          </div>
        </div>
      )}

      {/* VIEW: LANDING */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-[#2481cc] rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <span className="text-4xl">⚔️</span>
          </div>
          <h1 className="text-4xl font-black italic mb-8 tracking-tighter">BATTLE CHAT</h1>
          <div className="w-full max-w-xs space-y-4">
            <button onClick={() => setView("setup")} className="w-full bg-[#2481cc] py-4 rounded-2xl font-black shadow-lg">CREATE ROOM</button>
            <div className="bg-[#17212b] p-2 rounded-2xl flex gap-2 border border-white/5">
              <input value={roomInput} onChange={(e) => setRoomInput(e.target.value)} placeholder="CODE" className="bg-transparent flex-1 px-4 outline-none uppercase font-mono text-sm" />
              <button onClick={() => handleJoinRoom()} className="bg-[#2481cc] px-6 py-3 rounded-xl font-bold">JOIN</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CHAT & GAMES */}
      {(view === "chat" || view === "games") && (
        <>
          <header className="bg-[#17212b] h-16 flex items-center px-4 justify-between border-b border-black/20">
            <div className="flex items-center gap-3">
              <button onClick={() => setView(view === "chat" ? "games" : "chat")} className="text-xl">
                {view === "chat" ? "🎮" : "💬"}
              </button>
              <div>
                <h3 className="font-bold text-sm truncate w-20">{roomSettings.name || roomId}</h3>
                <p className="text-[10px] text-[#2481cc] font-black">{users.length} ONLINE</p>
              </div>
            </div>

            {/* SCOREBOARD */}
            <div className="flex items-center gap-4 bg-black/20 px-4 py-1.5 rounded-2xl border border-white/5">
              <div className="text-center">
                <p className="text-[7px] font-black text-gray-500">YOU</p>
                <p className="text-sm font-black text-[#2481cc]">{scores[username] || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[7px] font-black text-gray-500 uppercase">{opponent || '...'}</p>
                <p className="text-sm font-black text-red-500">{scores[opponent] || 0}</p>
              </div>
            </div>
          </header>

          {view === "chat" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.username === username ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] p-2 rounded-2xl shadow-lg ${m.username === username ? "bg-[#2b5278] rounded-tr-none" : "bg-[#182533] rounded-tl-none"}`}>
                      {m.type === "image" ? (
                        <img src={m.content} className="rounded-xl w-full max-h-60 object-cover" alt="media" />
                      ) : (
                        <p className="text-sm px-1">{m.message || m.text}</p>
                      )}
                      
                      {/* READ RECEIPTS */}
                      {m.username === username && (
                        <div className="flex justify-end pr-1 mt-0.5">
                          <span className={`text-[10px] leading-none ${users.length > 1 ? 'text-blue-400' : 'text-gray-500'}`}>
                            ✓✓
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* TYPING INDICATOR */}
                {isOpponentTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#182533] px-4 py-3 rounded-2xl rounded-tl-none">
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-duration:0.8s]" />
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              {/* INPUT AREA */}
              <div className="bg-[#17212b] p-3 flex items-center gap-3 border-t border-black/10">
                <button onClick={() => fileInputRef.current.click()} className="text-xl opacity-60">🖼️</button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <input 
                  value={msgInput} 
                  onChange={handleInputChange} 
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
                  placeholder="Type message..." 
                  className="flex-1 bg-transparent outline-none text-sm" 
                />
                <button onClick={sendMessage} className="text-[#2481cc] font-black px-2">SEND</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 overflow-y-auto">
              {!activeGame ? (
                <div className="max-w-md mx-auto">
                   {pendingInvite?.isSentByMe ? (
                    <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-[3rem] animate-pulse">
                      <p className="text-xs font-black uppercase text-gray-500">Waiting for {opponent}...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {GAMES.map(g => (
                        <button 
                          key={g.id} 
                          onClick={() => sendGameRequest(g.id)} 
                          disabled={!isHost || !opponent}
                          className={`p-6 bg-[#17212b] rounded-3xl border border-white/5 flex flex-col items-center gap-3 ${!isHost && 'opacity-20 grayscale'}`}
                        >
                          <span className="text-4xl">{g.icon}</span>
                          <span className="text-[10px] font-black uppercase">{g.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center">
                  <div className="w-full aspect-square bg-black/40 rounded-[2.5rem] border border-white/10 overflow-hidden">
                    {GAMES.map(game => activeGame === game.id && (
                      <game.Component key={game.id} socket={socket} roomId={roomId} username={username} opponent={opponent} updateScore={updateScore} />
                    ))}
                  </div>
                  <button onClick={closeGame} className="mt-8 text-[10px] font-black text-red-500 uppercase tracking-widest">Quit Battle</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;