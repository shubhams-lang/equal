import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- UPDATED GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username, rematchStatus }) => {
  const isMe = winner === username;
  const hasSent = rematchStatus === 'sent';
  const hasReceived = rematchStatus === 'received';

  return (
    <div className="absolute inset-0 z-[110] bg-[#080d14]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isMe ? 'bg-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)]' : 'bg-gray-800'}`}>
        <span className="text-5xl animate-bounce">{isMe ? "⚡" : "💀"}</span>
      </div>
      
      <h2 className={`text-5xl font-black italic mb-2 ${isMe ? 'text-yellow-400' : 'text-red-500'}`}>
        {isMe ? "GODLIKE" : "SHATTERED"}
      </h2>

      {/* Scoreboard */}
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

      <div className="flex flex-col w-full gap-3 max-w-[240px]">
        <button 
          onClick={onRematch} 
          disabled={hasSent}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95
            ${hasReceived ? 'bg-green-500 animate-pulse text-black' : 
              hasSent ? 'bg-gray-700 text-gray-400 cursor-default' : 'bg-blue-600 text-white shadow-blue-500/20'}
          `}
        >
          {hasReceived ? 'Accept Rematch' : hasSent ? 'Waiting...' : 'Request Rematch'}
        </button>

        <button onClick={onQuit} className="mt-2 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors">
          Quit Game
        </button>
      </div>
    </div>
  );
};

export default function TapTap() {
  const { socket, roomId, username, opponent, updateScore, scores, closeGame } = useContext(ChatContext);
  
  const [myCount, setMyCount] = useState(0);
  const [oppCount, setOppCount] = useState(0);
  const [winner, setWinner] = useState(null);
  const [rematchStatus, setRematchStatus] = useState(null); // 'sent' | 'received' | null
  
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [isOpponentShielded, setIsOpponentShielded] = useState(false);
  const [shieldAvailable, setShieldAvailable] = useState(false);

  const gameOverSent = useRef(false);
  const TARGET = 60;

  // --- RESET GAME LOGIC ---
  const resetLocalState = useCallback(() => {
    setMyCount(0);
    setOppCount(0);
    setWinner(null);
    setRematchStatus(null);
    setIsShieldActive(false);
    setIsOpponentShielded(false);
    setShieldAvailable(false);
    gameOverSent.current = false;
  }, []);

  useEffect(() => {
    const handleData = (data) => {
      // Game Syncing
      if (data.type === 'TAP_SYNC' && data.user === opponent && !isShieldActive) {
        setOppCount(data.count);
        if (data.count >= TARGET && !gameOverSent.current) {
          setWinner(opponent);
          gameOverSent.current = true;
        }
      }

      // Rematch Signaling
      if (data.type === 'REMATCH_OFFER' && data.user === opponent) {
        setRematchStatus('received');
      }
      if (data.type === 'REMATCH_START') {
        resetLocalState();
      }

      // Shielding
      if (data.type === 'SHIELD_ON' && data.user === opponent) setIsOpponentShielded(true);
      if (data.type === 'SHIELD_OFF' && data.user === opponent) setIsOpponentShielded(false);
      if (data.type === 'TAP_WIN') { setWinner(data.winner); gameOverSent.current = true; }
    };

    socket.on('game-data', handleData);
    return () => socket.off('game-data', handleData);
  }, [socket, opponent, isShieldActive, resetLocalState]);

  const handleRematchClick = () => {
    if (rematchStatus === 'received') {
      // We both agree, tell the opponent to start
      socket.emit('game-data', { roomId, type: 'REMATCH_START' });
      resetLocalState();
    } else {
      // Send the offer
      setRematchStatus('sent');
      socket.emit('game-data', { roomId, type: 'REMATCH_OFFER', user: username });
    }
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

  // ... (Keep existing activateShield and UI logic)
  const activateShield = () => {
    setShieldAvailable(false);
    setIsShieldActive(true);
    socket.emit('game-data', { roomId, type: 'SHIELD_ON', user: username });
    setTimeout(() => {
      setIsShieldActive(false);
      socket.emit('game-data', { roomId, type: 'SHIELD_OFF', user: username });
    }, 1500);
  };

  return (
    <div className="relative w-full h-full bg-[#080d14] flex flex-col items-center overflow-hidden font-sans">
      {/* Progress Bars */}
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

      {/* Main Battle UI */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative">
        {shieldAvailable && !isShieldActive && (
          <button onClick={activateShield} className="absolute top-10 z-50 bg-white text-black font-black px-6 py-3 rounded-full shadow-[0_0_30px_white] animate-bounce text-xs">
            🛡️ ACTIVATE SHIELD
          </button>
        )}
        <button
          onPointerDown={handleTap}
          className={`relative w-52 h-52 rounded-full flex flex-col items-center justify-center transition-all duration-100 select-none touch-none outline-none z-20
            ${isShieldActive ? 'bg-white border-[10px] border-blue-400 shadow-[0_0_50px_rgba(255,255,255,0.5)]' : 
              isOpponentShielded ? 'bg-gray-800 scale-90 opacity-50' : 'bg-blue-600 active:scale-95 shadow-2xl'}
          `}
        >
          <span className="text-5xl mb-1">{isShieldActive ? "🛡️" : "⚡"}</span>
          <span className={`font-black text-2xl ${isShieldActive ? 'text-black' : 'text-white'}`}>
            {isOpponentShielded ? "LOCKED" : "TAP!!"}
          </span>
        </button>
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