import { useRef, useEffect, useState } from "react";

export default function Pong({ socket, roomId, username, opponent }) {
  const canvasRef = useRef(null);
  
  // State for both paddles and the ball
  const [gameState, setGameState] = useState({
    myPaddleY: 75,
    opponentPaddleY: 75,
    ballX: 150,
    ballY: 100,
    ballVX: 3,
    ballVY: 2,
  });

  // Determine who "owns" the ball physics (the first person alphabetically)
  const isHost = username < opponent;

  useEffect(() => {
    // 1. LISTEN for updates from the opponent
    socket.on("game-state-update", (payload) => {
      if (payload.game === "Pong" && payload.sender === opponent) {
        setGameState((prev) => ({
          ...prev,
          opponentPaddleY: payload.paddleY,
          // If I'm not the host, I accept the ball position from the host
          ...( !isHost && { 
            ballX: 300 - payload.ballX, // Mirror X for perspective
            ballY: payload.ballY,
          }),
        }));
      }
    });

    return () => socket.off("game-state-update");
  }, [socket, opponent, isHost]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const update = () => {
      setGameState((prev) => {
        let { myPaddleY, opponentPaddleY, ballX, ballY, ballVX, ballVY } = prev;

        // ONLY the host calculates ball movement
        if (isHost) {
          ballX += ballVX;
          ballY += ballVY;

          // Wall Collisions
          if (ballY < 5 || ballY > 195) ballVY *= -1;

          // Paddle Collisions (Left = Me, Right = Opponent)
          if (ballX < 20 && ballY > myPaddleY && ballY < myPaddleY + 50) ballVX = Math.abs(ballVX);
          if (ballX > 280 && ballY > opponentPaddleY && ballY < opponentPaddleY + 50) ballVX = -Math.abs(ballVX);
          
          // Reset if out of bounds
          if (ballX < 0 || ballX > 300) { ballX = 150; ballY = 100; }
        }

        // DRAWING
        ctx.fillStyle = "#0e1621";
        ctx.fillRect(0, 0, 300, 200);
        
        // Center Line
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(150,0); ctx.lineTo(150,200); ctx.stroke();

        // Paddles
        ctx.fillStyle = "#2481cc"; // My Paddle (Left)
        ctx.fillRect(10, myPaddleY, 8, 50);
        
        ctx.fillStyle = "#ef4444"; // Opponent (Right)
        ctx.fillRect(282, opponentPaddleY, 8, 50);

        // Ball
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
        ctx.fill();

        // SYNC TO SERVER
        socket.emit("game-state-sync", {
          roomId,
          payload: {
            game: "Pong",
            sender: username,
            paddleY: myPaddleY,
            ...(isHost && { ballX, ballY }) // Only host sends ball data
          }
        });

        return { ...prev, ballX, ballY, ballVX, ballVY };
      });
    };

    const interval = setInterval(update, 1000 / 60); // 60 FPS
    return () => clearInterval(interval);
  }, [isHost, socket, roomId, username]);

  // Handle Mouse Movement
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top - 25; // Center paddle on cursor
    setGameState(prev => ({ ...prev, myPaddleY: Math.max(0, Math.min(150, relativeY)) }));
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      width={300}
      height={200}
      className="rounded-xl cursor-none border border-white/10 shadow-2xl"
    />
  );
}