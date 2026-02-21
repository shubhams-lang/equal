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
    pendingInvite,
    setPendingInvite,
    scores,
    updateScore,
    sendImage,
    isOpponentTyping,
    setTypingStatus,
    sendGameRequest,
    acceptGameRequest,
    declineGameRequest,
    closeGame,
  } = useContext(ChatContext);

  // --- UI STATES ---
  const [view, setView] = useState("landing");
  const [roomInput, setRoomInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [roomSettings] = useState({ name: "", isEphemeral: true });
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

  // ✅ SAFE opponent detection
  const opponent = users?.find((u) => u !== username);
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

    setTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(false);
    }, 2000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
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

      if (data?.exists) {
        setRoomId(targetCode);
        setView("chat");
      }
    } catch {
      alert("Server error.");
    } finally {
      setIsWaking(false);
    }
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;

    socket?.emit("send-message", {
      roomId,
      message: msgInput,
      username,
      type: "text",
    });

    setMsgInput("");
    setTypingStatus(false);
  };

  return (
    <div className="h-screen bg-[#0e1621] text-white font-sans flex flex-col overflow-hidden">
      
      {/* LANDING */}
      {view === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-4xl font-black mb-8">BATTLE CHAT</h1>

          <div className="w-full max-w-xs space-y-4">
            <button
              onClick={() => setView("chat")}
              className="w-full bg-[#2481cc] py-4 rounded-2xl font-black"
            >
              CREATE ROOM
            </button>

            <div className="bg-[#17212b] p-2 rounded-2xl flex gap-2">
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="CODE"
                className="bg-transparent flex-1 px-4 outline-none"
              />
              <button
                onClick={() => handleJoinRoom()}
                className="bg-[#2481cc] px-6 py-3 rounded-xl font-bold"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT */}
      {view === "chat" && (
        <>
          <header className="bg-[#17212b] h-16 flex items-center px-4 justify-between">
            <div>
              <h3 className="font-bold text-sm">{roomId}</h3>
              <p className="text-[10px] text-[#2481cc] font-black">
                {users?.length || 0} ONLINE
              </p>
            </div>

            <div className="flex gap-6">
              <div>
                <p className="text-xs">YOU</p>
                <p className="text-lg text-[#2481cc]">
                  {scores?.[username] || 0}
                </p>
              </div>
              <div>
                <p className="text-xs">{opponent || "..."}</p>
                <p className="text-lg text-red-500">
                  {scores?.[opponent] || 0}
                </p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages?.map((m, i) => (
              <div key={i} className="text-sm">
                {m.message}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <div className="bg-[#17212b] p-3 flex gap-3">
            <input
              value={msgInput}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-transparent outline-none"
              placeholder="Type message..."
            />
            <button
              onClick={sendMessage}
              className="text-[#2481cc] font-black"
            >
              SEND
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;