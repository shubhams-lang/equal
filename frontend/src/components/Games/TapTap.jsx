import { useState, useEffect } from "react";

export default function TapTap({ socket, roomId, username, opponent }) {
  const [myProgress, setMyProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    // Listen for the opponent's taps via the server
    socket.on("game-state-update", (payload) => {
      if (payload.game === "TapTap" && payload.sender === opponent) {
        if (payload.type === "TAP") {
          setOppProgress(payload.progress);
        }
        if (payload.type === "WIN") {
          setWinner(payload.sender);
        }
      }
    });

    return () => socket.off("game-state-update");
  }, [socket, opponent]);

  const handleTap = () => {
    if (winner) return;

    const newProgress = Math.min(myProgress + 5, 100);
    setMyProgress(newProgress);

    // Sync my tap to the opponent
    socket.emit("game-state-sync", {
      roomId,
      payload: { 
        game: "TapTap", 
        type: "TAP", 
        sender: username, 
        progress: newProgress 
      }
    });

    // Check for win condition
    if (newProgress >= 100 && !winner) {
      setWinner(username);
      socket.emit("game-state-sync", {
        roomId,
        payload: { game: "TapTap", type: "WIN", sender: username }
      });
    }
  };

  return (
    <div className="bg-[#17212b] p-6 rounded-3xl w-full max-w-xs border border-white/10 shadow-2xl">
      <h3 className="text-center text-[10px] font-black text-gray-500 mb-6 tracking-[0.2em] uppercase">Power Tap Battle</h3>
      
      <div className="space-y-6">
        {/* Opponent Section */}
        <div>
          <div className="flex justify-between text-[10px] mb-2 text-red-400 font-bold uppercase">
            <span>{opponent || "Waiting..."}</span>
            <span>{oppProgress}%</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="bg-red-500 h-full transition-all duration-200" 
              style={{ width: `${oppProgress}%` }} 
            />
          </div>
        </div>

        {/* My Section */}
        <div>
          <div className="flex justify-between text-[10px] mb-2 text-green-400 font-bold uppercase">
            <span>You</span>
            <span>{myProgress}%</span>
          </div>
          <div className="h-6 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
            <div 
              className="bg-green-500 h-full rounded-full transition-all duration-100 shadow-[0_0_15px_rgba(34,197,94,0.4)]" 
              style={{ width: `${myProgress}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Massive Tap Button */}
      <button 
        onPointerDown={handleTap}
        disabled={!!winner}
        className={`mt-8 w-full aspect-square rounded-full flex flex-col items-center justify-center transition-all active:scale-90 shadow-2xl ${
          winner 
          ? "bg-gray-800 border-gray-700 opacity-50" 
          : "bg-gradient-to-br from-green-400 to-green-600 border-4 border-white/20"
        }`}
      >
        <span className="text-4xl mb-1">⚡</span>
        <span className="text-xs font-black text-white">TAP!</span>
      </button>

      {winner && (
        <div className="mt-6 text-center animate-bounce">
          <p className={`font-black text-xl ${winner === username ? "text-yellow-400" : "text-red-500"}`}>
            {winner === username ? "🏆 YOU WON!" : "💀 DEFEAT"}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-[10px] text-gray-400 underline"
          >
            RESET GAME
          </button>
        </div>
      )}
    </div>
  );
}