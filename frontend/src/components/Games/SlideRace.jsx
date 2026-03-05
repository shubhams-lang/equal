import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback
} from "react";
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
    <div className="absolute inset-0 z-[200] bg-[#05080c]/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-500">

      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
          isMe
            ? "bg-yellow-400 shadow-[0_0_60px_rgba(250,204,21,0.5)]"
            : "bg-red-500/20"
        }`}
      >
        <span className="text-5xl">{isMe ? "🏆" : "💀"}</span>
      </div>

      <h2
        className={`text-4xl font-black mb-3 ${
          isMe ? "text-yellow-400" : "text-red-500"
        }`}
      >
        {isMe ? "VICTORY" : "DEFEAT"}
      </h2>

      <div className="flex gap-8 mb-8 bg-white/5 px-6 py-4 rounded-3xl border border-white/10">
        <div>
          <p className="text-[10px] text-gray-400 font-black">YOU</p>
          <p className="text-2xl font-black text-blue-400">
            {scores[username] || 0}
          </p>
        </div>

        <div className="w-px bg-white/10" />

        <div>
          <p className="text-[10px] text-gray-400 font-black uppercase">
            {opponent?.slice(0, 6)}
          </p>
          <p className="text-2xl font-black text-red-400">
            {scores[opponent] || 0}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[220px]">

        <button
          disabled={sent}
          onClick={onRematch}
          className={`py-4 rounded-2xl font-black uppercase tracking-widest transition-all
          ${
            received
              ? "bg-green-500 animate-pulse text-black"
              : sent
              ? "bg-gray-700 text-gray-400 cursor-default"
              : "bg-[#2481cc] text-white shadow-lg shadow-blue-500/20"
          }`}
        >
          {received
            ? "Accept Rematch"
            : sent
            ? "Waiting..."
            : "Rematch"}
        </button>

        <button
          onClick={onQuit}
          className="text-gray-500 text-xs font-black uppercase hover:text-white"
        >
          Quit
        </button>
      </div>
    </div>
  );
};

/* ---------------- MAIN GAME ---------------- */

export default function SliderRace() {
  const {
    socket,
    roomId,
    username,
    opponent,
    scores,
    updateScore,
    closeGame
  } = useContext(ChatContext);

  /* ----------- GAME STATE ----------- */

  const [progress, setProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [heat, setHeat] = useState(0);
  const [turbo, setTurbo] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rematchStatus, setRematchStatus] = useState(null);

  const gameEnded = useRef(false);
  const lastX = useRef(0);
  const animationRef = useRef(null);

  /* ----------- RESET GAME ----------- */

  const resetRace = useCallback(() => {
    setProgress(0);
    setOppProgress(0);
    setVelocity(0);
    setHeat(0);
    setTurbo(false);
    setWinner(null);
    setRematchStatus(null);

    gameEnded.current = false;
    lastX.current = 0;
  }, []);

  /* ----------- SOCKET LISTENER ----------- */

  useEffect(() => {
    const handleData = (data) => {
      switch (data.type) {
        case "SLIDE_UPDATE":
          if (data.user === opponent) {
            setOppProgress(data.val);

            if (data.val >= 100 && !gameEnded.current) {
              gameEnded.current = true;
              setWinner(opponent);
            }
          }
          break;

        case "RACE_OVER":
          setWinner(data.winner);
          gameEnded.current = true;
          break;

        case "REMATCH_REQUEST":
          if (data.from === opponent) setRematchStatus("received");
          break;

        case "RACE_RESTART":
          resetRace();
          break;

        default:
          break;
      }
    };

    socket.on("game-data", handleData);
    return () => socket.off("game-data", handleData);
  }, [socket, opponent, resetRace]);

  /* ----------- GAME LOOP ----------- */

  useEffect(() => {
    if (winner) return;

    const loop = () => {
      setProgress((prev) => {
        const speed = turbo ? velocity * 2.5 : velocity;
        const next = prev + speed;

        if (next >= 100 && !gameEnded.current) {
          gameEnded.current = true;

          setWinner(username);
          updateScore(username);

          socket.emit("game-data", {
            roomId,
            type: "RACE_OVER",
            winner: username
          });

          return 100;
        }

        return Math.min(next, 100);
      });

      setVelocity((v) => Math.max(0, v * 0.94));
      setHeat((h) => Math.max(0, h - 0.6));

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationRef.current);
  }, [velocity, turbo, winner, username, socket, roomId, updateScore]);

  /* ----------- INPUT HANDLER ----------- */

  const handleSlide = (e) => {
    if (winner || heat > 95) return;

    const x = Number(e.target.value);
    const delta = Math.abs(x - lastX.current);

    if (delta > 0) {
      setVelocity((v) => Math.min(2.5, v + delta * 0.02));
      setHeat((h) => Math.min(100, h + delta * 0.25));

      socket.emit("game-data", {
        roomId,
        type: "SLIDE_UPDATE",
        user: username,
        val: progress
      });
    }

    lastX.current = x;
  };

  /* ----------- TURBO ----------- */

  const activateTurbo = () => {
    if (turbo) return;

    setTurbo(true);
    setVelocity(3.5);

    setTimeout(() => setTurbo(false), 1500);
  };

  /* ----------- REMATCH ----------- */

  const handleRematch = () => {
    if (rematchStatus === "received") {
      socket.emit("game-data", {
        roomId,
        type: "RACE_RESTART"
      });

      resetRace();
    } else {
      setRematchStatus("sent");

      socket.emit("game-data", {
        roomId,
        type: "REMATCH_REQUEST",
        from: username
      });
    }
  };

  /* ----------- UI ----------- */

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#080d14] overflow-hidden">

      {/* TURBO BUTTON */}

      {progress > 30 && progress < 40 && !turbo && !winner && (
        <button
          onClick={activateTurbo}
          className="absolute top-24 bg-yellow-400 text-black px-8 py-2 rounded-full font-black animate-bounce shadow-lg"
        >
          BOOST
        </button>
      )}

      {/* TRACK */}

      <div className="w-full max-w-[320px] space-y-20 z-10">

        {/* OPPONENT */}

        <div className="relative pt-4 opacity-40">

          <div className="h-1 w-full bg-white/5 rounded-full" />

          <span
            className="absolute -top-3 text-xl transition-all duration-300"
            style={{ left: `calc(${oppProgress}% - 12px)` }}
          >
            🏎️
          </span>

        </div>

        {/* PLAYER */}

        <div className="relative">

          <div className="h-24 bg-black/40 rounded-[2rem] px-6 flex items-center border border-white/5">

            <div className="relative w-full h-3 bg-white/5 rounded-full">

              <div
                className={`absolute left-0 h-full rounded-full ${
                  turbo ? "bg-yellow-400" : "bg-[#2481cc]"
                }`}
                style={{ width: `${progress}%` }}
              />

              <div
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `calc(${progress}% - 20px)` }}
              >
                <span className="text-4xl">🏎️</span>
              </div>

            </div>

            <input
              type="range"
              min="0"
              max="100"
              defaultValue="0"
              onChange={handleSlide}
              className="absolute inset-x-6 h-full opacity-0 cursor-pointer touch-none"
            />

          </div>

        </div>

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