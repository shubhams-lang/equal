import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY (Polished) ---
const TTTGameOver = ({ winner, isDraw, onRematch, onQuit, username, winStreak }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] ${isDraw ? 'bg-blue-500' : (isMe ? 'bg-[#25D366] shadow-[#25D366]/20' : 'bg-red-500/20 border border-red-500/50')}`}>
        <span className="text-5xl">{isDraw ? "🤝" : (isMe ? "🏆" : "💀")}</span>
      </div>
      
      <h2 className={`text-4xl font-black italic tracking-tighter mb-1 ${isDraw ? 'text-blue-400' : (isMe ? 'text-[#25D366]' : 'text-red-500')}`}>
        {isDraw ? "DRAW" : (isMe ? "VICTORY" : "DEFEAT")}
      </h2>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
        {isDraw ? "Well Played" : (isMe ? "Dominating!" : "Unlucky...")}
      </p>

      <div className="flex flex-col w-full gap-3 max-w-[220px]">
        <button onClick={onRematch} className="w-full bg-[#2481cc] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all hover:bg-[#2b8de0] text-white">
          Rematch
        </button>
        <button onClick={onQuit} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-white/10 transition-colors">
          Exit to Chat
        </button>
      </div>
    </div>
  );
};

export default function TicTacToe() {
  const { socket, roomId, username, users, updateScore, closeGame, scores } = useContext(ChatContext);
  
  const opponent = useMemo(() => users.find(u => u !== username) || "Opponent", [users, username]);

  // --- STATE ---
  const [board, setBoard] = useState(Array(9).fill(null));
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [winStreak, setWinStreak] = useState(0);
  const [winningLine, setWinningLine] = useState(null); // [a, b, c]
  const [mySymbol, setMySymbol] = useState('X');
  const [isMyTurn, setIsMyTurn] = useState(false);

  // --- WIN LOGIC HELPER ---
  const checkWinner = useCallback((sq) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) {
      const [a, b, c] = line;
      if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) {
        return { symbol: sq[a], line };
      }
    }
    if (sq.every(s => s !== null)) return { symbol: 'DRAW', line: null };
    return null;
  }, []);

  const calculateTurnLogic = useCallback(() => {
    const totalGames = Object.values(scores).reduce((a, b) => a + b, 0);
    const sortedUsers = [...users].sort();
    const isFirstUser = username === sortedUsers[0];
    const amIXThisRound = totalGames % 2 === 0 ? isFirstUser : !isFirstUser;
    
    const assignedSymbol = amIXThisRound ? 'X' : 'O';
    setMySymbol(assignedSymbol);
    setIsMyTurn(assignedSymbol === 'X');
  }, [scores, users, username]);

  const resetGameLocal = useCallback(() => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsDraw(false);
    setWinningLine(null);
    calculateTurnLogic();
  }, [calculateTurnLogic]);

  useEffect(() => {
    calculateTurnLogic();
  }, [calculateTurnLogic]);

  useEffect(() => {
    const socketListener = (data) => {
      if (data.type === 'TTT_MOVE') {
        setBoard(data.board);
        const result = checkWinner(data.board);
        if (result) {
          if (result.symbol === 'DRAW') {
            setIsDraw(true);
          } else {
            setWinningLine(result.line);
            setWinner(result.symbol === mySymbol ? username : opponent);
          }
        } else {
          setIsMyTurn(true);
        }
      }
      if (data.type === 'TTT_RESTART') resetGameLocal();
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, mySymbol, opponent, username, resetGameLocal, checkWinner]);

  const handleClick = (i) => {
    if (!isMyTurn || board[i] || winner || isDraw) return;

    const newBoard = [...board];
    newBoard[i] = mySymbol;
    setBoard(newBoard);
    setIsMyTurn(false);

    const result = checkWinner(newBoard);
    socket.emit('game-data', { roomId, type: 'TTT_MOVE', board: newBoard });

    if (result) {
      if (result.symbol === 'DRAW') {
        setIsDraw(true);
      } else {
        setWinningLine(result.line);
        setWinner(username);
        setWinStreak(prev => prev + 1);
        updateScore(username);
      }
    }
  };

  return (
    <div className="relative w-full max-w-[350px] aspect-square bg-[#0e1621] rounded-[3rem] p-7 shadow-2xl border border-white/5 overflow-hidden flex flex-col items-center justify-center">
      
      {/* Series Win Dots */}
      <div className="absolute top-6 flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full">
        <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter mr-1">Series</p>
        {[1, 2, 3].map(s => (
          <div key={s} className={`w-2 h-2 rounded-full transition-all duration-500 ${winStreak >= s ? 'bg-[#25D366] shadow-[0_0_8px_#25D366]' : 'bg-white/5'}`} />
        ))}
      </div>

      {/* Turn Indicator */}
      <div className={`mb-6 px-5 py-1.5 rounded-full border-2 transition-all duration-500 ${isMyTurn ? 'border-[#25D366] bg-[#25D366]/5 animate-pulse' : 'border-white/5 bg-transparent'}`}>
        <p className={`text-[9px] font-black uppercase tracking-[0.25em] ${isMyTurn ? 'text-[#25D366]' : 'text-gray-500'}`}>
          {isMyTurn ? `Your Turn (${mySymbol})` : `Opponent's Move`}
        </p>
      </div>

      {/* Improved Grid */}
      <div className="grid grid-cols-3 gap-3 w-full aspect-square relative">
        {board.map((cell, i) => {
          const isWinningSquare = winningLine?.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={!isMyTurn || cell !== null}
              className={`group rounded-[1.25rem] flex items-center justify-center text-4xl font-black transition-all duration-300 relative
                ${cell === 'X' ? 'text-blue-400' : 'text-[#25D366]'}
                ${isWinningSquare ? 'bg-[#25D366] !text-white scale-95 shadow-[0_0_30px_#25D36650]' : 'bg-[#1c2733]'}
                ${!cell && isMyTurn ? 'hover:bg-[#242f3d] hover:scale-105 active:scale-95 cursor-pointer' : ''}
                ${!isMyTurn && !cell ? 'opacity-40 cursor-not-allowed' : 'opacity-100'}
              `}
            >
              {cell && (
                <span className="animate-in zoom-in duration-300">{cell}</span>
              )}
              {/* Ghost Hint */}
              {!cell && isMyTurn && (
                <span className="opacity-0 group-hover:opacity-20 text-2xl transition-opacity">{mySymbol}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Player Badges */}
      <div className="mt-6 flex gap-6 text-[10px] font-black text-gray-500 uppercase tracking-widest items-center">
        <div className={`flex items-center gap-2 ${mySymbol === 'X' ? 'text-blue-400' : 'text-[#25D366]'}`}>
          <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-current animate-ping' : 'bg-gray-800'}`} />
          <span>You ({mySymbol})</span>
        </div>
        <div className="w-1.5 h-1.5 bg-white/5 rounded-full" />
        <div className="flex items-center gap-2">
          <span>{opponent.substring(0, 8)} ({mySymbol === 'X' ? 'O' : 'X'})</span>
        </div>
      </div>

      {(winner || isDraw) && (
        <TTTGameOver 
          winner={winner} 
          isDraw={isDraw} 
          winStreak={winStreak}
          onRematch={triggerRematch} 
          onQuit={closeGame} 
          username={username} 
        />
      )}
    </div>
  );
}