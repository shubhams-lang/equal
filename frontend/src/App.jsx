import React, { useContext, useState, useEffect, useRef } from "react";
import { ChatContext } from "./context/ChatContext";

// ---- GAME IMPORTS (Keep your existing imports) ----
import Pong from "./components/Games/Pong";
import SliderRace from "./components/Games/SlideRace";
import TapTap from "./components/Games/TapTap";
import TicTacToe from "./components/Games/TicTacToe";
import WordScramble from "./components/Games/WordScramble";

function App() {
  const {
    messages, roomId, setRoomId, users, socket,
    activeGame, scores, updateScore, sendGameRequest, closeGame, joinRoom
  } = useContext(ChatContext);

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false); // Sidebar toggle

  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [avatar, setAvatar] = useState(localStorage.getItem("avatar") || "🐱");

  const scrollRef = useRef(null);
  const API_URL = "https://equal.onrender.com";
  const AVATARS = ["🐱", "🐶", "🦊", "🤖", "👻", "👽", "👾", "🥷", "🧙", "🦁"];

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) { setRoomId(code); setView("setup"); }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleGenerateRoom = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/create-room`, { method: "POST" });
      const data = await res.json();
      if (data.roomId) {
        setRoomId(data.roomId);
        window.history.pushState({}, "", `?join=${data.roomId}`);
        setView("setup");
      }
    } catch { alert("Backend is waking up..."); }
    setIsLoading(false);
  };

  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Enter a nickname!");
    localStorage.setItem("nickname", nickname);
    localStorage.setItem("avatar", avatar);
    if (roomId && joinRoom) {
      joinRoom(roomId, `${avatar} ${nickname}`);
      setView("chat");
    }
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    socket.emit("send-message", { roomId, message: msgInput, username: `${avatar} ${nickname}` });
    setMsgInput("");
  };

  const renderGame = () => {
    const game = GAMES.find((g) => g.id === activeGame);
    if (!game) return null;
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 bg-[#202c33]">
          <h2 className="font-bold">{game.name}</h2>
          <button onClick={closeGame} className="bg-red-500 px-4 py-2 rounded-lg">Exit</button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <game.Component roomId={roomId} username={`${avatar} ${nickname}`} socket={socket} updateScore={updateScore} scores={scores} />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#111b21] text-white flex flex-col font-sans overflow-hidden">
      
      {/* LANDING & SETUP VIEWS (Same as before) */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
           <h1 className="text-5xl font-black mb-8 tracking-tighter text-[#25D366]">EQUAL</h1>
           <button onClick={handleGenerateRoom} className="w-full max-w-xs bg-[#25D366] text-black font-black py-5 rounded-2xl mb-4">CREATE ROOM</button>
           <div className="flex gap-2 w-full max-w-xs">
              <input value={roomInput} onChange={(e)=>setRoomInput(e.target.value)} placeholder="Code" className="flex-1 bg-[#202c33] p-3 rounded-xl outline-none" />
              <button onClick={()=>{setRoomId(roomInput); setView("setup")}} className="bg-gray-700 px-4 rounded-xl font-bold">JOIN</button>
           </div>
        </div>
      )}

      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6 animate-in slide-in-from-bottom duration-500">
           <div className="bg-[#202c33] p-8 rounded-[2.5rem] w-full max-w-md border border-gray-800">
              <h2 className="text-2xl font-black mb-6 text-center">SETUP YOUR PLAYER</h2>
              <div className="flex justify-center gap-2 mb-6 overflow-x-auto no-scrollbar">
                {AVATARS.map(a => (
                  <button key={a} onClick={()=>setAvatar(a)} className={`text-xl p-3 rounded-xl ${avatar === a ? 'bg-[#25D366]' : 'bg-[#111b21]'}`}>{a}</button>
                ))}
              </div>
              <input value={nickname} onChange={(e)=>setNickname(e.target.value)} placeholder="Nickname" className="w-full bg-[#111b21] p-4 rounded-xl mb-6 text-center font-bold text-xl border-2 border-transparent focus:border-[#25D366] outline-none" />
              <button onClick={handleEnterChat} className="w-full bg-[#25D366] text-black font-black py-4 rounded-xl text-lg">START BATTLE</button>
           </div>
        </div>
      )}

      {/* ---------------- VIEW: CHAT + SIDEBAR ---------------- */}
      {view === "chat" && (
        <div className="flex h-full relative">
          
          {/* MAIN CHAT AREA */}
          <div className={`flex-1 flex flex-col transition-all duration-300 ${showMembers ? 'mr-64' : 'mr-0'}`}>
            <header className="bg-[#202c33] p-4 flex justify-between items-center border-b border-gray-800 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{avatar}</span>
                <div>
                  <h2 className="font-bold text-[#25D366] leading-none">{nickname}</h2>
                  <p className="text-[10px] text-gray-500">ROOM: {roomId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowMembers(!showMembers)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${showMembers ? 'bg-[#25D366] text-black' : 'bg-gray-700 text-white'}`}
                >
                  👥 {users?.length || 1}
                </button>
                <button onClick={() => window.location.href = "/"} className="bg-red-500/20 text-red-500 text-xs px-3 py-2 rounded-lg font-bold">EXIT</button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.username.includes(nickname) ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${msg.username.includes(nickname) ? "bg-[#005c4b] rounded-tr-none" : "bg-[#202c33] rounded-tl-none"}`}>
                    {!msg.username.includes(nickname) && <p className="text-[10px] text-[#25D366] font-bold mb-1">{msg.username}</p>}
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="bg-[#202c33] p-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-800">
              {GAMES.map((game) => (
                <button key={game.id} onClick={() => sendGameRequest(game.id)} className="bg-[#2a3942] whitespace-nowrap px-4 py-2 rounded-xl text-xs flex items-center gap-2 hover:bg-[#32444e]">
                  {game.icon} {game.name}
                </button>
              ))}
            </div>

            <div className="bg-[#202c33] p-4 flex gap-3">
              <input value={msgInput} onChange={(e)=>setMsgInput(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && sendMessage()} className="flex-1 bg-[#111b21] rounded-xl px-4 py-3 outline-none" placeholder="Message..." />
              <button onClick={sendMessage} className="bg-[#25D366] text-black px-6 rounded-xl font-bold">SEND</button>
            </div>
          </div>

          {/* SIDEBAR: LIVE MEMBERS */}
          <div className={`absolute top-0 right-0 h-full w-64 bg-[#111b21] border-l border-gray-800 transform transition-transform duration-300 ease-in-out z-10 ${showMembers ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Live Members</h3>
              <button onClick={() => setShowMembers(false)} className="text-gray-500 text-xl">&times;</button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              {users && users.length > 0 ? (
                users.map((user, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-right">
                    <div className="w-10 h-10 bg-[#202c33] rounded-full flex items-center justify-center text-xl shadow-inner">
                      {user.split(' ')[0]} {/* Extract Avatar */}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{user.split(' ').slice(1).join(' ')}</p>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse"></span>
                        <span className="text-[10px] text-gray-500 uppercase">Online</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-600 text-xs mt-10 italic">Waiting for others to join...</p>
              )}
            </div>
          </div>

        </div>
      )}

      {activeGame && renderGame()}
    </div>
  );
}

export default App;