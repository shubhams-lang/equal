import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const TTTGameOver = ({ winner, isDraw, onRematch, onQuit, opponent, username, series }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${isDraw ? 'bg-blue-500' : (isMe ? 'bg-[#25D366] animate-bounce' : 'bg-gray-700')}`}>
        <span className="text-4xl">{isDraw ? "🤝" : (isMe ? "🏆" : "💀")}</span>
      </div>
      <h2 className={`text-3xl font-black italic tracking-tighter mb-2 ${isDraw ? 'text-blue-400' : (isMe ? 'text-[#25D366]' : 'text-red-500')}`}>
        {isDraw ? "DRAW!" : (isMe ? "VICTORY!" : "DEFEAT...")}
      </h2>
      
      {/* Series Progress */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((step) => (
          <div key={step} className={`w-8 h-1.5 rounded-full ${series >= step ? 'bg-[#25D366]' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="flex flex-col w-full gap-3 max-w-[200px]">
        <button onClick={onRematch} className="w-full bg-[#2481cc] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform hover:bg-[#2b8de0]">
          Play Again
        </button>
        <button onClick={onQuit} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-white/10">
          Quit Game
        </button>
      </div>
    </div>
  );
};

export default function TicTacToe() {
  const { socket, roomId, username, users, updateScore, closeGame } = useContext(ChatContext);
  
  const opponent = users.find(u => u !== username) || "Opponent";
  const sortedUsers = [...users].sort();
  const mySymbol = sortedUsers.indexOf(username) === 0 ? 'X' : 'O';
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';

  const [board, setBoard] = useState(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(mySymbol === 'X'); 
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [winStreak, setWinStreak] = useState(0);

  // Memoized reset function to ensure it's stable for useEffect
  const resetGameLocal = useCallback(() => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsDraw(false);
    setIsMyTurn(mySymbol === 'X');
  }, [mySymbol]);

  useEffect(() => {
    const socketListener = (data) => {
      if (data.type === 'TTT_MOVE') {
        setBoard(data.board);
        const result = checkWinner(data.board);
        if (result === 'DRAW') setIsDraw(true);
        else if (result) setWinner(result === mySymbol ? username : opponent);
        else setIsMyTurn(true); 
      }
      
      // CRITICAL: This allows the "Play Again" button to work for BOTH players
      if (data.type === 'TTT_RESTART') {
        resetGameLocal();
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, mySymbol, opponent, username, resetGameLocal]);

  const checkWinner = (sq) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let [a,b,c] of lines) {
      if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) return sq[a];
    }
    return sq.every(s => s !== null) ? 'DRAW' : null;
  };

  const handleClick = (i) => {
    if (!isMyTurn || board[i] || winner || isDraw) return;

    const newBoard = [...board];
    newBoard[i] = mySymbol;
    setBoard(newBoard);
    setIsMyTurn(false);

    const result = checkWinner(newBoard);
    socket.emit('game-data', { roomId, type: 'TTT_MOVE', board: newBoard });

    if (result) {
      if (result === 'DRAW') {
        setIsDraw(true);
      } else {
        setWinner(username);
        setWinStreak(prev => prev + 1);
        updateScore(username);
      }
    }
  };

  const triggerRematch = () => {
    // Tell the other player to reset their screen
    socket.emit('game-data', { roomId, type: 'TTT_RESTART' });
    // Reset our own screen
    resetGameLocal();
  };

  return (
    <div className="relative w-full max-w-[340px] aspect-square bg-[#0e1621] rounded-[2.5rem] p-6 shadow-2xl border border-white/5 overflow-hidden flex flex-col items-center justify-center">
      
      {/* Series Status */}
      <div className="absolute top-4 left-6 flex items-center gap-1">
        <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mr-1">Wins:</p>
        {[1, 2, 3].map(s => (
          <div key={s} className={`w-1.5 h-1.5 rounded-full ${winStreak >= s ? 'bg-[#25D366]' : 'bg-white/10'}`} />
        ))}
      </div>

      {/* Turn Indicator */}
      <div className={`mb-6 px-6 py-2 rounded-full border transition-all duration-300 ${isMyTurn ? 'border-[#25D366] bg-[#25D366]/10' : 'border-white/10 bg-white/5'}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isMyTurn ? 'text-[#25D366]' : 'text-gray-400'}`}>
          {isMyTurn ? `Your Turn (${mySymbol})` : `Opponent Thinking...`}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3 w-full aspect-square">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={!isMyTurn || cell !== null}
            className={`rounded-2xl flex items-center justify-center text-4xl font-black transition-all active:scale-95
              ${cell === 'X' ? 'text-blue-400 bg-blue-400/5' : 'text-[#25D366] bg-[#25D366]/5'}
              ${!cell && isMyTurn ? 'bg-white/5 hover:bg-white/10' : 'bg-[#1c2733]'}
              ${!isMyTurn && !cell ? 'opacity-30' : 'opacity-100'}
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="mt-6 flex gap-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest items-center">
        <span className={mySymbol === 'X' ? 'text-blue-400' : 'text-[#25D366]'}>You: {mySymbol}</span>
        <span className="w-1 h-1 bg-white/10 rounded-full" />
        <span>{opponent.split(' ')[1] || 'Opp'}: {opponentSymbol}</span>
      </div>

      {(winner || isDraw) && (
        <TTTGameOver 
          winner={winner} 
          isDraw={isDraw} 
          series={winStreak}
          onRematch={triggerRematch} 
          onQuit={closeGame} 
          opponent={opponent} 
          username={username} 
        />
      )}
    </div>
  );
}