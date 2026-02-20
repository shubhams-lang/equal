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
    messages, 
    roomId, 
    setRoomId, 
    users, 
    username, 
    socket, 
    activeGame, 
    launchGame, 
    closeGame 
  } = useContext(ChatContext);

  // --- UI STATES (Preserving your structure) ---
  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [roomSettings, setRoomSettings] = useState({ name: "", isEphemeral: true });
  const [isWaking, setIsWaking] = useState(false);

  const scrollRef = useRef(null);

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Scramble", icon: "🔠", Component: WordScramble },
  ];

  const API_URL = "https://equal.onrender.com"; 

  // --- 1v1 LOGIC ---
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
  }, [messages]);

  // SYNC VIEW WITH GAME STATE
  // This ensures that when the host starts a game, the opponent's "view" also switches to "games"
  useEffect(() => {
    if (activeGame) {
      setView("games");
    } else if (view === "games" && !activeGame) {
      setView("chat");
    }
  }, [activeGame]);

  // --- ROOM HANDLERS ---
  const handleCreateRoom = async () => {
    setIsWaking(true); 
    try {
      const res = await fetch(`${API_URL}/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomSettings),
      });
      const data = await res.json();
      setRoomId(data.roomId);
      setView("summary");
    } catch (err) {
      alert("Server is waking up... try again in 10 seconds.");
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
      const data = await res.json();
      if (data.exists) {
        setRoomId(targetCode);
        setView("chat");
      } else {
        alert("Invalid code.");
      }
    } catch (err) {
      alert("Connection failed.");
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

  const inviteLink = `${window.location.origin}?join=${roomId}`;

  return (
    <div className="h-screen bg-[#0e1621] text-white font-sans flex flex-col overflow-hidden">
      
      {/* VIEW: LANDING */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-sm text-center space-y-8">
            <div className="space-y-4">
              <div className="w-24 h-24 bg-gradient-to-tr from-[#2aabee] to-[#2481cc] rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                <span className="text-4xl">⚔️</span>
              </div>
              <h1 className="text-4xl font-black italic">BATTLE CHAT</h1>
              <p className="text-gray-400">1v1 Real-time Gaming & Chat</p>
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => setView("setup")} 
                className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
              >
                {isWaking ? "CONNECTING..." : "CREATE ROOM"}
              </button>
              <div className="bg-[#17212b] p-2 rounded-2xl flex gap-2 border border-white/5">
                <input 
                  value={roomInput} 
                  onChange={(e) => setRoomInput(e.target.value)} 
                  placeholder="Invite Code" 
                  className="bg-transparent flex-1 px-4 outline-none uppercase font-mono text-sm" 
                />
                <button onClick={() => handleJoinRoom()} className="bg-[#2481cc] px-6 py-3 rounded-xl font-bold">JOIN</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SETUP */}
      {view === "setup" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#17212b] rounded-3xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold mb-6">Room Settings</h2>
            <div className="space-y-6">
              <input 
                onChange={(e) => setRoomSettings({...roomSettings, name: e.target.value})} 
                className="w-full bg-[#0e1621] border border-gray-700 rounded-xl p-4 outline-none focus:border-[#2481cc]" 
                placeholder="Room Name" 
              />
              <button 
                onClick={handleCreateRoom} 
                className="w-full bg-[#2481cc] py-4 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all"
              >
                {isWaking ? "CREATING..." : "CREATE"}
              </button>
              <button onClick={() => setView("landing")} className="w-full text-gray-500 font-bold text-sm">BACK</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SUMMARY */}
      {view === "summary" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#17212b] rounded-3xl p-8 text-center border border-white/5">
            <h2 className="text-2xl font-bold mb-4">Room Ready!</h2>
            <div className="bg-[#0e1621] p-3 rounded-xl mb-6 flex items-center justify-between border border-gray-700">
              <code className="text-[#64b5f6] font-mono text-[10px] truncate mr-2">{inviteLink}</code>
              <button onClick={() => {navigator.clipboard.writeText(inviteLink); alert("Copied!")}} className="bg-[#2481cc] text-[10px] px-3 py-1.5 rounded-lg font-black">COPY</button>
            </div>
            <button onClick={() => { socket.emit("join-room", { roomId, username }); setView("chat"); }} className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold shadow-lg">ENTER CHAT</button>
          </div>
        </div>
      )}

      {/* VIEW: CHAT ROOM */}
      {view === "chat" && (
        <div className="flex flex-col h-full w-full bg-[#0e1621] relative">
          <div className="bg-[#17212b] h-16 flex items-center px-4 justify-between border-b border-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2481cc] flex items-center justify-center font-bold">
                {roomSettings.name?.charAt(0).toUpperCase() || "R"}
              </div>
              <div>
                <h3 className="font-bold text-sm">{roomSettings.name || `Room ${roomId}`}</h3>
                <p className="text-[11px] text-[#64b5f6] font-bold">{users.length} ONLINE</p>
              </div>
            </div>
            <button onClick={() => setView("games")} className="bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider">
              Play Game 🎮
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.username === username ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl ${m.username === username ? "bg-[#2b5278] rounded-tr-none" : "bg-[#182533] rounded-tl-none"}`}>
                  {! (m.username === username) && <p className="text-[10px] font-black text-[#64b5f6] mb-0.5">{m.username}</p>}
                  <p className="text-sm">{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <div className="bg-[#17212b] p-3 flex items-center gap-2 border-t border-black/10">
            <input 
              value={msgInput} 
              onChange={(e) => setMsgInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
              placeholder="Message" 
              className="flex-1 bg-transparent px-2 outline-none text-sm" 
            />
            <button onClick={sendMessage} className="text-[#2481cc] font-bold px-2">SEND</button>
          </div>
        </div>
      )}

      {/* VIEW: GAME CENTER */}
      {view === "games" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0e1621]">
          <div className="w-full max-w-md bg-[#17212b] rounded-3xl p-8 border border-white/5 shadow-2xl relative">
            <button onClick={() => setView("chat")} className="absolute top-4 right-4 text-gray-500">✕</button>

            {!activeGame ? (
              <div className="text-center">
                <h2 className="text-2xl font-black mb-6 uppercase tracking-widest text-[#2481cc]">GAME LOBBY</h2>
                <div className="grid grid-cols-2 gap-4">
                  {GAMES.map((game) => (
                    <button 
                      key={game.id} 
                      onClick={() => launchGame(game.id)} 
                      disabled={!isHost || !opponent}
                      className={`p-6 bg-[#0e1621] rounded-2xl border transition-all flex flex-col items-center gap-3 ${(!isHost || !opponent) ? 'opacity-30' : 'border-white/5 hover:border-[#2481cc] active:scale-95'}`}
                    >
                      <span className="text-4xl">{game.icon}</span>
                      <span className="font-bold text-[10px] uppercase tracking-widest text-white">{game.name}</span>
                      {!isHost && <span className="text-[7px] text-gray-600">WAITING FOR HOST</span>}
                    </button>
                  ))}
                </div>
                {!opponent && <p className="text-[10px] text-red-400 mt-6 font-bold animate-pulse">WAITING FOR SOMEONE TO JOIN...</p>}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-4 text-[10px] font-black text-[#2481cc] uppercase tracking-widest">VS {opponent}</div>
                <div className="w-full aspect-square bg-black/20 rounded-2xl mb-6 flex items-center justify-center border border-white/5">
                  {GAMES.map(game => activeGame === game.id && (
                    <game.Component 
                      key={game.id} 
                      socket={socket} 
                      roomId={roomId} 
                      username={username} 
                      opponent={opponent} 
                    />
                  ))}
                </div>
                <button onClick={closeGame} className="text-[10px] font-black text-red-500 hover:underline uppercase">EXIT SESSION</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;