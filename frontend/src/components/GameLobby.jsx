import React from "react";

const GAMES = [
  { id: "Pong", icon: "🏓", desc: "Classic Paddle Battle" },
  { id: "TicTacToe", icon: "❌", desc: "Strategic Grid War" },
  { id: "TapTap", icon: "⚡", desc: "Speed Tapping Race" },
  { id: "SlideRace", icon: "🏎️", desc: "Fast Finger Sprint" },
  { id: "WordScramble", icon: "🔤", desc: "Vocabulary Clash" }
];

export default function GameLobby({ onSelect, isHost, opponent }) {
  /* ===============================
     WAITING FOR OPPONENT
  =============================== */
  if (!opponent) {
    return (
      <div className="relative flex flex-col items-center justify-center p-12 rounded-3xl overflow-hidden">

        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/10 blur-2xl" />

        <div className="relative backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-3xl px-10 py-12 text-center">

          <div className="relative w-14 h-14 mb-6">
            <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-xl animate-pulse" />
            <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>

          <p className="text-sm tracking-[0.25em] text-slate-300 font-semibold uppercase">
            Waiting for Opponent
          </p>

          <p className="text-xs text-slate-500 mt-3 tracking-wide">
            Share the room code to begin
          </p>

        </div>
      </div>
    );
  }

  /* ===============================
     NOT HOST
  =============================== */
  if (!isHost) {
    return (
      <div className="relative p-10 rounded-3xl overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-blue-600/10 blur-2xl" />

        <div className="relative backdrop-blur-xl bg-white/[0.05] border border-white/10 rounded-3xl text-center px-10 py-12">

          <div className="text-5xl mb-6">🎮</div>

          <h2 className="text-white font-semibold text-lg tracking-wide mb-2">
            Game Lobby
          </h2>

          <p className="text-blue-400 text-sm font-medium animate-pulse">
            {opponent} is selecting a game...
          </p>

        </div>
      </div>
    );
  }

  /* ===============================
     HOST SELECT SCREEN
  =============================== */
  return (
    <div className="relative w-full max-w-md mx-auto">

      {/* Top Label */}
      <div className="text-center mb-10">
        <div className="text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-3">
          Arena Selection
        </div>

        <h2 className="text-2xl font-semibold text-white">
          Choose Your Challenge
        </h2>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-2 gap-5">

        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect(game.id)}
            className="group relative p-6 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.25)] active:scale-95 overflow-hidden"
          >

            {/* Hover Glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 blur-xl" />

            <div className="relative flex flex-col items-center">

              <span className="text-4xl mb-3 transition-transform duration-300 group-hover:scale-110">
                {game.icon}
              </span>

              <span className="text-sm font-semibold text-white tracking-wide">
                {game.id}
              </span>

              <span className="text-[11px] text-slate-400 mt-2 text-center">
                {game.desc}
              </span>

            </div>
          </button>
        ))}

      </div>
    </div>
  );
}