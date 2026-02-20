import { useState, useEffect } from "react";

export default function SlideRace({ socket, roomId, username, opponent }) {
  const [myPos, setMyPos] = useState(0);
  const [oppPos, setOppPos] = useState(0);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    // Listen for opponent's movement
    socket.on("game-state-update", (payload) => {
      if (payload.game === "SlideRace" && payload.sender === opponent) {
        if (payload.type === "MOVE") {
          setOppPos(payload.pos);
        }
        if (payload.type === "WIN") {
          setWinner(payload.sender);
        }
      }
    });

    return () => socket.off("game-state-update");
  }, [socket, opponent]);

  const handleMove = () => {
    if (winner) return;

    const newPos = Math.min(myPos + 4, 100);
    setMyPos(newPos);

    // Sync position to opponent
    socket.emit("game-state-sync", {
      roomId,
      payload: { 
        game: "SlideRace", 
        type: "MOVE", 
        sender: username, 
        pos: newPos 
      }
    });

    // Check for Win
    if (newPos >= 100 && !winner) {
      setWinner(username);
      socket.emit("game-state-sync", {
        roomId,
        payload: { game: "SlideRace", type: "WIN", sender: username }
      });
    }
  };

  return (
    <div className="bg-[#17212b] p-6 rounded-2xl w-full max-w-xs border border-white/10 shadow-2xl">
      <h3 className="text-center text-xs font-bold text-gray-400 mb-6 tracking-widest uppercase">Slide Race</h3>
      
      {/* Opponent Track */}
      <div className="mb-6">
        <div className="flex justify-between text-[10px] mb-1 text-red-400 font-bold uppercase">
          <span>{opponent || "Waiting..."}</span>
          <span>{oppPos}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="bg-red-500 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
            style={{ width: `${oppPos}%` }} 
          />
        </div>
      </div>

      {/* My Track */}
      <div className="mb-8">
        <div className="flex justify-between text-[10px] mb-1 text-[#2481cc] font-bold uppercase">
          <span>You</span>
          <span>{myPos}%</span>
        </div>
        <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="bg-[#2481cc] h-full transition-all duration-150 ease-out shadow-[0_0_15px_rgba(36,129,204,0.6)]" 
            style={{ width: `${myPos}%` }} 
          />
        </div>
      </div>

      <button 
        onPointerDown={handleMove}
        disabled={!!winner}
        className={`w-full py-4 rounded-xl font-black transition-all active:scale-95 ${
          winner 
          ? "bg-gray-700 text-gray-500 cursor-not-allowed" 
          : "bg-[#2481cc] text-white hover:bg-[#288fdf] shadow-lg shadow-blue-500/20"
        }`}
      >
        {winner ? "RACE FINISHED" : "TAP TO SLIDE ⚡"}
      </button>

      {winner && (
        <div className="mt-4 text-center animate-bounce">
          <span className="text-yellow-400 font-bold">
            {winner === username ? "🏆 YOU WON!" : `💀 ${winner} WON`}
          </span>
        </div>
      )}
    </div>
  );
}