// frontend/src/components/Games/TicTacToe.jsx
import { useState } from "react";
import useSocketGame from "../../utils/useSocketGame";

export default function TicTacToe({ socket, roomId }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");

  const sendMove = useSocketGame(socket, roomId, ({ game, payload }) => {
    if (game === "TicTacToe") {
      setBoard(payload.board);
      setTurn(payload.nextTurn);
    }
  });

  const handleClick = (i) => {
    if (board[i]) return;
    const newBoard = [...board];
    newBoard[i] = turn;
    const nextTurn = turn === "X" ? "O" : "X";
    setBoard(newBoard);
    setTurn(nextTurn);
    sendMove("TicTacToe", { board: newBoard, nextTurn });
  };

  return (
    <div className="grid grid-cols-3 gap-1 w-64 h-64 bg-gray-800 p-2 rounded-lg">
      {board.map((cell, i) => (
        <button
          key={i}
          className="bg-gray-700 text-white text-2xl flex justify-center items-center"
          onClick={() => handleClick(i)}
        >
          {cell}
        </button>
      ))}
    </div>
  );
}
