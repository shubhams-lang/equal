import React, { useState, useEffect, useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY (TTT Specific) ---
const TTTGameOver = ({ winner, isDraw, onRematch, onQuit, opponent, username }) => {
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4 shadow-2xl">
        <span className="text-4xl">{isDraw ? "🤝" : (winner === username ? "🏆" : "💀")}</span>
      </div>
      <h2 className={`text-3xl font-black italic tracking-tighter mb-2 ${isDraw ? 'text-blue-400' : (winner === username ? 'text-yellow-500' : 'text-red-500')}`}>
        {isDraw ? "DRAW!" : (winner === username ? "VICTORY!" : "DEFEAT...")}
      </h2>
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
        {isDraw ? "Well played by both!" : (winner === username ? "You outsmarted them!" : `${opponent} won this round`)}
      </p>

      <div className="flex flex-col w-full gap-3 max-w-[200px]">
        <button onClick={onRematch} className="w-full bg-[#2481cc] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
          Play Again
        </button>
        <button onClick={onQuit} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400">
          Quit Game
        </button>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function TicTacToe() {
  const { socket, roomId, username, users, updateScore, sendRematchRequest, closeGame } = useContext(ChatContext);
  
  const opponent = users.find(u => u !== username) || "Opponent";
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(username < opponent); 
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);

  const mySymbol = username < opponent ? 'X' : 'O';

  

  useEffect(() => {
    const socketListener = (data) => {
      if (data.type === 'TTT_MOVE') {
        setBoard(data.board);
        setIsMyTurn(true);
        
        // Host (X) usually validates the board, but we check here to update UI locally
        const result = checkWinner(data.board);
        if (result === 'DRAW') setIsDraw(true);
        else if (result) setWinner(result === mySymbol ? username : opponent);
      }
      
      if (data.type === 'TTT_OVER') {
        if (data.winner === 'DRAW') setIsDraw(true);
        else setWinner(data.winner);
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, opponent, mySymbol, username]);

  const checkWinner = (sq) => {
    const lines = [
      [0,1,2], [3,4,5], [6,7,8], // Rows
      [0,3,6], [1,4,7], [2,5,8], // Cols
      [0,4,8], [2,4,6]           // Diagonals
    ];
    for (let [a,b,c] of lines) {
      if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) return sq[a];
    }
    return sq.every(s => s !== null) ? 'DRAW' : null;
  };

  const handleClick = (i) => {
    // Prevent move if it's not your turn, cell is filled, or game is over
    if (!isMyTurn || board[i] || winner || isDraw) return;

    const newBoard = [...board];
    newBoard[i] = mySymbol;
    setBoard(newBoard);
    setIsMyTurn(false);

    const result = checkWinner(newBoard);
    
    // Send move to server
    socket.emit('game-data', { roomId, type: 'TTT_MOVE', board: newBoard });

    if (result) {
      if (result === 'DRAW') {
        socket.emit('game-data', { roomId, type: 'TTT_OVER', winner: 'DRAW' });
        setIsDraw(true);
      } else {
        socket.emit('game-data', { roomId, type: 'TTT_OVER', winner: username });
        setWinner(username);
        updateScore(username); // Sync score to Context
      }
    }
  };

  return (
    <div className="relative w-full max-w-[350px] aspect-square bg-[#0e1621] rounded-[2.5rem] p-6 shadow-2xl border border-white/5 overflow-hidden flex flex-col items-center justify-center">
      
      {/* Turn Indicator */}
      <div className={`mb-6 px-6 py-2 rounded-full border transition-all duration-500 ${isMyTurn ? 'border-[#25D366] bg-[#25D366]/10' : 'border-white/10 bg-white/5'}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isMyTurn ? 'text-[#25D366]' : 'text-gray-500'}`}>
          {isMyTurn ? "Your Turn" : `Opponent's Turn`}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3 w-full aspect-square">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={!isMyTurn || cell !== null}
            className={`rounded-2xl flex items-center justify-center text-4xl font-black transition-all active:scale-90
              ${cell === 'X' ? 'text-blue-400' : 'text-[#25D366]'}
              ${!cell && isMyTurn ? 'bg-white/5 hover:bg-white/10' : 'bg-[#1c2733]'}
              ${!isMyTurn ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Symbols Legend */}
      <div className="mt-6 flex gap-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        <span className={mySymbol === 'X' ? 'text-blue-400' : ''}>You: {mySymbol}</span>
        <span>•</span>
        <span className={mySymbol === 'O' ? 'text-blue-400' : ''}>{opponent.split(' ')[1]}: {mySymbol === 'X' ? 'O' : 'X'}</span>
      </div>

      {/* Game Over UI */}
      {(winner || isDraw) && (
        <TTTGameOver 
          winner={winner} 
          isDraw={isDraw} 
          onRematch={sendRematchRequest} 
          onQuit={closeGame} 
          opponent={opponent} 
          username={username} 
        />
      )}
    </div>
  );
}