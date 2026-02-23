import React, { useState, useEffect, useContext, useRef } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${isMe ? 'bg-yellow-500 animate-bounce' : 'bg-gray-700'}`}>
        <span className="text-4xl">{isMe ? "⚡" : "🪫"}</span>
      </div>
      <h2 className={`text-4xl font-black italic tracking-tighter mb-1 ${isMe ? 'text-yellow-400' : 'text-red-500'}`}>
        {isMe ? "SUPERSONIC!" : "TOO SLOW"}
      </h2>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
        {isMe ? "Fastest fingers in the room" : `${winner} out-tapped you`}
      </p>
      
      <div className="flex gap-8 mb-8 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
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
          Exit
        </button>
      </div>
    </div>
  );
};

// --- MAIN TAP TAP COMPONENT ---
export default function TapTap() {
  const { socket, roomId, username, opponent, updateScore, scores, sendRematchRequest, closeGame } = useContext(ChatContext);
  
  const [myCount, setMyCount] = useState(0);
  const [oppCount, setOppCount] = useState(0);
  const [winner, setWinner] = useState(null);
  const [isPressed, setIsPressed] = useState(false);
  
  // Ref to prevent multiple "Win" emits if player keeps mashing after winning
  const gameOverSent = useRef(false);
  const TARGET = 50;

  useEffect(() => {
    const socketListener = (data) => {
      if (data.type === 'TAP_SYNC') {
        if (data.user === opponent) {
          setOppCount(data.count);
          // If opponent reached target, set them as winner locally
          if (data.count >= TARGET && !gameOverSent.current) {
            setWinner(opponent);
            gameOverSent.current = true;
          }
        }
      }
      if (data.type === 'TAP_WIN') {
        setWinner(data.winner);
        gameOverSent.current = true;
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, opponent]);

  const handleTap = (e) => {
    // Prevent default to stop "Ghost Clicks" (mobile browsers firing both touch and mouse events)
    if (e) e.preventDefault();
    if (winner || gameOverSent.current) return;
    
    const newCount = myCount + 1;
    setMyCount(newCount);
    
    // Visual Feedback
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 75);

    // Sync count to opponent
    socket.emit('game-data', { 
      roomId, 
      type: 'TAP_SYNC', 
      user: username, 
      count: newCount 
    });

    // Check Win Condition
    if (newCount >= TARGET && !gameOverSent.current) {
      gameOverSent.current = true;
      setWinner(username);
      updateScore(username); // Update global scores
      socket.emit('game-data', { roomId, type: 'TAP_WIN', winner: username });
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] flex flex-col items-center justify-between p-6 overflow-hidden">
      
      {/* Progress Bars */}
      <div className="w-full space-y-4 pt-4">
        <div className="flex justify-between items-end px-1">
           <div className="flex flex-col">
             <span className="text-[8px] font-black text-gray-500 uppercase">Your Energy</span>
             <span className="text-lg font-black text-[#2481cc]">{myCount}</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[8px] font-black text-gray-500 uppercase">{opponent?.split(' ')[1] || 'Opponent'}</span>
             <span className="text-lg font-black text-red-500">{oppCount}</span>
           </div>
        </div>
        
        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/5">
          <div 
            className="h-full bg-[#2481cc] rounded-full transition-all duration-100 shadow-[0_0_10px_rgba(36,129,204,0.5)]" 
            style={{ width: `${Math.min((myCount / TARGET) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Main Tap Button Area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Decorative Ripple Effect when pressed */}
        {isPressed && (
          <div className="absolute w-44 h-44 rounded-full border-4 border-[#2481cc] animate-ping opacity-20" />
        )}
        
        <button
          // Use pointer events for best cross-platform performance
          onPointerDown={handleTap}
          className={`
            w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-2xl
            transition-all duration-75 select-none touch-none outline-none
            ${isPressed 
              ? 'scale-90 bg-[#1e6fb1] shadow-none translate-y-1' 
              : 'scale-100 bg-[#2481cc] hover:bg-[#2b8de0] shadow-[0_20px_50px_rgba(36,129,204,0.3)]'}
          `}
        >
          <span className="text-5xl mb-2 drop-shadow-lg">⚡</span>
          <span className="font-black text-2xl tracking-tighter text-white">TAP!!</span>
          <div className="mt-2 bg-black/20 px-3 py-1 rounded-full">
             <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">
               {Math.max(TARGET - myCount, 0)} TO GO
             </p>
          </div>
        </button>
      </div>

      {/* Instructions */}
      <div className="pb-6">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] animate-pulse">
            Mash for victory
          </p>
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