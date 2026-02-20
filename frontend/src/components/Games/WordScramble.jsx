import React, { useState, useEffect, useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username, correctWord }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${isMe ? 'bg-yellow-500 animate-pulse' : 'bg-gray-700'}`}>
        <span className="text-4xl">{isMe ? "🧠" : "📉"}</span>
      </div>
      <h2 className={`text-3xl font-black italic tracking-tighter mb-1 ${isMe ? 'text-yellow-500' : 'text-red-500'}`}>
        {isMe ? "BRAINY WIN!" : "OUTSMARTED"}
      </h2>
      <p className="text-white/60 text-xs font-bold mb-6">
        The word was: <span className="text-white tracking-widest">{correctWord}</span>
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
          New Word
        </button>
        <button onClick={onQuit} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400">
          Quit
        </button>
      </div>
    </div>
  );
};

// --- MAIN WORD SCRAMBLE COMPONENT ---
export default function WordScramble() {
  const { socket, roomId, username, opponent, updateScore, scores, sendRematchRequest, closeGame } = useContext(ChatContext);
  
  const [targetWord, setTargetWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [winner, setWinner] = useState(null);

  const words = ["GALAXY", "ROCKET", "BATTLE", "PYTHON", "CHROME", "SERVER", "MOBILE", "HIDDEN", "STRIKE", "MASTER"];

  useEffect(() => {
    // Host picks and scrambles the word
    if (username < opponent) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      const sc = randomWord.split('').sort(() => Math.random() - 0.5).join('');
      socket.emit('game-data', { roomId, type: 'SCRAMBLE_INIT', word: randomWord, scrambled: sc });
      setTargetWord(randomWord);
      setScrambled(sc);
    }

    const socketListener = (data) => {
      if (data.type === 'SCRAMBLE_INIT') {
        setTargetWord(data.word);
        setScrambled(data.scrambled);
      }
      if (data.type === 'SCRAMBLE_WIN') {
        setWinner(data.winner);
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, roomId]);

  const handleInput = (val) => {
    const entry = val.toUpperCase();
    setInput(entry);

    if (entry === targetWord && targetWord !== "") {
      socket.emit('game-data', { roomId, type: 'SCRAMBLE_WIN', winner: username });
      setWinner(username);
      updateScore(username);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col items-center justify-center overflow-hidden">
      
      <div className="text-center mb-8">
        <p className="text-[10px] font-black text-[#2481cc] uppercase tracking-[0.3em] mb-2">Unscramble</p>
        <div className="flex gap-2 justify-center">
          {scrambled.split('').map((char, i) => (
            <div key={i} className="w-10 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
              <span className="text-xl font-black text-white">{char}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-xs">
        <input 
          autoFocus
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="TYPE GUESS..."
          className={`
            w-full bg-black/40 border-2 rounded-2xl p-4 text-center text-xl font-black tracking-widest outline-none transition-all
            ${input.length > 0 && targetWord.startsWith(input) ? 'border-green-500/50 text-green-400' : 'border-white/10 text-white'}
          `}
        />
        <div className="mt-4 flex justify-between px-2">
            <p className="text-[8px] font-bold text-gray-600 uppercase">Opponent is guessing...</p>
            <p className="text-[8px] font-bold text-gray-600 uppercase">{input.length} / {targetWord.length}</p>
        </div>
      </div>

      {winner && (
        <GameOverOverlay 
          winner={winner}
          correctWord={targetWord}
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