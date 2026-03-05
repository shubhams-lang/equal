import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { ChatContext } from "../../context/ChatContext";


// ---------------- GAME OVER SCREEN ----------------
const TTTGameOver = ({
  winner,
  isDraw,
  onRematch,
  onQuit,
  username,
  rematchStatus,
}) => {

  const isMe = winner === username;
  const hasRequested = rematchStatus === "sent";
  const hasReceived = rematchStatus === "received";

  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">

      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl
        ${
          isDraw
            ? "bg-blue-500"
            : isMe
            ? "bg-[#25D366]"
            : "bg-red-500/20 border border-red-500/50"
        }`}
      >
        <span className="text-5xl">
          {isDraw ? "🤝" : isMe ? "🏆" : "💀"}
        </span>
      </div>

      <h2
        className={`text-4xl font-black italic mb-2
        ${
          isDraw
            ? "text-blue-400"
            : isMe
            ? "text-[#25D366]"
            : "text-red-500"
        }`}
      >
        {isDraw ? "DRAW" : isMe ? "VICTORY" : "DEFEAT"}
      </h2>

      <div className="flex flex-col w-full gap-3 max-w-[220px] mt-6">

        <button
          onClick={onRematch}
          disabled={hasRequested}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest
          ${
            hasReceived
              ? "bg-orange-500 text-white animate-pulse"
              : hasRequested
              ? "bg-gray-700 text-gray-400"
              : "bg-[#2481cc] text-white hover:bg-[#2b8de0]"
          }`}
        >
          {hasReceived
            ? "Accept Rematch"
            : hasRequested
            ? "Waiting..."
            : "Rematch"}
        </button>

        <button
          onClick={onQuit}
          className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-white/10"
        >
          Exit to Chat
        </button>

      </div>
    </div>
  );
};


