import { useState, useEffect } from "react";

export default function TicTacToe({ socket, roomId, username, opponent }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState(null);

  // Assign "X" to the host (alphabetically first) and "O" to the guest
  const mySymbol = username < opponent ? "X" : "O";
  const isMyTurn = turn === mySymbol;

  useEffect(() => {
    socket.on("game-state-update", (payload) => {
      if (payload.game === "TicTacToe" && payload.sender === opponent) {
        setBoard(payload.board);
        setTurn(payload.nextTurn);
        
        const win = calculateWinner(payload.board);
        if (win) setWinner(win);
      }
    });

    return () => socket.off("game-state-update");
  }, [socket, opponent]);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (let line of lines) {
      const [a, b, c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return squares.includes(null) ? null : "Draw";
  };

  const handleClick = (i) => {
    // Block click if: cell occupied, not your turn, or game over
    if (board[i] || !isMyTurn || winner) return;

    const newBoard = [...board];
    newBoard[i] = mySymbol;
    const nextTurn = mySymbol === "X" ? "O" : "X";
    
    setBoard(newBoard);
    setTurn(nextTurn);

    const win = calculateWinner(newBoard);
    if (win) setWinner(win);

    // Sync to opponent
    socket.emit("game-state-sync", {
      roomId,
      payload: { 
        game: "TicTacToe", 
        sender: username, 
        board: newBoard, 
        nextTurn 
      }
    });
  };

  return (
    <div className="flex flex-col items-center p-4 bg-[#17212b] rounded-3xl border border-white/10 shadow-2xl">
      <div className="mb-4 text-center">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tic Tac Toe</p>
        <p className={`text-sm font-bold ${isMyTurn ? "text-green-400" : "text-gray-400"}`}>
          {winner ? (winner === "Draw" ? "🤝 DRAW" : `🏆 ${winner} WINS`) : (isMyTurn ? "YOUR TURN" : `${opponent}'S TURN`)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 w-64 h-64">
        {board.map((cell, i) => (
          <button
            key={i}
            className={`h-20 w-20 rounded-xl text-3xl font-black flex items-center justify-center transition-all active:scale-95 ${
              !cell && isMyTurn ? "bg-white/5 hover:bg-white/10" : "bg-white/5"
            } ${cell === "X" ? "text-[#2481cc]" : "text-red-500"}`}
            onClick={() => handleClick(i)}
          >
            {cell}
          </button>
        ))}
      </div>

      {winner && (
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 text-xs text-[#2481cc] font-bold underline"
        >
          PLAY AGAIN
        </button>
      )}
    </div>
  );
}