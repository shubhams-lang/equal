import React, { useEffect, useRef, useState, useContext } from "react";
import { ChatContext } from "../../context/ChatContext";

/* ==========================
   GAME OVER OVERLAY
========================== */

const GameOverOverlay = ({ winner, username, opponent, scores, onRematch, onQuit }) => {
  const isMe = winner === username;

  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isMe ? "bg-yellow-500" : "bg-gray-700"}`}>
        <span className="text-4xl">{isMe ? "🏆" : "💀"}</span>
      </div>

      <h2 className={`text-3xl font-black italic mb-2 ${isMe ? "text-yellow-500" : "text-red-500"}`}>
        {isMe ? "VICTORY!" : "DEFEAT"}
      </h2>

      <div className="flex gap-10 bg-black/40 px-6 py-4 rounded-xl mb-6">
        <div>
          <p className="text-xs text-gray-400">YOU</p>
          <p className="text-xl font-bold">{scores[username] || 0}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400">OPPONENT</p>
          <p className="text-xl font-bold">{scores[opponent] || 0}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[200px]">
        <button
          onClick={onRematch}
          className="bg-[#2481cc] py-3 rounded-xl font-bold"
        >
          Rematch
        </button>

        <button
          onClick={onQuit}
          className="bg-white/10 py-3 rounded-xl text-gray-300"
        >
          Quit
        </button>
      </div>
    </div>
  );
};

/* ==========================
   MAIN PONG
========================== */

export default function Pong() {
  const { socket, roomId, username, opponent, updateScore, scores, sendRematchRequest, closeGame } =
    useContext(ChatContext);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const [winner, setWinner] = useState(null);

  const WIDTH = 300;
  const HEIGHT = 300;

  const PADDLE_HEIGHT = 60;
  const PADDLE_WIDTH = 8;

  const ballRef = useRef({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    dx: 3,
    dy: 3,
    size: 6,
  });

  const paddlesRef = useRef({
    p1Y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    p2Y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
  });

  const isHost = opponent ? username < opponent : false;

  /* ==========================
     RESET BALL
  ========================== */

  const resetBall = () => {
    ballRef.current = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      dx: Math.random() > 0.5 ? 3 : -3,
      dy: (Math.random() - 0.5) * 6,
      size: 6,
    };
  };

  /* ==========================
     INPUT HANDLER
  ========================== */

  const handleInput = (clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scale = HEIGHT / rect.height;

    const y = (clientY - rect.top) * scale - PADDLE_HEIGHT / 2;

    const clamped = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, y));

    socket.emit("game-data", {
      roomId,
      type: "PADDLE_MOVE",
      y: clamped,
      user: username,
    });
  };

  /* ==========================
     SOCKET LISTENER
  ========================== */

  useEffect(() => {
    const listener = (data) => {
      if (data.type === "PADDLE_MOVE") {
        if (data.user === opponent) {
          isHost
            ? (paddlesRef.current.p2Y = data.y)
            : (paddlesRef.current.p1Y = data.y);
        } else {
          isHost
            ? (paddlesRef.current.p1Y = data.y)
            : (paddlesRef.current.p2Y = data.y);
        }
      }

      if (!isHost && data.type === "SYNC_BALL") {
        ballRef.current = data.ball;
      }

      if (data.type === "GAME_OVER") {
        setWinner(data.winner);
      }
    };

    socket.on("game-data", listener);

    return () => socket.off("game-data", listener);
  }, [socket, opponent, username, isHost]);

  /* ==========================
     GAME LOOP
  ========================== */

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      if (!winner) {
        if (isHost) {
          const b = ballRef.current;

          b.x += b.dx;
          b.y += b.dy;

          /* WALL COLLISION */

          if (b.y <= 0 || b.y >= HEIGHT) {
            b.dy *= -1;
          }

          /* PADDLE COLLISION */

          const p1 = paddlesRef.current.p1Y;
          const p2 = paddlesRef.current.p2Y;

          if (
            b.x <= 20 &&
            b.y > p1 &&
            b.y < p1 + PADDLE_HEIGHT
          ) {
            b.dx = Math.abs(b.dx) + 0.2;
          }

          if (
            b.x >= WIDTH - 20 &&
            b.y > p2 &&
            b.y < p2 + PADDLE_HEIGHT
          ) {
            b.dx = -Math.abs(b.dx) - 0.2;
          }

          /* SCORE */

          if (b.x < 0) {
            socket.emit("game-data", {
              roomId,
              type: "GAME_OVER",
              winner: opponent,
            });

            updateScore(opponent);
            resetBall();
          }

          if (b.x > WIDTH) {
            socket.emit("game-data", {
              roomId,
              type: "GAME_OVER",
              winner: username,
            });

            updateScore(username);
            resetBall();
          }

          socket.emit("game-data", {
            roomId,
            type: "SYNC_BALL",
            ball: b,
          });
        }
      }

      /* ======================
         RENDER
      ====================== */

      ctx.fillStyle = "#0b141a";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      /* NET */

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();

      /* PADDLES */

      ctx.fillStyle = "#2481cc";
      ctx.fillRect(10, paddlesRef.current.p1Y, PADDLE_WIDTH, PADDLE_HEIGHT);

      ctx.fillRect(
        WIDTH - PADDLE_WIDTH - 10,
        paddlesRef.current.p2Y,
        PADDLE_WIDTH,
        PADDLE_HEIGHT
      );

      /* BALL */

      ctx.beginPath();
      ctx.arc(
        ballRef.current.x,
        ballRef.current.y,
        ballRef.current.size,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#fff";
      ctx.fill();

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationRef.current);
  }, [winner, isHost, opponent, username, updateScore, socket, roomId]);

  /* ==========================
     INPUT EVENTS
  ========================== */

  useEffect(() => {
    const canvas = canvasRef.current;

    const mouse = (e) => handleInput(e.clientY);

    const touch = (e) => {
      if (e.cancelable) e.preventDefault();
      handleInput(e.touches[0].clientY);
    };

    canvas.addEventListener("mousemove", mouse);
    canvas.addEventListener("touchmove", touch, { passive: false });

    return () => {
      canvas.removeEventListener("mousemove", mouse);
      canvas.removeEventListener("touchmove", touch);
    };
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-[350px] bg-[#111b21] rounded-3xl overflow-hidden border-4 border-[#202c33] shadow-2xl">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-full h-full cursor-none touch-none"
      />

      {winner && (
        <GameOverOverlay
          winner={winner}
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