// ---------------- MAIN GAME ----------------
export default function TicTacToe() {

  const {
    socket,
    roomId,
    username,
    users,
    updateScore,
    closeGame,
    scores,
  } = useContext(ChatContext);

  const opponent = useMemo(
    () => users.find((u) => u !== username) || "Opponent",
    [users, username]
  );

  const [board, setBoard] = useState(Array(9).fill(null));
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [winningLine, setWinningLine] = useState(null);

  const [mySymbol, setMySymbol] = useState("X");
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [rematchStatus, setRematchStatus] = useState(null);
  const [winStreak, setWinStreak] = useState(0);



  // ---------------- WIN CHECK ----------------
  const checkWinner = useCallback((squares) => {

    const lines = [
      [0,1,2],
      [3,4,5],
      [6,7,8],
      [0,3,6],
      [1,4,7],
      [2,5,8],
      [0,4,8],
      [2,4,6],
    ];

    for (let line of lines) {

      const [a,b,c] = line;

      if (
        squares[a] &&
        squares[a] === squares[b] &&
        squares[a] === squares[c]
      ) {
        return { symbol: squares[a], line };
      }
    }

    if (squares.every((s) => s !== null)) {
      return { symbol: "DRAW", line: null };
    }

    return null;

  }, []);



  // ---------------- TURN LOGIC ----------------
  const calculateTurnLogic = useCallback(() => {

    const totalGames = Object.values(scores).reduce((a,b)=>a+b,0);

    const sortedUsers = [...users].sort();

    const firstPlayer = sortedUsers[0];

    const xPlayer =
      totalGames % 2 === 0
        ? firstPlayer
        : sortedUsers.find((u) => u !== firstPlayer);

    const mySym = username === xPlayer ? "X" : "O";

    setMySymbol(mySym);
    setIsMyTurn(mySym === "X");

  }, [scores, users, username]);



  // ---------------- RESET GAME ----------------
  const resetGameLocal = useCallback(() => {

    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsDraw(false);
    setWinningLine(null);
    setRematchStatus(null);

    calculateTurnLogic();

  }, [calculateTurnLogic]);



  // ---------------- SOCKET EVENTS ----------------
  useEffect(() => {

    if (!socket) return;

    const listener = (data) => {

      if (data.type === "TTT_MOVE") {

        setBoard(data.board);

        const result = checkWinner(data.board);

        if (result) {

          if (result.symbol === "DRAW") {
            setIsDraw(true);
          }
          else {

            setWinningLine(result.line);

            const winUser =
              result.symbol === mySymbol
                ? username
                : opponent;

            setWinner(winUser);
          }

        }
        else {

          setIsMyTurn(true);

        }
      }



      if (data.type === "TTT_REMATCH_REQ") {

        if (data.from !== username) {
          setRematchStatus("received");
        }

      }



      if (data.type === "TTT_RESTART") {

        resetGameLocal();

      }

    };

    socket.on("game-data", listener);

    return () => socket.off("game-data", listener);

  }, [
    socket,
    mySymbol,
    username,
    opponent,
    resetGameLocal,
    checkWinner,
  ]);



  // ---------------- INIT ----------------
  useEffect(() => {

    calculateTurnLogic();

  }, [calculateTurnLogic]);



  // ---------------- CLICK ----------------
  const handleClick = (i) => {

    if (!isMyTurn) return;
    if (board[i]) return;
    if (winner || isDraw) return;

    const newBoard = [...board];

    newBoard[i] = mySymbol;

    setBoard(newBoard);

    setIsMyTurn(false);

    socket.emit("game-data", {
      roomId,
      type: "TTT_MOVE",
      board: newBoard,
    });

    const result = checkWinner(newBoard);

    if (result) {

      if (result.symbol === "DRAW") {

        setIsDraw(true);

      } else {

        setWinningLine(result.line);

        setWinner(username);

        setWinStreak((s) => s + 1);

        updateScore(username);

      }

    }

  };



  // ---------------- REMATCH ----------------
  const triggerRematch = () => {

    if (rematchStatus === "received") {

      socket.emit("game-data", {
        roomId,
        type: "TTT_RESTART",
      });

      resetGameLocal();

    }
    else {

      setRematchStatus("sent");

      socket.emit("game-data", {
        roomId,
        type: "TTT_REMATCH_REQ",
        from: username,
      });

    }

  };



  // ---------------- UI ----------------
  return (

    <div className="relative w-full max-w-[350px] aspect-square bg-[#0e1621] rounded-[3rem] p-7 shadow-2xl border border-white/5 flex flex-col items-center justify-center">

      {/* Series Indicator */}
      <div className="absolute top-6 flex gap-1.5 bg-black/20 px-3 py-1 rounded-full">
        <p className="text-[8px] font-black text-gray-500 uppercase mr-1">
          Series
        </p>

        {[1,2,3].map((s)=>(
          <div
            key={s}
            className={`w-2 h-2 rounded-full
            ${winStreak >= s ? "bg-[#25D366]" : "bg-white/10"}`}
          />
        ))}
      </div>



      {/* Turn Indicator */}
      <div
        className={`mb-6 px-5 py-1.5 rounded-full border-2
        ${
          isMyTurn
            ? "border-[#25D366] bg-[#25D366]/10"
            : "border-white/10"
        }`}
      >
        <p
          className={`text-[9px] font-black uppercase tracking-widest
          ${
            isMyTurn
              ? "text-[#25D366]"
              : "text-gray-500"
          }`}
        >
          {isMyTurn
            ? `Your Turn (${mySymbol})`
            : "Opponent Move"}
        </p>
      </div>



      {/* Grid */}
      <div className="grid grid-cols-3 gap-3 w-full aspect-square">

        {board.map((cell,i)=>{

          const isWin = winningLine?.includes(i);

          return (

            <button
              key={i}
              onClick={()=>handleClick(i)}
              className={`rounded-[1.25rem] flex items-center justify-center text-4xl font-black
              ${
                cell === "X"
                  ? "text-blue-400"
                  : "text-[#25D366]"
              }
              ${
                isWin
                  ? "bg-[#25D366] text-white"
                  : "bg-[#1c2733]"
              }
              ${
                !cell && isMyTurn
                  ? "hover:bg-[#242f3d]"
                  : ""
              }`}
            >
              {cell}
            </button>

          );

        })}

      </div>



      {(winner || isDraw) && (

        <TTTGameOver
          winner={winner}
          isDraw={isDraw}
          username={username}
          rematchStatus={rematchStatus}
          onRematch={triggerRematch}
          onQuit={closeGame}
        />

      )}

    </div>
  );
}