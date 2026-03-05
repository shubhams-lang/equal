import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { ChatContext } from "../../context/ChatContext";

/* ---------------- GAME OVER OVERLAY ---------------- */

const GameOverOverlay = ({
  winner,
  username,
  opponent,
  scores,
  rematchStatus,
  onRematch,
  onQuit
}) => {

  const isMe = winner === username;
  const sent = rematchStatus === "sent";
  const received = rematchStatus === "received";

  return (
    <div className="absolute inset-0 z-[120] bg-[#080d14]/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">

      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
          isMe
            ? "bg-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)]"
            : "bg-gray-800"
        }`}
      >
        <span className="text-5xl">{isMe ? "⚡" : "💀"}</span>
      </div>

      <h2
        className={`text-5xl font-black italic mb-2 ${
          isMe ? "text-yellow-400" : "text-red-500"
        }`}
      >
        {isMe ? "GODLIKE" : "SHATTERED"}
      </h2>

      {/* SCOREBOARD */}

      <div className="flex gap-4 mb-8 bg-white/5 p-4 rounded-3xl border border-white/5">

        <div className="text-center px-4">
          <p className="text-[8px] text-gray-500 font-black">YOU</p>
          <p className="text-2xl font-black text-blue-400">
            {scores[username] || 0}
          </p>
        </div>

        <div className="w-px h-10 bg-white/10" />

        <div className="text-center px-4">
          <p className="text-[8px] text-gray-500 font-black uppercase">
            {opponent?.slice(0, 6)}
          </p>
          <p className="text-2xl font-black text-red-500">
            {scores[opponent] || 0}
          </p>
        </div>

      </div>

      {/* BUTTONS */}

      <div className="flex flex-col w-full gap-3 max-w-[240px]">

        <button
          onClick={onRematch}
          disabled={sent}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95
          ${
            received
              ? "bg-green-500 animate-pulse text-black"
              : sent
              ? "bg-gray-700 text-gray-400 cursor-default"
              : "bg-blue-600 text-white shadow-blue-500/20"
          }`}
        >
          {received
            ? "Accept Rematch"
            : sent
            ? "Waiting..."
            : "Request Rematch"}
        </button>

        <button
          onClick={onQuit}
          className="mt-2 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
        >
          Quit Game
        </button>

      </div>
    </div>
  );
};

/* ---------------- MAIN GAME ---------------- */

