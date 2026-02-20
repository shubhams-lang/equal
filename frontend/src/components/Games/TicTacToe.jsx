import React, { useState, useEffect, useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, isDraw, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${isDraw ? 'bg-gray-500' : isMe ? 'bg-yellow-500' : 'bg-gray-700'}`}>
        <span className="text-4xl">{isDraw ? "🤝" : isMe ? "👑" : "💀"}</span>
      </div>
      <h2 className={`text-3xl font-black italic tracking-tighter mb-1 ${isDraw ? 'text-white' : isMe ? 'text-yellow-500' : 'text-red-500'}`}>
        {isDraw ? "IT'S A DRAW" : isMe ? "VICTORY!" : "DEFEAT..."}
      </h2>
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
        {isDraw ? "Perfectly matched" : isMe ? "Strategic Mastermind" : `${winner} outsmarted you`}
      </p>

      <div className="flex gap-8 mb-8 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
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
          Quit
        </button>
      </div>
    </div>
  );
};

// --- MAIN TIC TAC TOE COMPONENT ---
export default function TicTacToe() {
  const { socket, roomId, username, opponent, updateScore, scores, sendRematchRequest, closeGame } = useContext(ChatContext);
  
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(username < opponent); // Host goes first (X)
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);

  const mySymbol = username < opponent ? 'X' : 'O';
  const oppSymbol = mySymbol === 'X' ? 'O' : 'X';

  useEffect(() => {
    const socketListener = (data) => {
      if (data.type === 'TTT_MOVE') {
        setBoard(data.board);
        setIsMyTurn(true);
      }
      if (data.type === 'TTT_OVER') {
        if (data.winner === 'DRAW') {
          setIsDraw(true);
        } else {
          setWinner(data.winner);
        }
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket]);

  const checkWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diags
    ];
    for (let [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return squares.every(s => s !== null) ? 'DRAW' : null;
  };

  const handleClick = (i) => {
    if (!isMyTurn || board[i] || winner || isDraw) return;

    const newBoard = [...board];
    newBoard[i] = mySymbol;
    setBoard(newBoard);
    setIsMyTurn(false);

    const result = checkWinner(newBoard);
    
    if (result) {
      if (result === 'DRAW') {
        socket.emit('game-data', { roomId, type: 'TTT_OVER', winner: 'DRAW' });
        setIsDraw(true);
      } else {
        socket.emit('game-data', { roomId, type: 'TTT_OVER', winner: username });
        setWinner(username);
        updateScore(username);
      }
    }

    socket.emit('game-data', { roomId, type: 'TTT_MOVE', board: newBoard });
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-4 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Turn Indicator */}
      <div className={`mb-6 px-4 py-1 rounded-full border ${isMyTurn ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>
        <p className={`text-[10px] font-black uppercase tracking-widest ${isMyTurn ? 'text-green-500' : 'text-gray-500'}`}>
          {isMyTurn ? "Your Turn" : `Waiting for ${opponent}...`}
        </p>
      </div>

      {/* Game Board */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] aspect-square">
        {board.map((val, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={!isMyTurn || val !== null}
            className={`
              h-full w-full rounded-2xl text-4xl font-black transition-all flex items-center justify-center
              ${!val && isMyTurn ? 'bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10' : 'bg-black/20 border border-transparent'}
              ${val === 'X' ? 'text-[#2481cc]' : 'text-red-500'}
            `}
          >
            {val}
          </button>
        ))}
      </div>

      <div className="mt-8 text-center opacity-30">
        <p className="text-[8px] font-bold uppercase tracking-[0.4em]">
          {mySymbol} • PLAYER ONE
        </p>
      </div>

      {(winner || isDraw) && (
        <GameOverOverlay 
          winner={winner}
          isDraw={isDraw}
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