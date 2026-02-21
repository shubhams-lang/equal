import React, { useState, useEffect, useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';

export default function TicTacToe() {
  const { socket, roomId, username, users, updateScore, scores, sendRematchRequest, closeGame } = useContext(ChatContext);
  
  // FIX: Explicitly find opponent here to avoid "undefined"
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
        // Check if the move the opponent just made ended the game
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
  }, [socket, opponent]);

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
    
    // Broadcast move immediately
    socket.emit('game-data', { roomId, type: 'TTT_MOVE', board: newBoard });

    if (result) {
      if (result === 'DRAW') {
        socket.emit('game-data', { roomId, type: 'TTT_OVER', winner: 'DRAW' });
        setIsDraw(true);
      } else {
        socket.emit('game-data', { roomId, type: 'TTT_OVER', winner: username });
        setWinner(username);
        updateScore(username); // This broadcasts the score to the header
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-4 flex flex-col items-center justify-center">
      <div className={`mb-6 px-4 py-1 rounded-full border ${isMyTurn ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white">
          {isMyTurn ? "Your Turn" : `Waiting for ${opponent}...`}
        </p>
      </div>
      
      {/* Rest of your grid UI remains the same... */}
    </div>
  );
}