export default function TapTap() {

  const {
    socket,
    roomId,
    username,
    opponent,
    updateScore,
    scores,
    closeGame
  } = useContext(ChatContext);

  /* GAME STATE */

  const [myCount, setMyCount] = useState(0);
  const [oppCount, setOppCount] = useState(0);
  const [winner, setWinner] = useState(null);
  const [rematchStatus, setRematchStatus] = useState(null);

  const [isShieldActive, setIsShieldActive] = useState(false);
  const [isOpponentShielded, setIsOpponentShielded] = useState(false);
  const [shieldAvailable, setShieldAvailable] = useState(false);

  const TARGET = 60;

  const gameOver = useRef(false);
  const tapCooldown = useRef(false);

  /* RESET GAME */

  const resetGame = useCallback(() => {

    setMyCount(0);
    setOppCount(0);
    setWinner(null);
    setRematchStatus(null);

    setIsShieldActive(false);
    setIsOpponentShielded(false);
    setShieldAvailable(false);

    gameOver.current = false;

  }, []);

  /* SOCKET LISTENERS */

  useEffect(() => {

    const handleGameData = (data) => {

      switch (data.type) {

        case "TAP_SYNC":

          if (data.user === opponent && !isShieldActive) {

            setOppCount(data.count);

            if (data.count >= TARGET && !gameOver.current) {
              gameOver.current = true;
              setWinner(opponent);
            }
          }

          break;

        case "TAP_WIN":

          gameOver.current = true;
          setWinner(data.winner);
          break;

        case "SHIELD_ON":

          if (data.user === opponent) setIsOpponentShielded(true);
          break;

        case "SHIELD_OFF":

          if (data.user === opponent) setIsOpponentShielded(false);
          break;

        case "REMATCH_OFFER":

          if (data.user === opponent) setRematchStatus("received");
          break;

        case "REMATCH_START":

          resetGame();
          break;

        default:
          break;
      }
    };

    socket.on("game-data", handleGameData);

    return () => socket.off("game-data", handleGameData);

  }, [socket, opponent, isShieldActive, resetGame]);

  /* TAP HANDLER */

  const handleTap = (e) => {

    if (e) e.preventDefault();

    if (winner || gameOver.current) return;
    if (isOpponentShielded) return;
    if (tapCooldown.current) return;

    tapCooldown.current = true;
    setTimeout(() => (tapCooldown.current = false), 35);

    if (navigator.vibrate) navigator.vibrate(8);

    const newCount = myCount + 1;

    setMyCount(newCount);

    socket.emit("game-data", {
      roomId,
      type: "TAP_SYNC",
      user: username,
      count: newCount
    });

    /* SHIELD SPAWN */

    if (newCount === 25) {
      setShieldAvailable(true);
    }

    /* WIN */

    if (newCount >= TARGET && !gameOver.current) {

      gameOver.current = true;

      setWinner(username);
      updateScore(username);

      socket.emit("game-data", {
        roomId,
        type: "TAP_WIN",
        winner: username
      });
    }
  };

  /* SHIELD */

  const activateShield = () => {

    setShieldAvailable(false);
    setIsShieldActive(true);

    socket.emit("game-data", {
      roomId,
      type: "SHIELD_ON",
      user: username
    });

    setTimeout(() => {

      setIsShieldActive(false);

      socket.emit("game-data", {
        roomId,
        type: "SHIELD_OFF",
        user: username
      });

    }, 1500);
  };

  /* REMATCH */

  const handleRematch = () => {

    if (rematchStatus === "received") {

      socket.emit("game-data", {
        roomId,
        type: "REMATCH_START"
      });

      resetGame();

    } else {

      setRematchStatus("sent");

      socket.emit("game-data", {
        roomId,
        type: "REMATCH_OFFER",
        user: username
      });
    }
  };

  /* UI */

  return (
    <div className="relative w-full h-full bg-[#080d14] flex flex-col items-center overflow-hidden">

      {/* SCORE BARS */}

      <div className="w-full flex h-24 border-b border-white/5">

        <div
          className="flex-1 bg-blue-600/20 flex flex-col justify-center px-6 transition-all duration-500"
          style={{ flexGrow: 1 + (myCount - oppCount) / 10 }}
        >
          <span className="text-[8px] font-black text-blue-400 uppercase">
            You
          </span>

          <span className="text-3xl font-black text-white">
            {myCount}
          </span>
        </div>

        <div
          className="flex-1 bg-red-600/20 flex flex-col justify-center items-end px-6 transition-all duration-500"
          style={{ flexGrow: 1 + (oppCount - myCount) / 10 }}
        >
          <span className="text-[8px] font-black text-red-400 uppercase">
            {opponent?.slice(0, 8)}
          </span>

          <span className="text-3xl font-black text-white">
            {oppCount}
          </span>
        </div>

      </div>

      {/* MAIN BUTTON */}

      <div className="flex-1 w-full flex flex-col items-center justify-center relative">

        {shieldAvailable && !isShieldActive && (

          <button
            onClick={activateShield}
            className="absolute top-12 z-50 bg-white text-black font-black px-6 py-3 rounded-full shadow-[0_0_30px_white] animate-bounce text-xs"
          >
            🛡 ACTIVATE SHIELD
          </button>

        )}

        <button
          onPointerDown={handleTap}
          className={`relative w-56 h-56 rounded-full flex flex-col items-center justify-center transition-all duration-100 select-none touch-none
          ${
            isShieldActive
              ? "bg-white border-[10px] border-blue-400 shadow-[0_0_50px_rgba(255,255,255,0.5)]"
              : isOpponentShielded
              ? "bg-gray-800 scale-90 opacity-50"
              : "bg-blue-600 active:scale-95 shadow-2xl"
          }`}
        >

          <span className="text-5xl mb-2">
            {isShieldActive ? "🛡" : "⚡"}
          </span>

          <span
            className={`font-black text-2xl ${
              isShieldActive ? "text-black" : "text-white"
            }`}
          >
            {isOpponentShielded ? "LOCKED" : "TAP"}
          </span>

        </button>

      </div>

      {/* GAME OVER */}

      {winner && (

        <GameOverOverlay
          winner={winner}
          username={username}
          opponent={opponent}
          scores={scores}
          rematchStatus={rematchStatus}
          onRematch={handleRematch}
          onQuit={closeGame}
        />

      )}

    </div>
  );
}