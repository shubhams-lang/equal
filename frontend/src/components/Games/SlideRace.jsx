import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- UPDATED GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username, rematchStatus }) => {
  const isMe = winner === username;
  const hasRequested = rematchStatus === 'sent';
  const hasReceived = rematchStatus === 'received';

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

      <div className="flex flex-col w-full gap-3 max-w-[220px]">
        <button 
          onClick={onRematch} 
          disabled={hasRequested}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95
            ${hasReceived ? 'bg-green-500 animate-pulse text-black' : 
              hasRequested ? 'bg-gray-700 text-gray-400 cursor-default' : 'bg-[#2481cc] text-white shadow-blue-500/20'}
          `}
        >
          {hasReceived ? 'Accept Rematch' : hasRequested ? 'Waiting for Opponent...' : 'Rematch'}
        </button>

        <button onClick={onQuit} className="mt-2 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors">
          Quit to Lobby
        </button>
      </div>
    </div>
  );
};

export default function SliderRace() {
  const { socket, roomId, username, opponent, updateScore, scores, closeGame } = useContext(ChatContext);
  
  // Game States
  const [progress, setProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [heat, setHeat] = useState(0);
  const [winner, setWinner] = useState(null);
  const [turboActive, setTurboActive] = useState(false);
  const [turboAvailable, setTurboAvailable] = useState(false);
  const [rematchStatus, setRematchStatus] = useState(null); // 'sent', 'received', null

  const gameEnded = useRef(false);
  const lastX = useRef(0);
  const turboUsedAt = useRef([]);

  // Reset function to clear all states for a new race
  const resetRace = useCallback(() => {
    setProgress(0);
    setOppProgress(0);
    setVelocity(0);
    setHeat(0);
    setWinner(null);
    setTurboActive(false);
    setTurboAvailable(false);
    setRematchStatus(null);
    gameEnded.current = false;
    lastX.current = 0;
    turboUsedAt.current = [];
  }, []);

  // Socket Listener
  useEffect(() => {
    const handleData = (data) => {
      switch (data.type) {
        case 'SLIDE_UPDATE':
          if (data.user === opponent) {
            setOppProgress(data.val);
            if (data.val >= 100 && !gameEnded.current) {
              setWinner(opponent);
              gameEnded.current = true;
            }
          }
          break;
        case 'RACE_OVER':
          setWinner(data.winner);
          gameEnded.current = true;
          break;
        case 'REMATCH_REQUEST':
          if (data.from === opponent) setRematchStatus('received');
          break;
        case 'RACE_RESTART':
          resetRace();
          break;
        default: break;
      }
    };
    socket.on('game-data', handleData);
    return () => socket.off('game-data', handleData);
  }, [socket, opponent, resetRace]);

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
      
      if (velocity > 0.05) {
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

  const handleRematchClick = () => {
    if (rematchStatus === 'received') {
      // Both are ready, trigger restart
      socket.emit('game-data', { roomId, type: 'RACE_RESTART' });
      resetRace();
    } else {
      // Send request to opponent
      setRematchStatus('sent');
      socket.emit('game-data', { roomId, type: 'REMATCH_REQUEST', from: username });
    }
  };

  return (
    <div className={`relative w-full h-full bg-[#080d14] flex flex-col justify-center items-center overflow-hidden transition-all duration-75`}>
      {/* ... (Keep the Race HUD and Track UI from previous code) ... */}
      
      {/* Turbo Button Logic */}
      {progress >= 30 && progress <= 35 && !turboUsedAt.current.includes(30) && !turboActive && (
         <button onClick={() => { setTurboActive(true); setVelocity(3.5); turboUsedAt.current.push(30); setTimeout(() => setTurboActive(false), 1500); }} 
         className="absolute top-24 z-50 bg-yellow-400 text-black px-8 py-2 rounded-full font-black animate-bounce shadow-lg">BOOST!</button>
      )}

      {/* Track UI */}
      <div className="w-full max-w-[320px] space-y-20 relative z-10">
        {/* Opponent Lane */}
        <div className="relative pt-4 opacity-40">
          <div className="h-1 w-full bg-white/5 rounded-full" />
          <span className="absolute -top-3 transition-all duration-500 text-xl" style={{ left: `calc(${oppProgress}% - 12px)` }}>🏎️</span>
        </div>

        {/* Player Lane */}
        <div className="relative">
          <div className="relative h-24 flex items-center bg-black/40 rounded-[2rem] px-6 border border-white/5">
            <div className="relative w-full h-3 bg-white/5 rounded-full">
              <div className={`absolute left-0 h-full rounded-full ${turboActive ? 'bg-yellow-400' : 'bg-[#2481cc]'}`} style={{ width: `${progress}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${progress}% - 24px)` }}>
                <span className="text-4xl">🏎️</span>
              </div>
            </div>
            <input type="range" min="0" max="100" defaultValue="0" onChange={handleInput} className="absolute inset-x-6 h-full opacity-0 cursor-pointer z-20 touch-none" />
          </div>
        </div>
      </div>

      {winner && (
        <GameOverOverlay 
          winner={winner} 
          username={username} 
          opponent={opponent} 
          scores={scores} 
          rematchStatus={rematchStatus}
          onRematch={handleRematchClick} 
          onQuit={closeGame} 
        />
      )}
    </div>
  );
}