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

  const {
    roomId,
    setRoomId,
    users,
    opponent,
    activeGame,
    scores,
    updateScore,
    sendGameRequest,
    closeGame,
    joinRoom,
    socket
  } = useContext(ChatContext);

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🐱");
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(true);

  const AVATARS = ["🐱","🐶","🦊","🤖","👻","👽","👾","🥷","🧙","🦁"];

  const API_URL = "https://equal.onrender.com";

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble }
  ];

  /* ================= URL JOIN ================= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");

    if (code) {
      setRoomId(code);
      setView("setup");
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, [setRoomId]);

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  /* ================= CREATE ROOM ================= */
  const handleGenerateRoom = async () => {
    try {
      const res = await fetch(`${API_URL}/create-room`
      );

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      if (data?.roomId) {
        setRoomId(data.roomId);
        setView("setup");
      } else {
        alert("Invalid server response");
      }

    } catch (err) {
      console.error(err);
      alert("Server unavailable, try again");
    }
  };

  /* ================= ENTER CHAT ================= */
  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Enter a nickname");
    if (!roomId) return alert("Invalid room");

    joinRoom(roomId, `${avatar} ${nickname}`);
    setView("chat");
  };

  /* ================= EXIT ================= */
  const handleExitRoom = () => {
    if (!window.confirm("Leave this room?")) return;

    if (socket && roomId) {
      socket.emit("leave-room", {
        roomId,
        username: `${avatar} ${nickname}`
      });
    }

    localStorage.clear();

    setRoomId(null);
    setNickname("");
    setAvatar("🐱");
    setRoomInput("");
    setShowMembers(false);
    setView("landing");
  };

  /* ================= COPY ================= */
  const copyInviteLink = async () => {
    try {
      const url = `${window.location.origin}?join=${roomId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy failed");
    }
  };

  /* ================= REACTIONS ================= */
  const handleReaction = (msgId, emoji) => {
    if (!socket) return;

    socket.emit("send-reaction", {
      roomId,
      msgId,
      emoji,
      username: `${avatar} ${nickname}`
    });
  };

  /* ================= GAME RENDER ================= */
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

          <button
            onClick={closeGame}
            className="bg-red-500/20 px-4 py-2 rounded-lg text-xs"
          >
            End Game
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <Suspense fallback={<div>Loading Game...</div>}>
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

  /* ================= UI ================= */
  return (
    <div className="h-screen bg-[#0b141a] text-white flex flex-col">

      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">

          <h1 className="text-7xl font-black text-[#25D366]">EQUAL</h1>

          <button
            onClick={handleGenerateRoom}
            className="bg-[#25D366] px-8 py-4 rounded-xl font-bold text-black"
          >
            Create Private Room
          </button>

          <div className="flex gap-2">
            <input
              value={roomInput}
              onChange={(e)=>setRoomInput(e.target.value)}
              placeholder="Room Code"
              className="bg-white/5 p-3 rounded-lg"
            />

            <button
              onClick={()=>{
                if (!roomInput.trim()) return alert("Enter room code");
                setRoomId(roomInput);
                setView("setup");
              }}
              className="bg-slate-700 px-6 rounded-lg"
            >
              Join
            </button>
          </div>

        </div>
      )}

      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-[#111b21] p-10 rounded-3xl w-96">

            <h2 className="text-center text-xs uppercase mb-6">
              Identity
            </h2>

            <div className="flex gap-3 overflow-x-auto mb-6">
              {AVATARS.map(a=>(
                <button
                  key={a}
                  onClick={()=>setAvatar(a)}
                  className={`text-3xl p-3 rounded-xl ${
                    avatar===a?"bg-[#25D366]":"bg-white/5"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            <input
              value={nickname}
              onChange={(e)=>setNickname(e.target.value)}
              placeholder="Nickname"
              className="w-full bg-black/20 p-4 rounded-xl mb-6 text-center"
            />

            <button
              onClick={handleEnterChat}
              className="w-full bg-[#25D366] py-4 rounded-xl text-black font-bold"
            >
              Enter Chat
            </button>

          </div>
        </div>
      )}

      {view === "chat" && (
        <div className="flex flex-1 relative">

          <div className="flex flex-col flex-1">

            <header className="bg-[#111b21] p-4 flex justify-between items-center">

              <div className="flex items-center gap-3">
                <span className="text-3xl">{avatar}</span>

                <div>
                  <div className="text-sm font-bold text-[#25D366] flex gap-1 items-center">
                    {nickname}
                    <FiShield size={12}/>
                  </div>

                  <div className="text-[10px] text-slate-500">
                    ROOM {roomId}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={copyInviteLink} className="p-2 bg-white/5 rounded-lg">
                  <FiShare2/>
                </button>

                <button
                  onClick={()=>setShowMembers(!showMembers)}
                  className="p-2 bg-white/5 rounded-lg flex gap-1 items-center"
                >
                  <FiUsers/>
                  <span className="text-xs">{users?.length||1}</span>
                </button>

                <button
                  onClick={handleExitRoom}
                  className="p-2 bg-red-500/20 text-red-400 rounded-lg"
                >
                  <FiLogOut/>
                </button>
              </div>

            </header>

            <div className="flex-1">
              <Chat onReact={handleReaction}/>
            </div>

            <div className="bg-[#111b21] p-2 flex gap-2 overflow-x-auto">
              {GAMES.map(game=>(
                <button
                  key={game.id}
                  onClick={()=>sendGameRequest(game.id)}
                  className="bg-white/5 px-4 py-2 rounded-lg text-xs"
                >
                  {game.icon} {game.name}
                </button>
              ))}
            </div>

          </div>

          {/* Sidebar unchanged */}
          <aside className={`fixed right-0 top-0 h-full w-72 bg-[#0e161b] transform transition-transform ${
            showMembers?"translate-x-0":"translate-x-full"
          }`}>
            <div className="flex justify-between p-4 border-b border-white/5">
              <span className="text-xs uppercase">Online Users</span>
              <button onClick={()=>setShowMembers(false)}>
                <FiX/>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {users?.map((u,i)=>{
                const [uAvatar,...nameArr]=u.split(" ");
                const uName=nameArr.join(" ");

                return(
                  <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                    <span className="text-xl">{uAvatar}</span>
                    <span className="text-sm">
                      {uName}{uName===nickname&&" (You)"}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>

          {showMembers && (
            <div
              className="fixed inset-0 bg-black/70 z-40"
              onClick={()=>setShowMembers(false)}
            ></div>
          )}

        </div>
      )}

      {activeGame && renderGame()}

    </div>
  );
}

export default App;