import React, { useState, useEffect, useContext } from 'react';
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
          <p className="text-[8px] text-gray-500 font-black uppercase">{opponent}</p>
          <p className="text-xl font-black text-red-500">{scores[opponent] || 0}</p>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3">
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

  const TARGET = 50; // First to 50 taps wins

  useEffect(() => {
    const socketListener = (data) => {
      if (data.type === 'TAP_SYNC') {
        if (data.user === opponent) setOppCount(data.count);
      }
      if (data.type === 'TAP_WIN') {
        setWinner(data.winner);
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, opponent]);

  const handleTap = () => {
    if (winner) return;
    
    const newCount = myCount + 1;
    setMyCount(newCount);
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 50);

    socket.emit('game-data', { 
      roomId, 
      type: 'TAP_SYNC', 
      user: username, 
      count: newCount 
    });

    if (newCount >= TARGET) {
      socket.emit('game-data', { roomId, type: 'TAP_WIN', winner: username });
      setWinner(username);
      updateScore(username);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] flex flex-col items-center justify-between p-6 overflow-hidden">
      
      {/* Top Status Bar */}
      <div className="w-full space-y-4 pt-4">
        <div className="flex justify-between items-end">
           <span className="text-[10px] font-black text-[#2481cc]">YOU: {myCount}</span>
           <span className="text-[10px] font-black text-red-500">{opponent}: {oppCount}</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-[#2481cc] transition-all duration-100" 
            style={{ width: `${(myCount / TARGET) * 50}%` }}
          />
          <div className="w-px h-full bg-white/20" />
          <div 
            className="h-full bg-red-500/50 transition-all duration-100 ml-auto" 
            style={{ width: `${(oppCount / TARGET) * 50}%` }}
          />
        </div>
      </div>

      {/* Main Tap Area */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onMouseDown={handleTap}
          onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
          className={`
            w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-2xl
            transition-all duration-75 select-none touch-none
            ${isPressed 
              ? 'scale-90 bg-[#1e6fb1] shadow-none' 
              : 'scale-100 bg-[#2481cc] hover:bg-[#2b8de0] shadow-[0_20px_50px_rgba(36,129,204,0.3)]'}
          `}
        >
          <span className="text-4xl mb-1">⚡</span>
          <span className="font-black text-lg tracking-tighter">TAP!!</span>
          <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest mt-1">
            {TARGET - myCount} Left
          </p>
        </button>
      </div>

      {/* Decorative Text */}
      <div className="pb-4 text-center">
         <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] animate-pulse">
            Mash it to win
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