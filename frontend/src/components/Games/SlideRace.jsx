import React, { useState, useEffect, useContext, useRef } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${isMe ? 'bg-yellow-500 shadow-yellow-500/20' : 'bg-gray-700'}`}>
        <span className="text-4xl">{isMe ? "🏎️" : "🏳️"}</span>
      </div>
      <h2 className={`text-3xl font-black italic tracking-tighter mb-1 ${isMe ? 'text-yellow-500' : 'text-red-500'}`}>
        {isMe ? "YOU WON!" : "TOO SLOW..."}
      </h2>
      
      <div className="flex gap-8 my-6 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
        <div>
          <p className="text-[8px] text-gray-500 font-black">YOU</p>
          <p className="text-xl font-black text-[#2481cc]">{scores[username] || 0}</p>
        </div>
        <div className="w-px h-8 bg-white/10 self-center" />
        <div>
          <p className="text-[8px] text-gray-500 font-black uppercase text-center">{opponent?.split(' ')[1] || 'OPP'}</p>
          <p className="text-xl font-black text-red-500">{scores[opponent] || 0}</p>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3 max-w-[200px]">
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
  
  // Ref prevents multiple win emits if the user wiggles the slider at 100
  const gameEnded = useRef(false);

  useEffect(() => {
    const socketListener = (data) => {
      if (data.type === 'SLIDE_UPDATE') {
        if (data.user === opponent) {
          setOppProgress(data.val);
          // Sync win if opponent reached 100
          if (data.val >= 100 && !gameEnded.current) {
            setWinner(opponent);
            gameEnded.current = true;
          }
        }
      }
      if (data.type === 'RACE_OVER') {
        setWinner(data.winner);
        gameEnded.current = true;
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, opponent]);

  const handleSlide = (e) => {
    if (winner || gameEnded.current) return;
    
    const newVal = parseInt(e.target.value);
    
    // Anticheat: Can only move forward
    if (newVal > progress) {
      setProgress(newVal);
      
      socket.emit('game-data', { 
        roomId, 
        type: 'SLIDE_UPDATE', 
        user: username, 
        val: newVal 
      });

      if (newVal >= 100) {
        gameEnded.current = true;
        setWinner(username);
        updateScore(username);
        socket.emit('game-data', { roomId, type: 'RACE_OVER', winner: username });
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col justify-center items-center overflow-hidden">
      
      <div className="w-full max-w-xs space-y-12">
        
        {/* Opponent Lane */}
        <div className="relative pt-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
              {opponent?.split(' ')[1] || 'Opponent'}
            </p>
            <p className="text-[10px] font-mono text-gray-500">{oppProgress}%</p>
          </div>
          <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
            <div 
              className="h-full bg-red-500/30 transition-all duration-300 ease-out"
              style={{ width: `${oppProgress}%` }}
            />
            {/* Opponent Car Icon */}
            <span 
              className="absolute top-1/2 -translate-y-1/2 text-sm transition-all duration-300 ease-out" 
              style={{ left: `calc(${oppProgress}% - 12px)` }}
            >
              🏎️
            </span>
          </div>
        </div>

        {/* Player Lane */}
        <div className="relative pt-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-[#2481cc] uppercase tracking-[0.2em]">Your Machine</p>
            <p className="text-[10px] font-mono text-gray-500">{progress}%</p>
          </div>
          
          <div className="relative h-10 flex items-center">
            {/* Background Track */}
            <div className="absolute inset-x-0 h-4 bg-white/10 rounded-full border border-white/10" />
            
            {/* Active Fill */}
            <div 
              className="absolute left-0 h-4 bg-[#2481cc] rounded-full shadow-[0_0_20px_rgba(36,129,204,0.4)] pointer-events-none" 
              style={{ width: `${progress}%` }}
            />
            
            {/* Invisible Range Slider */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress}
              onChange={handleSlide}
              // touch-none is critical to prevent the screen from moving while racing
              className="absolute inset-0 w-full h-10 opacity-0 cursor-pointer z-20 touch-none"
            />
            
            {/* Player Car Icon + Thumb */}
            <div 
              className="absolute w-8 h-8 pointer-events-none flex flex-col items-center justify-center transition-transform active:scale-125"
              style={{ left: `calc(${progress}% - 16px)` }}
            >
              <span className="text-xl mb-6">🏎️</span>
              <div className="w-5 h-5 bg-white rounded-full shadow-xl border-2 border-[#2481cc] flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center pt-8">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] animate-pulse">
               MASH TO THE FINISH
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