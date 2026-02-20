import React, { useEffect, useRef, useState, useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY COMPONENT ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${isMe ? 'bg-yellow-500' : 'bg-gray-700'}`}>
        <span className="text-4xl">{isMe ? "🏆" : "💀"}</span>
      </div>
      <h2 className={`text-3xl font-black italic tracking-tighter mb-1 ${isMe ? 'text-yellow-500' : 'text-red-500'}`}>
        {isMe ? "VICTORY!" : "DEFEAT..."}
      </h2>
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
        {isMe ? "You dominated the court" : `${winner} took the win`}
      </p>
      <div className="flex gap-8 mb-8 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
        <div>
          <p className="text-[8px] text-gray-500 font-black">YOU</p>
          <p className="text-xl font-black">{scores[username] || 0}</p>
        </div>
        <div className="w-px h-8 bg-white/10 self-center" />
        <div>
          <p className="text-[8px] text-gray-500 font-black uppercase">{opponent}</p>
          <p className="text-xl font-black">{scores[opponent] || 0}</p>
        </div>
      </div>
      <div className="flex flex-col w-full gap-3">
        <button onClick={onRematch} className="w-full bg-[#2481cc] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
          Request Rematch
        </button>
        <button onClick={onQuit} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400">
          Quit
        </button>
      </div>
    </div>
  );
};

// --- MAIN PONG COMPONENT ---
export default function Pong() {
  const { socket, roomId, username, opponent, updateScore, scores, sendRematchRequest, closeGame } = useContext(ChatContext);
  const canvasRef = useRef(null);
  const [winner, setWinner] = useState(null);
  const isHost = username < opponent; // Deterministic Host

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Game Constants
    const CW = 300; 
    const CH = 300;
    const P_HEIGHT = 60;
    const P_WIDTH = 10;

    // Game State
    let ball = { x: CW / 2, y: CH / 2, dx: 4, dy: 4, size: 6 };
    let p1Y = (CH - P_HEIGHT) / 2; // Host (Left)
    let p2Y = (CH - P_HEIGHT) / 2; // Guest (Right)

    const handleInput = (y) => {
      const rect = canvas.getBoundingClientRect();
      const relativeY = y - rect.top - P_HEIGHT / 2;
      const clampedY = Math.max(0, Math.min(CH - P_HEIGHT, relativeY));
      
      socket.emit('game-data', { 
        roomId, 
        type: 'PADDLE_MOVE', 
        y: clampedY, 
        user: username 
      });
    };

    const socketListener = (data) => {
      if (data.type === 'PADDLE_MOVE') {
        if (data.user === opponent) {
          isHost ? (p2Y = data.y) : (p1Y = data.y);
        } else {
          isHost ? (p1Y = data.y) : (p2Y = data.y);
        }
      }
      if (!isHost && data.type === 'SYNC_BALL') {
        ball = data.ball;
      }
      if (data.type === 'GAME_OVER') {
        setWinner(data.winner);
      }
    };

    socket.on('game-data', socketListener);

    const gameLoop = setInterval(() => {
      if (winner) return;

      // 1. Physics (Host Only)
      if (isHost) {
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall Bounce
        if (ball.y <= 0 || ball.y >= CH) ball.dy *= -1;

        // Paddle Collision Left (Host)
        if (ball.x <= P_WIDTH + 10 && ball.y > p1Y && ball.y < p1Y + P_HEIGHT) {
          ball.dx = Math.abs(ball.dx);
        }
        // Paddle Collision Right (Guest)
        if (ball.x >= CW - P_WIDTH - 10 && ball.y > p2Y && ball.y < p2Y + P_HEIGHT) {
          ball.dx = -Math.abs(ball.dx);
        }

        // Score Check
        if (ball.x < 0) {
          socket.emit('game-data', { roomId, type: 'GAME_OVER', winner: opponent });
          updateScore(opponent);
        } else if (ball.x > CW) {
          socket.emit('game-data', { roomId, type: 'GAME_OVER', winner: username });
          updateScore(username);
        }

        // Sync Ball Position to Guest
        socket.emit('game-data', { roomId, type: 'SYNC_BALL', ball });
      }

      // 2. Rendering
      ctx.clearRect(0, 0, CW, CH);
      
      // Center Line
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(CW/2, 0); ctx.lineTo(CW/2, CH); ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = isHost ? '#2481cc' : '#555'; // Host Paddle
      ctx.fillRect(10, p1Y, P_WIDTH, P_HEIGHT);
      
      ctx.fillStyle = !isHost ? '#2481cc' : '#555'; // Guest Paddle
      ctx.fillRect(CW - P_WIDTH - 10, p2Y, P_WIDTH, P_HEIGHT);

      // Ball
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
      ctx.fill();
    }, 1000 / 60);

    // Event Listeners
    const onMouseMove = (e) => handleInput(e.clientY);
    const onTouchMove = (e) => {
      e.preventDefault();
      handleInput(e.touches[0].clientY);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      clearInterval(gameLoop);
      socket.off('game-data', socketListener);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [socket, roomId, winner]);

  return (
    <div className="relative w-full h-full bg-black/20 flex items-center justify-center overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={300} 
        className="w-full h-full touch-none"
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