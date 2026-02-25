import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#080d14]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isMe ? 'bg-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.4)]' : 'bg-gray-800'}`}>
        <span className="text-5xl animate-bounce">{isMe ? "🏆" : "🏳️"}</span>
      </div>
      <h2 className={`text-5xl font-black italic mb-2 ${isMe ? 'text-yellow-400' : 'text-red-500'}`}>
        {isMe ? "1ST PLACE" : "WRECKED"}
      </h2>
      <div className="flex gap-4 mb-8 bg-white/5 p-4 rounded-3xl border border-white/5">
        <div className="text-center px-4">
          <p className="text-[8px] text-gray-500 font-black">YOU</p>
          <p className="text-2xl font-black text-blue-400">{scores[username] || 0}</p>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center px-4">
          <p className="text-[8px] text-gray-500 font-black uppercase">{opponent?.substring(0,6)}</p>
          <p className="text-2xl font-black text-red-500">{scores[opponent] || 0}</p>
        </div>
      </div>
      <button onClick={onRematch} className="w-full max-w-[220px] bg-[#2481cc] py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-white">New Race</button>
      <button onClick={onQuit} className="mt-4 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors">Quit to Lobby</button>
    </div>
  );
};

export default function SliderRace() {
  const { socket, roomId, username, opponent, updateScore, scores, sendRematchRequest, closeGame } = useContext(ChatContext);
  
  const [progress, setProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [heat, setHeat] = useState(0);
  const [winner, setWinner] = useState(null);
  const [turboActive, setTurboActive] = useState(false);
  const [turboAvailable, setTurboAvailable] = useState(false);
  
  const gameEnded = useRef(false);
  const lastX = useRef(0);
  const turboUsedAt = useRef([]); // Track progress points where turbo was used

  // Socket Listener
  useEffect(() => {
    const handleData = (data) => {
      if (data.type === 'SLIDE_UPDATE' && data.user === opponent) {
        setOppProgress(data.val);
        if (data.val >= 100 && !gameEnded.current) {
          setWinner(opponent);
          gameEnded.current = true;
        }
      }
      if (data.type === 'RACE_OVER') {
        setWinner(data.winner);
        gameEnded.current = true;
      }
    };
    socket.on('game-data', handleData);
    return () => socket.off('game-data', handleData);
  }, [socket, opponent]);

  // Turbo Availability Logic
  useEffect(() => {
    const p = Math.floor(progress);
    const triggerPoints = [30, 70];
    const canTurbo = triggerPoints.some(tp => p >= tp && p <= tp + 5 && !turboUsedAt.current.includes(tp));
    
    if (canTurbo && !turboAvailable && !turboActive) {
      setTurboAvailable(true);
    }
  }, [progress, turboAvailable, turboActive]);

  // Physics Loop
  useEffect(() => {
    if (winner) return;
    const loop = setInterval(() => {
      setProgress(prev => {
        const next = prev + (turboActive ? velocity * 2.5 : velocity);
        if (next >= 100 && !gameEnded.current) {
          gameEnded.current = true;
          setWinner(username);
          updateScore(username);
          socket.emit('game-data', { roomId, type: 'RACE_OVER', winner: username });
          return 100;
        }
        return Math.min(next, 100);
      });

      setVelocity(v => Math.max(0, v * 0.94));
      setHeat(h => Math.max(0, h - 0.8));
      
      if (velocity > 0.01) {
        socket.emit('game-data', { roomId, type: 'SLIDE_UPDATE', user: username, val: progress });
      }
    }, 50);

    return () => clearInterval(loop);
  }, [velocity, winner, progress, turboActive, username, roomId, socket, updateScore]);

  const handleInput = (e) => {
    if (winner || heat > 95) return;
    const currentX = parseInt(e.target.value);
    const delta = Math.abs(currentX - lastX.current);
    
    if (delta > 0) {
      setVelocity(v => Math.min(2.5, v + delta * 0.015));
      setHeat(h => Math.min(100, h + delta * 0.25));
    }
    lastX.current = currentX;
  };

  const triggerTurbo = () => {
    if (!turboAvailable || heat > 60) return;
    
    // Find which trigger point we are at and mark it used
    const p = Math.floor(progress);
    const point = p >= 70 ? 70 : 30;
    turboUsedAt.current.push(point);

    setTurboAvailable(false);
    setTurboActive(true);
    setVelocity(3.5);
    setHeat(prev => Math.min(100, prev + 40));

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    setTimeout(() => setTurboActive(false), 1500);
  };

  return (
    <div className={`relative w-full h-full bg-[#080d14] flex flex-col justify-center items-center overflow-hidden transition-all duration-75 ${turboActive ? 'bg-blue-900/20' : ''}`}>
      
      {/* HUD Progress */}
      <div className="absolute top-10 w-full max-w-[320px] flex justify-between px-4 items-end">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Heat Sync</span>
          <div className="w-32 h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden border border-white/5">
            <div className={`h-full transition-all duration-300 ${heat > 80 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${heat}%` }} />
          </div>
        </div>
        <div className="text-right">
           <span className="text-3xl font-black italic text-white/20 leading-none">{Math.floor(progress)}%</span>
        </div>
      </div>

      <div className="w-full max-w-[320px] space-y-20 relative z-10">
        
        {/* Opponent Lane */}
        <div className="relative pt-4 opacity-40">
          <div className="h-1 w-full bg-white/5 rounded-full" />
          <span className="absolute -top-3 transition-all duration-500 text-xl" style={{ left: `calc(${oppProgress}% - 12px)` }}>🏎️</span>
        </div>

        {/* Player Lane */}
        <div className="relative">
          {/* Turbo Button */}
          {turboAvailable && (
            <button 
              onClick={triggerTurbo}
              className={`absolute -top-16 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full font-black text-xs italic tracking-tighter transition-all animate-bounce
                ${heat > 60 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 text-black shadow-[0_0_30px_#eab308]'}`}
            >
              {heat > 60 ? 'ENGINE TOO HOT' : '🚀 PRESS FOR TURBO'}
            </button>
          )}

          <div className="relative h-24 flex items-center bg-black/40 rounded-[2rem] px-6 border border-white/5 shadow-inner">
            {/* Finish Line */}
            <div className="absolute right-4 h-16 w-6 border-l-4 border-dashed border-white/10" />

            <div className="relative w-full h-3 bg-white/5 rounded-full">
              <div className={`absolute left-0 h-full rounded-full transition-all duration-100 ${turboActive ? 'bg-yellow-400 shadow-[0_0_40px_#facc15]' : 'bg-[#2481cc] shadow-[0_0_20px_#2481cc]'}`}
                   style={{ width: `${progress}%` }} />
              
              <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-75"
                   style={{ left: `calc(${progress}% - 24px)`, transform: `translateY(-50%) skewX(${-velocity * 12}deg)` }}>
                <span className={`text-4xl block ${turboActive ? 'animate-pulse scale-125' : ''}`}>🏎️</span>
                {turboActive && <span className="absolute -left-6 top-1 text-2xl animate-pulse">🔥</span>}
              </div>
            </div>

            <input type="range" min="0" max="100" defaultValue="0" onChange={handleInput} 
                   className="absolute inset-x-6 h-full opacity-0 cursor-pointer z-20 touch-none" />
          </div>
        </div>

        <div className="text-center space-y-2">
           <p className={`text-[9px] font-black uppercase tracking-[0.5em] transition-colors ${heat > 85 ? 'text-orange-500 animate-pulse' : 'text-gray-600'}`}>
             {heat > 85 ? 'WARNING: ENGINE OVERHEATING' : 'Scrub Slider to Race'}
           </p>
        </div>
      </div>

      {winner && <GameOverOverlay winner={winner} username={username} opponent={opponent} scores={scores} onRematch={sendRematchRequest} onQuit={closeGame} />}
    </div>
  );
}