import React, { useState, useEffect, useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${isMe ? 'bg-yellow-500' : 'bg-gray-700'}`}>
        <span className="text-4xl">{isMe ? "🏎️" : "🏳️"}</span>
      </div>
      <h2 className={`text-3xl font-black italic tracking-tighter mb-1 ${isMe ? 'text-yellow-500' : 'text-red-500'}`}>
        {isMe ? "YOU WON!" : "TOO SLOW..."}
      </h2>
      <div className="flex gap-8 my-6 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
        <div>
          <p className="text-[8px] text-gray-500 font-black">YOU</p>
          <p className="text-xl font-black">{scores[username] || 0}</p>
        </div>
        <div className="w-px h-8 bg-white/10 self-center" />
        <div>
          <p className="text-[8px] text-gray-500 font-black uppercase">{opponent}</p>
          <p className="text-xl font-black">{scores[opponent] || 0}</p>
        </div>
      </div>
      <div className="flex flex-col w-full gap-3">
        <button onClick={onRematch} className="w-full bg-[#2481cc] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
          Rematch
        </button>
        <button onClick={onQuit} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400">
          Lobby
        </button>
      </div>
    </div>
  );
};

// --- MAIN SLIDER RACE COMPONENT ---
export default function SliderRace() {
  const { socket, roomId, username, opponent, updateScore, scores, sendRematchRequest, closeGame } = useContext(ChatContext);
  
  const [progress, setProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    const socketListener = (data) => {
      if (data.type === 'SLIDE_UPDATE') {
        if (data.user === opponent) setOppProgress(data.val);
      }
      if (data.type === 'RACE_OVER') {
        setWinner(data.winner);
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, opponent]);

  const handleSlide = (e) => {
    if (winner) return;
    
    const newVal = parseInt(e.target.value);
    
    // Players can only move forward, no cheating by sliding back!
    if (newVal > progress) {
      setProgress(newVal);
      socket.emit('game-data', { 
        roomId, 
        type: 'SLIDE_UPDATE', 
        user: username, 
        val: newVal 
      });

      if (newVal >= 100) {
        socket.emit('game-data', { roomId, type: 'RACE_OVER', winner: username });
        setWinner(username);
        updateScore(username);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col justify-center items-center overflow-hidden">
      
      {/* Track Background */}
      <div className="w-full max-w-xs space-y-12">
        
        {/* Opponent Lane */}
        <div className="relative pt-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{opponent}</p>
            <p className="text-[10px] font-mono text-gray-500">{oppProgress}%</p>
          </div>
          <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300 ease-out"
              style={{ width: `${oppProgress}%` }}
            />
          </div>
          <span className="absolute -top-1 left-0 text-xs" style={{ left: `calc(${oppProgress}% - 10px)` }}>🏎️</span>
        </div>

        {/* Player Lane */}
        <div className="relative pt-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-[#2481cc] uppercase tracking-widest">YOU</p>
            <p className="text-[10px] font-mono text-gray-500">{progress}%</p>
          </div>
          
          <div className="relative h-8 flex items-center">
             {/* Visual Track */}
            <div className="absolute inset-x-0 h-4 bg-white/10 rounded-full border border-white/10" />
            <div 
              className="absolute left-0 h-4 bg-[#2481cc] rounded-full shadow-[0_0_20px_rgba(36,129,204,0.6)] pointer-events-none" 
              style={{ width: `${progress}%` }}
            />
            
            {/* The Actual Invisible Slider */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress}
              onChange={handleSlide}
              className="absolute inset-0 w-full h-8 opacity-0 cursor-pointer z-10"
            />
            
            {/* Thumb Visual */}
            <div 
              className="absolute w-6 h-6 bg-white rounded-full shadow-xl border-2 border-[#2481cc] pointer-events-none flex items-center justify-center transition-transform active:scale-125"
              style={{ left: `calc(${progress}% - 12px)` }}
            >
              <div className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-ping" />
            </div>
          </div>
        </div>

        <div className="text-center pt-8">
            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em] animate-pulse">
                Slide to the end to win
            </p>
        </div>
      </div>

      {winner && (
        <GameOverOverlay 
          winner={winner}
          username={username}
          opponent={opponent}
          scores={scores}
          onRematch={sendRematchRequest}
          onQuit={closeGame}
        />
      )}
    </div>
  );
}