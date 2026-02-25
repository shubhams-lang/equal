import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#080d14]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isMe ? 'bg-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)]' : 'bg-gray-800'}`}>
        <span className="text-5xl">{isMe ? "⚡" : "💀"}</span>
      </div>
      <h2 className={`text-5xl font-black italic mb-2 ${isMe ? 'text-yellow-400' : 'text-red-500'}`}>
        {isMe ? "GODLIKE" : "SHATTERED"}
      </h2>
      <div className="flex gap-4 mb-8">
        <div className="text-center bg-white/5 px-6 py-2 rounded-2xl">
          <p className="text-[8px] text-gray-500 font-black">YOU</p>
          <p className="text-2xl font-black text-blue-400">{scores[username] || 0}</p>
        </div>
        <div className="text-center bg-white/5 px-6 py-2 rounded-2xl">
          <p className="text-[8px] text-gray-500 font-black uppercase">{opponent?.substring(0,6)}</p>
          <p className="text-2xl font-black text-red-500">{scores[opponent] || 0}</p>
        </div>
      </div>
      <button onClick={onRematch} className="w-full max-w-[200px] bg-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest text-sm mb-3">Rematch</button>
      <button onClick={onQuit} className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Quit Game</button>
    </div>
  );
};

export default function TapTap() {
  const { socket, roomId, username, opponent, updateScore, scores, sendRematchRequest, closeGame } = useContext(ChatContext);
  
  const [myCount, setMyCount] = useState(0);
  const [oppCount, setOppCount] = useState(0);
  const [winner, setWinner] = useState(null);
  
  // Shield States
  const [isShieldActive, setIsShieldActive] = useState(false); // Am I shielded?
  const [isOpponentShielded, setIsOpponentShielded] = useState(false); // Is he shielded?
  const [shieldAvailable, setShieldAvailable] = useState(false); // Is the button visible?

  const gameOverSent = useRef(false);
  const TARGET = 60;

  // --- SHIELD SPAWN LOGIC (Random Intervals) ---
  useEffect(() => {
    if (winner) return;
    const spawnShield = () => {
      setShieldAvailable(true);
      // Auto-hide shield if not clicked in 3 seconds
      setTimeout(() => setShieldAvailable(false), 3000);
    };

    const timer = setInterval(spawnShield, Math.random() * 5000 + 5000);
    return () => clearInterval(timer);
  }, [winner]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    const handleData = (data) => {
      if (data.type === 'TAP_SYNC') {
        // If I am NOT shielded, his tap counts. If I AM shielded, his tap is ignored.
        if (!isShieldActive) {
          setOppCount(data.count);
          if (data.count >= TARGET && !gameOverSent.current) {
            setWinner(opponent);
            gameOverSent.current = true;
          }
        }
      }
      if (data.type === 'SHIELD_ON') {
        if (data.user === opponent) setIsOpponentShielded(true);
      }
      if (data.type === 'SHIELD_OFF') {
        if (data.user === opponent) setIsOpponentShielded(false);
      }
      if (data.type === 'TAP_WIN') {
        setWinner(data.winner);
        gameOverSent.current = true;
      }
    };

    socket.on('game-data', handleData);
    return () => socket.off('game-data', handleData);
  }, [socket, opponent, isShieldActive]);

  const activateShield = () => {
    setShieldAvailable(false);
    setIsShieldActive(true);
    socket.emit('game-data', { roomId, type: 'SHIELD_ON', user: username });

    // Shield lasts 1.5 seconds
    setTimeout(() => {
      setIsShieldActive(false);
      socket.emit('game-data', { roomId, type: 'SHIELD_OFF', user: username });
    }, 1500);
  };

  const handleTap = (e) => {
    if (e) e.preventDefault();
    if (winner || gameOverSent.current || isOpponentShielded) return;

    if (navigator.vibrate) navigator.vibrate(10);

    const newCount = myCount + 1;
    setMyCount(newCount);
    
    socket.emit('game-data', { roomId, type: 'TAP_SYNC', user: username, count: newCount });

    if (newCount >= TARGET && !gameOverSent.current) {
      gameOverSent.current = true;
      setWinner(username);
      updateScore(username);
      socket.emit('game-data', { roomId, type: 'TAP_WIN', winner: username });
    }
  };

  return (
    <div className="relative w-full h-full bg-[#080d14] flex flex-col items-center overflow-hidden font-sans">
      
      {/* Progress Section */}
      <div className="w-full flex h-24 border-b border-white/5 relative">
        <div className="flex-1 bg-blue-600/20 flex flex-col justify-center px-6 transition-all duration-500" style={{ flexGrow: 1 + (myCount - oppCount) / 10 }}>
          <span className="text-[8px] font-black text-blue-400 uppercase">You</span>
          <span className="text-3xl font-black text-white">{myCount}</span>
        </div>
        <div className="flex-1 bg-red-600/20 flex flex-col justify-center items-end px-6 transition-all duration-500" style={{ flexGrow: 1 + (oppCount - myCount) / 10 }}>
          <span className="text-[8px] font-black text-red-400 uppercase">{opponent?.substring(0,8)}</span>
          <span className="text-3xl font-black text-white">{oppCount}</span>
        </div>
      </div>

      {/* Battle Field */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative">
        
        {/* Shield Icon (Floating) */}
        {shieldAvailable && !isShieldActive && (
          <button 
            onClick={activateShield}
            className="absolute top-10 z-50 bg-white text-black font-black px-6 py-3 rounded-full shadow-[0_0_30px_white] animate-bounce text-xs"
          >
            🛡️ ACTIVATE SHIELD
          </button>
        )}

        {/* Status Text */}
        <div className="absolute top-20 text-[10px] font-black tracking-[0.4em] uppercase">
          {isOpponentShielded ? <span className="text-red-500 animate-pulse">Opponent Shielded!</span> : 
           isShieldActive ? <span className="text-blue-400">Shield Active</span> : 
           <span className="text-gray-600">Mash to Victory</span>}
        </div>

        {/* Main Button */}
        <button
          onPointerDown={handleTap}
          className={`
            relative w-52 h-52 rounded-full flex flex-col items-center justify-center
            transition-all duration-100 select-none touch-none outline-none z-20
            ${isShieldActive ? 'bg-white border-[10px] border-blue-400 shadow-[0_0_50px_rgba(255,255,255,0.5)]' : 
              isOpponentShielded ? 'bg-gray-800 scale-90 opacity-50' : 'bg-blue-600 active:scale-95 shadow-2xl'}
          `}
        >
          <span className="text-5xl mb-1">{isShieldActive ? "🛡️" : "⚡"}</span>
          <span className={`font-black text-2xl ${isShieldActive ? 'text-black' : 'text-white'}`}>
            {isOpponentShielded ? "LOCKED" : "TAP!!"}
          </span>
        </button>

        {/* Visual Shield Bubble */}
        {isShieldActive && (
          <div className="absolute w-72 h-72 border-4 border-blue-400/30 rounded-full animate-ping" />
        )}
      </div>

      {winner && (
        <GameOverOverlay 
          winner={winner} username={username} opponent={opponent} 
          scores={scores} onRematch={sendRematchRequest} onQuit={closeGame} 
        />
      )}
    </div>
  );
}