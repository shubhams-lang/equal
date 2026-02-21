import React, { useContext, useState, useEffect, useRef } from "react";
import { ChatContext } from "./context/ChatContext";

// ---- GAME IMPORTS ----
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
    pendingInvite,
    scores,
    updateScore,
    sendGameRequest,
    acceptGameRequest,
    declineGameRequest,
    closeGame,
    // 🔥 IMPORT JOINROOM HERE
    joinRoom 
  } = useContext(ChatContext);

  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef(null);
  const API_URL = "https://equal.onrender.com";

  const GAMES = [
    { id: "Pong", name: "Pong", icon: "🏓", Component: Pong },
    { id: "TicTacToe", name: "Tic Tac Toe", icon: "❌", Component: TicTacToe },
    { id: "TapTap", name: "Tap Tap", icon: "⚡", Component: TapTap },
    { id: "SlideRace", name: "Slider Race", icon: "🏎️", Component: SliderRace },
    { id: "WordScramble", name: "Word Scramble", icon: "🔠", Component: WordScramble },
  ];

  // ---------------- AUTO JOIN FROM URL ----------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code && !roomId) {
      handleJoinRoom(code);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (roomId) setView("chat");
  }, [roomId]);

  // ---------------- CREATE ROOM ----------------
  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      // 1. Get the unique ID from your backend
      const res = await fetch(`${API_URL}/create-room`, { method: "POST" });
      const data = await res.json();

      // 2. Update the URL so it's shareable
      const inviteLink = `${window.location.origin}?join=${data.roomId}`;
      window.history.pushState({}, "", inviteLink);

      // 3. Set React State
      setRoomId(data.roomId);
      setView("chat");

      // 🔥 4. CRITICAL FIX: Tell Socket.io to join this specific room
      if (joinRoom) {
         joinRoom(data.roomId);
      }

    } catch (err) {
      console.error(err);
      alert("Failed to create room");
    }
    setIsLoading(false);
  };

  // ---------------- JOIN ROOM ----------------
  const handleJoinRoom = async (code) => {
    const target = code || roomInput;
    if (!target) return;

    try {
      // 1. Check if room exists on backend
      const res = await fetch(`${API_URL}/room/${target}`);
      const data = await res.json();

      if (data.exists) {
        // 2. Update the URL if joining via manual input
        const inviteLink = `${window.location.origin}?join=${target}`;
        window.history.pushState({}, "", inviteLink);

        // 3. Set React state
        setRoomId(target);
        setView("chat");

        // 🔥 4. CRITICAL FIX: Tell Socket.io to join this specific room
        if (joinRoom) {
           joinRoom(target);
        }
      } else {
        alert("Room not found");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = () => {
    if (!msgInput.trim() || !roomId) return;

    socket.emit("send-message", {
      roomId, // Ensure roomId is being passed to the backend
      message: msgInput,
      username,
    });

    setMsgInput("");
  };

  // ---------------- GAME RENDER ----------------
  const renderGame = () => {
    const game = GAMES.find((g) => g.id === activeGame);
    if (!game) return null;

    const GameComponent = game.Component;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 bg-[#202c33]">
          <h2 className="font-bold">{game.name}</h2>
          <button
            onClick={closeGame}
            className="bg-red-500 px-4 py-2 rounded-lg"
          >
            Exit
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <GameComponent
            roomId={roomId}
            username={username}
            socket={socket}
            updateScore={updateScore}
            scores={scores}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#111b21] text-white flex flex-col">

      {/* ---------------- LANDING ---------------- */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <h1 className="text-4xl font-bold">Battle Chat</h1>

          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className={`px-8 py-3 rounded-full font-bold ${isLoading ? 'bg-gray-500' : 'bg-[#25D366]'}`}
          >
            {isLoading ? "Creating..." : "Create Group"}
          </button>

          <div className="flex gap-2">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Enter Code"
              className="bg-[#202c33] px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-[#25D366]"
            />
            <button
              onClick={() => handleJoinRoom()}
              className="bg-[#25D366] px-4 rounded-lg font-bold"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* ---------------- CHAT ---------------- */}
      {view === "chat" && (
        <>
          <header className="bg-[#202c33] p-4 flex justify-between items-center">
            <div>
              {/* Show the actual Room ID so users know where they are */}
              <h2 className="font-bold">Room: {roomId}</h2>
              <p className="text-xs text-gray-400">
                {users?.length || 1} members
              </p>
            </div>

            <div className="flex gap-4 items-center">
              <button
                onClick={() => {
                   // Ensure it copies the URL with the ?join= parameter
                   const link = `${window.location.origin}?join=${roomId}`;
                   navigator.clipboard.writeText(link);
                   alert("Invite Link Copied!");
                }}
                className="text-xs bg-[#25D366] px-3 py-1 rounded-lg hover:bg-green-600 transition"
              >
                Copy Invite
              </button>

              <div className="text-xs text-gray-400">
                Score: {scores?.[username] || 0}
              </div>
            </div>
          </header>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b141a]">
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex ${
                  msg.username === username ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs p-3 rounded-2xl text-sm ${
                    msg.username === username
                      ? "bg-[#005c4b]"
                      : "bg-[#202c33]"
                  }`}
                >
                  {msg.username !== username && (
                    <p className="text-xs text-[#25D366] font-bold mb-1">
                      {msg.username}
                    </p>
                  )}
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          {/* GAME SELECTOR */}
          <div className="bg-[#202c33] px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar">
            {GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => sendGameRequest(game.id)}
                className="bg-[#2a3942] hover:bg-[#3a4b55] transition px-4 py-2 rounded-xl text-sm flex items-center gap-2 whitespace-nowrap"
              >
                {game.icon} {game.name}
              </button>
            ))}
          </div>

          {/* MESSAGE INPUT */}
          <div className="bg-[#202c33] p-3 flex gap-3">
            <input
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-[#25D366]"
              placeholder="Type a message"
            />
            <button
              onClick={sendMessage}
              className="bg-[#25D366] hover:bg-green-600 transition px-6 rounded-full font-bold"
            >
              Send
            </button>
          </div>
        </>
      )}

      {/* GAME MODAL */}
      {activeGame && renderGame()}
    </div>
  );
}

export default App;