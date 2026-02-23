import React, { useEffect, useRef, useState, useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
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
          <p className="text-[8px] text-gray-500 font-black uppercase">OPPONENT</p>
          <p className="text-xl font-black">{scores[opponent] || 0}</p>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3 max-w-[200px]">
        <button onClick={onRematch} className="w-full bg-[#2481cc] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
          Rematch
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
  
  // Game dimensions and constants
  const CW = 300; 
  const CH = 300;
  const P_HEIGHT = 60;
  const P_WIDTH = 8;

  // Refs for high-performance physics (no re-renders)
  const ballRef = useRef({ x: 150, y: 150, dx: 4, dy: 4, size: 6 });
  const paddlesRef = useRef({ p1Y: 120, p2Y: 120 });

  // Deterministic Host: Player with alphabetically first name handles physics
  const isHost = username < opponent;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleInput = (clientY) => {
      const rect = canvas.getBoundingClientRect();
      // Precise scaling from screen pixels to 300x300 canvas space
      const scaleY = CH / rect.height;
      const relativeY = (clientY - rect.top) * scaleY - P_HEIGHT / 2;
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
          isHost ? (paddlesRef.current.p2Y = data.y) : (paddlesRef.current.p1Y = data.y);
        } else {
          isHost ? (paddlesRef.current.p1Y = data.y) : (paddlesRef.current.p2Y = data.y);
        }
      }
      if (!isHost && data.type === 'SYNC_BALL') {
        ballRef.current = data.ball;
      }
      if (data.type === 'GAME_OVER') {
        setWinner(data.winner);
      }
    };

    socket.on('game-data', socketListener);

    const gameLoop = setInterval(() => {
      if (winner) return;

      // 1. Logic (Host Only)
      if (isHost) {
        let b = ballRef.current;
        b.x += b.dx;
        b.y += b.dy;

        // Wall Bounce
        if (b.y <= 0 || b.y >= CH) b.dy *= -1;

        // Paddle Collision
        if (b.x <= 20 && b.y > paddlesRef.current.p1Y && b.y < paddlesRef.current.p1Y + P_HEIGHT) {
          b.dx = Math.abs(b.dx);
        }
        if (b.x >= CW - 20 && b.y > paddlesRef.current.p2Y && b.y < paddlesRef.current.p2Y + P_HEIGHT) {
          b.dx = -Math.abs(b.dx);
        }

        // Scoring
        if (b.x < 0) {
          socket.emit('game-data', { roomId, type: 'GAME_OVER', winner: opponent });
          updateScore(opponent);
        } else if (b.x > CW) {
          socket.emit('game-data', { roomId, type: 'GAME_OVER', winner: username });
          updateScore(username);
        }
        
        // Broadcast ball position to Guest
        socket.emit('game-data', { roomId, type: 'SYNC_BALL', ball: b });
      }

      // 2. Rendering
      ctx.fillStyle = '#0b141a';
      ctx.fillRect(0, 0, CW, CH);
      
      // Net
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.moveTo(CW/2, 0); ctx.lineTo(CW/2, CH); ctx.stroke();

      // Left Paddle (Host)
      ctx.fillStyle = isHost ? '#2481cc' : '#333'; 
      ctx.fillRect(10, paddlesRef.current.p1Y, P_WIDTH, P_HEIGHT);
      
      // Right Paddle (Guest)
      ctx.fillStyle = !isHost ? '#2481cc' : '#333';
      ctx.fillRect(CW - P_WIDTH - 10, paddlesRef.current.p2Y, P_WIDTH, P_HEIGHT);

      // Ball
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.size, 0, Math.PI * 2);
      ctx.fill();
    }, 1000 / 60);

    const onMouseMove = (e) => handleInput(e.clientY);
    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
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
  }, [socket, roomId, winner, opponent, isHost, username, updateScore]);

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