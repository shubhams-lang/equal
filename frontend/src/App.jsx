import React, { useContext, useState, useEffect, useRef } from "react";
import { ChatContext } from "./context/ChatContext";

// ---- GAME IMPORTS ----
// Note: Ensure these files exist in your project or the build will fail!
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
    socket,
    activeGame,
    scores,
    updateScore,
    sendGameRequest,
    closeGame,
    joinRoom,
  } = useContext(ChatContext);

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

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
    if (code) {
      setRoomId(code);
      setView("setup");
    }
  }, [setRoomId]);

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
    } catch (err) {
      alert("Server error. Please try again.");
    }
    setIsLoading(false);
  };

  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Please enter a nickname!");
    localStorage.setItem("nickname", nickname);
    localStorage.setItem("avatar", avatar);
    if (roomId && joinRoom) {
      joinRoom(roomId, `${avatar} ${nickname}`);
      setView("chat");
    }
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    socket.emit("send-message", {
      roomId,
      message: msgInput,
      username: `${avatar} ${nickname}`,
    });
    setMsgInput("");
  };

  const renderGame = () => {
    const game = GAMES.find((g) => g.id === activeGame);
    if (!game) return null;
    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 bg-[#202c33]">
          <h2 className="font-bold">{game.name}</h2>
          <button onClick={closeGame} className="bg-red-500 px-4 py-2 rounded-lg">Exit</button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <SelectedGame
            roomId={roomId}
            username={`${avatar} ${nickname}`}
            socket={socket}
            updateScore={updateScore}
            scores={scores}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#111b21] text-white flex flex-col font-sans overflow-hidden">
      
      {/* LANDING VIEW */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-5xl font-black mb-2 text-[#25D366]">EQUAL</h1>
          <p className="text-gray-500 mb-10">Private rooms & Mini-games</p>
          <button
            onClick={handleGenerateRoom}
            disabled={isLoading}
            className="w-full max-w-xs bg-[#25D366] text-black font-black py-5 rounded-2xl mb-4 transition-transform active:scale-95"
          >
            {isLoading ? "LOADING..." : "CREATE ROOM"}
          </button>
          <div className="flex gap-2 w-full max-w-xs">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Code"
              className="flex-1 bg-[#202c33] p-3 rounded-xl outline-none"
            />
            <button onClick={() => { setRoomId(roomInput); setView("setup"); }} className="bg-gray-700 px-6 rounded-xl font-bold">JOIN</button>
          </div>
        </div>
      )}

      {/* SETUP VIEW */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#202c33] p-8 rounded-[2.5rem] w-full max-w-md border border-gray-800 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-center">YOUR PROFILE</h2>
            <div className="flex justify-center gap-2 mb-6 overflow-x-auto pb-2">
              {AVATARS.map(a => (
                <button 
                  key={a} onClick={() => setAvatar(a)}
                  className={`text-xl p-3 rounded-xl transition-all ${avatar === a ? 'bg-[#25D366]' : 'bg-[#111b21]'}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <input 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              className="w-full bg-[#111b21] text-xl font-bold text-center p-4 rounded-xl mb-6 outline-none focus:ring-2 focus:ring-[#25D366]"
            />
            <button onClick={handleEnterChat} className="w-full bg-[#25D366] text-black font-black py-4 rounded-xl text-lg transition-transform active:scale-95">
              ENTER CHAT
            </button>
          </div>
        </div>
      )}

      {/* CHAT VIEW */}
      {view === "chat" && (
        <div className="flex h-full relative">
          <div className="flex-1 flex flex-col">
            <header className="bg-[#202c33] p-4 flex justify-between items-center border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{avatar}</span>
                <h2 className="font-bold text-[#25D366]">{nickname}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowMembers(!showMembers)} className="bg-gray-700 px-3 py-1 rounded-lg text-xs font-bold">
                  👥 {users?.length || 1}
                </button>
                <button onClick={() => window.location.href = "/"} className="bg-red-500/20 text-red-500 text-xs px-3 py-1 rounded-lg">EXIT</button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.username.includes(nickname) ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] ${msg.username.includes(nickname) ? "bg-[#005c4b]" : "bg-[#202c33]"}`}>
                    {!msg.username.includes(nickname) && <p className="text-[10px] text-[#25D366] font-bold mb-1">{msg.username}</p>}
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="bg-[#202c33] p-2 flex gap-2 overflow-x-auto no-scrollbar">
              {GAMES.map((game) => (
                <button key={game.id} onClick={() => sendGameRequest(game.id)} className="bg-[#2a3942] whitespace-nowrap px-4 py-2 rounded-xl text-xs flex items-center gap-1">
                  {game.icon} {game.name}
                </button>
              ))}
            </div>

            <div className="p-4 bg-[#202c33] flex gap-2">
              <input value={msgInput} onChange={(e)=>setMsgInput(e.target.value)} onKeyDown={(e)=>e.key === 'Enter' && sendMessage()} className="flex-1 bg-[#111b21] p-3 rounded-xl outline-none" placeholder="Type..." />
              <button onClick={sendMessage} className="bg-[#25D366] text-black font-bold px-6 rounded-xl">SEND</button>
            </div>
          </div>

          {/* SIDEBAR */}
          {showMembers && (
            <div className="absolute right-0 top-0 h-full w-64 bg-[#111b21] border-l border-gray-800 z-10 p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase">Online</h3>
                <button onClick={() => setShowMembers(false)}>&times;</button>
              </div>
              {users?.map((u, i) => (
                <div key={i} className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-sm">{u.split(' ')[0]}</div>
                  <span className="text-sm truncate">{u.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeGame && renderGame()}
    </div>
  );
}

export default App;