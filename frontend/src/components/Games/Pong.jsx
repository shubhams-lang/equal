import { useRef, useEffect, useState } from "react";

export default function Pong({ socket, roomId, username, opponent }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ me: 0, opponent: 0 });
  const [winner, setWinner] = useState(null);
  
  const [gameState, setGameState] = useState({
    myPaddleY: 75,
    opponentPaddleY: 75,
    ballX: 150,
    ballY: 100,
    ballVX: 3,
    ballVY: 2,
  });

  const isHost = username < opponent;
  const WINNING_SCORE = 5;

  useEffect(() => {
    socket.on("game-state-update", (payload) => {
      if (payload.game !== "Pong" || payload.sender !== opponent) return;

      // Listen for score updates and win triggers from the host
      if (payload.type === "POINT") {
        setScore({ me: payload.oppScore, opponent: payload.myScore });
      }
      if (payload.type === "WINNER") {
        setWinner(payload.winner === username ? "YOU WIN! 🏆" : `${opponent} WINS! 💀`);
      }

      setGameState((prev) => ({
        ...prev,
        opponentPaddleY: payload.paddleY,
        ...(!isHost && { 
          ballX: 300 - payload.ballX, 
          ballY: payload.ballY,
        }),
      }));
    });

    return () => socket.off("game-state-update");
  }, [socket, opponent, isHost, username]);

  useEffect(() => {
    if (winner) return; // Stop the loop if someone won

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const update = () => {
      setGameState((prev) => {
        let { myPaddleY, opponentPaddleY, ballX, ballY, ballVX, ballVY } = prev;

        if (isHost) {
          ballX += ballVX;
          ballY += ballVY;

          if (ballY < 5 || ballY > 195) ballVY *= -1;

          // Paddle Collisions
          if (ballX < 20 && ballY > myPaddleY && ballY < myPaddleY + 50) ballVX = Math.abs(ballVX) * 1.05; // Speed up
          if (ballX > 280 && ballY > opponentPaddleY && ballY < opponentPaddleY + 50) ballVX = -Math.abs(ballVX) * 1.05;

          // Scoring Detection (Only Host manages this)
          if (ballX < 0 || ballX > 300) {
            const scoredOnMe = ballX < 0;
            const newScore = {
              me: scoredOnMe ? score.me : score.me + 1,
              opponent: scoredOnMe ? score.opponent + 1 : score.opponent
            };
            
            setScore(newScore);
            
            // Check for Win
            if (newScore.me >= WINNING_SCORE || newScore.opponent >= WINNING_SCORE) {
              const finalWinner = newScore.me >= WINNING_SCORE ? username : opponent;
              socket.emit("game-state-sync", {
                roomId,
                payload: { game: "Pong", type: "WINNER", winner: finalWinner, sender: username }
              });
              setWinner(finalWinner === username ? "YOU WIN! 🏆" : `${opponent} WINS! 💀`);
            } else {
              // Notify opponent of score change
              socket.emit("game-state-sync", {
                roomId,
                payload: { game: "Pong", type: "POINT", myScore: newScore.me, oppScore: newScore.opponent, sender: username }
              });
            }

            ballX = 150; ballY = 100; ballVX = 3 * (scoredOnMe ? 1 : -1);
          }
        }

        // --- RENDER ---
        ctx.fillStyle = "#0e1621";
        ctx.fillRect(0, 0, 300, 200);
        
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(150,0); ctx.lineTo(150,200); ctx.stroke();

        ctx.fillStyle = "#2481cc"; ctx.fillRect(10, myPaddleY, 8, 50);
        ctx.fillStyle = "#ef4444"; ctx.fillRect(282, opponentPaddleY, 8, 50);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ballX, ballY, 4, 0, Math.PI * 2); ctx.fill();

        // Sync paddle and ball position
        socket.emit("game-state-sync", {
          roomId,
          payload: {
            game: "Pong",
            sender: username,
            paddleY: myPaddleY,
            ...(isHost && { ballX, ballY })
          }
        });

        return { ...prev, ballX, ballY, ballVX, ballVY };
      });
    };

    const interval = setInterval(update, 1000 / 60);
    return () => clearInterval(interval);
  }, [isHost, socket, roomId, username, score, winner, opponent]);

  const handleMouseMove = (e) => {
    if (winner) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top - 25;
    setGameState(prev => ({ ...prev, myPaddleY: Math.max(0, Math.min(150, relativeY)) }));
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Scoreboard */}
      <div className="flex justify-between w-full px-4 mb-2 font-black text-xl italic">
        <span className="text-[#2481cc]">{score.me}</span>
        <span className="text-white/20">VS</span>
        <span className="text-red-500">{score.opponent}</span>
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        width={300}
        height={200}
        className="rounded-xl cursor-none border border-white/10 shadow-2xl"
      />

      {winner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm">
          <h2 className="text-2xl font-black text-white mb-4 animate-bounce">{winner}</h2>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-[#2481cc] text-white rounded-lg text-sm font-bold"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}