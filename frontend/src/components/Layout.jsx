import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

// --- GAME IMPORTS ---
import GameLobby from "./GameLobby";
import WordScramble from "./Games/WordScramble";
import TicTacToe from "./Games/TicTacToe";
import SliderRace from "./Games/SliderRace";
import Pong from "./Games/Pong";
import TapTap from "./Games/TapTap";

export default function Layout() {
  const { users, typingUser, roomId, activeGame } = useContext(ChatContext);

  return (
    <div className="h-screen relative bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-black text-white flex overflow-hidden">
      
      {/* Ambient Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 1. LEFT SIDE: GAME AREA (60% width) */}
      <div className="flex-[1.5] relative flex flex-col border-r border-white/10 z-10 overflow-hidden">
        {!activeGame ? (
          <GameLobby />
        ) : (
          <div className="flex-1 w-full h-full animate-in fade-in zoom-in-95 duration-500">
            {activeGame === 'word-scramble' && <WordScramble />}
            {activeGame === 'tic-tac-toe' && <TicTacToe />}
            {activeGame === 'slider-race' && <SliderRace />}
            {activeGame === 'pong' && <Pong />}
            {activeGame === 'tap-tap' && <TapTap />}
          </div>
        )}
      </div>

      {/* 2. RIGHT SIDE: CHAT AREA (Remaining width) */}
      <div className="flex-1 flex flex-col relative z-20 backdrop-blur-md bg-black/20">
        
        {/* Room Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-1">Session</div>
            <div className="font-black text-lg tracking-tighter text-[#2481cc]">
              {roomId || "OFFLINE"}
            </div>
          </div>
          <div className="flex -space-x-2">
            {users.map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          <MessageList />
        </div>

        {/* Typing Indicator */}
        {typingUser && (
          <div className="px-6 pb-2">
            <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-[10px] font-bold text-slate-400">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
              {typingUser.toUpperCase()} IS TYPING
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-5 border-t border-white/10 bg-black/40">
          <MessageInput />
        </div>
      </div>
    </div>
  );
}