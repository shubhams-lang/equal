import React, { useContext, useState, useEffect, lazy, Suspense } from "react";
import { ChatContext } from "./context/ChatContext";

// ---- MODULAR COMPONENTS ----
import Chat from "./components/Chat";

// ---- LAZY LOAD GAMES (PERFORMANCE BOOST) ----
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

  // ---------------- UI STATE ----------------
  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [connected, setConnected] = useState(true);
  const [copied, setCopied] = useState(false);

  // ---------------- IDENTITY ----------------
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [avatar, setAvatar] = useState(localStorage.getItem("avatar") || "🐱");

  const API_URL = "https://equal.onrender.com";

  const AVATARS = ["🐱","🐶","🦊","🤖","👻","👽","👾","🥷","🧙","🦁"];

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble },
  ];

  // ---------------- SOCKET CONNECTION STATUS ----------------
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  // ---------------- INVITE LINK AUTO JOIN ----------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");

    if (code) {
      setRoomId(code);
      setView("setup");
    }
  }, [setRoomId]);

  // ---------------- AUTO REJOIN AFTER REFRESH ----------------
  useEffect(() => {
    const savedRoom = localStorage.getItem("roomId");
    const savedName = localStorage.getItem("nickname");
    const savedAvatar = localStorage.getItem("avatar");

    if (savedRoom && savedName && savedAvatar) {
      joinRoom(savedRoom, `${savedAvatar} ${savedName}`);
      setRoomId(savedRoom);
      setNickname(savedName);
      setAvatar(savedAvatar);
      setView("chat");
    }
  }, []);

  // ---------------- CREATE ROOM ----------------
  const handleGenerateRoom = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/create-room`, { method: "POST" });
      const data = await res.json();

      if (data.roomId) {
        setRoomId(data.roomId);

        localStorage.setItem("roomId", data.roomId);

        window.history.pushState({}, "", `?join=${data.roomId}`);

        setView("setup");
      }
    } catch (err) {
      alert("Server connection error.");
    }

    setIsLoading(false);
  };

  // ---------------- ENTER CHAT ----------------
  const handleEnterChat = () => {
    if (!nickname.trim()) return alert("Please enter a nickname!");

    localStorage.setItem("nickname", nickname);
    localStorage.setItem("avatar", avatar);
    localStorage.setItem("roomId", roomId);

    if (roomId && joinRoom) {
      joinRoom(roomId, `${avatar} ${nickname}`);
      setView("chat");
    }
  };

  // ---------------- COPY INVITE ----------------
  const copyInviteLink = async () => {
    const url = `${window.location.origin}?join=${roomId}`;

    await navigator.clipboard.writeText(url);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------- GAME RENDER ----------------
  const renderGame = () => {
    const game = GAMES.find((g) => g.id === activeGame);

    if (!game) return null;

    const SelectedGame = game.Component;

    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col animate-in fade-in duration-300">
        <div className="flex justify-between items-center p-4 bg-[#202c33] border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <h2 className="font-black text-xs tracking-widest uppercase">
              {game.name}
            </h2>
          </div>

          <button
            onClick={closeGame}
            className="bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-[10px]"
          >
            EXIT GAME
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <Suspense fallback={<div className="text-white">Loading Game...</div>}>
            <SelectedGame
              socket={socket}
              roomId={roomId}
              username={`${avatar} ${nickname}`}
              opponent={opponent}
              updateScore={updateScore}
              scores={scores}
            />
          </Suspense>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#0b141a] text-white flex flex-col font-sans overflow-hidden">

      {/* ---------------- LANDING ---------------- */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">

          <h1 className="text-7xl font-black mb-2 text-[#25D366] italic">
            EQUAL
          </h1>

          <p className="text-slate-500 mb-10 uppercase tracking-[0.4em] text-[10px] font-bold">
            Multimedia Gaming Hub
          </p>

          <button
            onClick={handleGenerateRoom}
            className="w-full max-w-xs bg-[#25D366] text-black font-black py-5 rounded-2xl mb-4"
          >
            {isLoading ? "INITIALIZING..." : "CREATE PRIVATE ROOM"}
          </button>

          <div className="flex gap-2 w-full max-w-xs">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Room Code"
              className="flex-1 bg-white/5 p-4 rounded-xl outline-none"
            />

            <button
              onClick={() => {
                setRoomId(roomInput);
                setView("setup");
              }}
              className="bg-slate-800 px-6 rounded-xl font-bold"
            >
              JOIN
            </button>
          </div>
        </div>
      )}

      {/* ---------------- SETUP ---------------- */}
      {view === "setup" && (
        <div className="flex-1 flex items-center justify-center p-6">

          <div className="bg-[#202c33] p-10 rounded-[3rem] w-full max-w-md">

            <h2 className="text-xs font-black mb-8 text-center uppercase text-slate-400">
              Identity Setup
            </h2>

            <div className="flex justify-center gap-2 mb-8 overflow-x-auto">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-2xl p-3 rounded-2xl ${
                    avatar === a ? "bg-[#25D366] scale-110" : "bg-black/20"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              className="w-full bg-black/20 text-xl text-center p-4 rounded-2xl mb-8"
            />

            <button
              onClick={handleEnterChat}
              className="w-full bg-[#25D366] text-black font-black py-4 rounded-2xl"
            >
              ENTER CHAT
            </button>

          </div>
        </div>
      )}

      {/* ---------------- CHAT ---------------- */}
      {view === "chat" && (
        <div className="flex h-full relative">

          <div className="flex-1 flex flex-col">

            {/* HEADER */}
            <header className="bg-[#202c33] p-4 flex justify-between items-center">

              <div className="flex items-center gap-3">
                <span className="text-2xl">{avatar}</span>

                <div>
                  <h2 className="font-black text-[#25D366] text-sm uppercase">
                    {nickname}
                  </h2>

                  <p className="text-[10px] text-slate-500 uppercase">
                    Room: {roomId}
                  </p>

                  <p className="text-[10px]">
                    {connected ? "🟢 Online" : "🔴 Reconnecting"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">

                <button
                  onClick={copyInviteLink}
                  className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-xl text-[10px]"
                >
                  {copied ? "Copied!" : "🔗 Invite"}
                </button>

                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="bg-slate-700 px-3 py-1 rounded-xl text-[10px]"
                >
                  👥 {users?.length || 1}
                </button>

              </div>
            </header>

            {/* CHAT */}
            <Chat />

            {/* GAME BAR */}
            <div className="bg-[#1e272e] p-2 flex gap-2 overflow-x-auto">

              {GAMES.map((game) => (
                <button
                  key={game.id}
                  onClick={() => sendGameRequest(game.id)}
                  className="bg-white/5 px-4 py-2 rounded-xl text-[10px] font-black"
                >
                  {game.icon} {game.name}
                </button>
              ))}

            </div>

          </div>

          {/* MEMBERS */}
          {showMembers && (
            <div className="absolute right-0 top-0 h-full w-64 bg-[#0b141a] p-6">

              <h3 className="text-xs mb-6">Online Users</h3>

              {users?.map((u, i) => (
                <div key={i} className="mb-3 bg-[#202c33] p-3 rounded-xl">
                  {u}
                </div>
              ))}

            </div>
          )}
        </div>
      )}

      {/* ACTIVE GAME */}
      {activeGame && renderGame()}

    </div>
  );
}

export default App;