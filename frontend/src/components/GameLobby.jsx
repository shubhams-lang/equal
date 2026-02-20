import React from 'react';

const GAMES = [
  { id: 'Pong', icon: '🏓', desc: 'Classic Paddle Battle' },
  { id: 'TicTacToe', icon: '❌', desc: 'Strategic Grid War' },
  { id: 'TapTap', icon: '⚡', desc: 'Speed Tapping Race' },
  { id: 'SlideRace', icon: '🏎️', desc: 'Fast Finger Sprint' },
  { id: 'WordScramble', icon: '🔤', desc: 'Vocabulary Clash' }
];

export default function GameLobby({ onSelect, isHost, opponent }) {
  // If no one else is in the room, show a waiting state
  if (!opponent) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-black/20 rounded-3xl border-2 border-dashed border-white/5">
        <div className="w-12 h-12 border-4 border-[#2481cc] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold animate-pulse text-sm">WAITING FOR OPPONENT...</p>
        <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">Share the room code to play</p>
      </div>
    );
  }

  // If you are NOT the host, show a "Waiting for Host" state
  if (!isHost) {
    return (
      <div className="p-8 bg-[#17212b] rounded-3xl border border-white/10 text-center shadow-2xl">
        <div className="text-4xl mb-4">🎮</div>
        <h2 className="text-white font-black text-lg mb-1 uppercase">GAME LOBBY</h2>
        <p className="text-blue-400 text-xs font-bold animate-bounce uppercase">
          {opponent} is picking a game...
        </p>
      </div>
    );
  }

  // If you ARE the host, show the game menu
  return (
    <div className="w-full max-w-sm">
      <h2 className="text-center text-[10px] font-black text-gray-500 mb-6 tracking-[0.3em] uppercase">
        Select Your Challenge
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect(game.id)}
            className="flex flex-col items-center p-5 bg-[#17212b] rounded-2xl border border-white/5 hover:border-[#2481cc] transition-all active:scale-90 group shadow-xl"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">
              {game.icon}
            </span>
            <span className="text-xs font-black text-white uppercase tracking-tighter">
              {game.id}
            </span>
            <span className="text-[8px] text-gray-500 font-bold uppercase mt-1">
              {game.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}