import React, { useState, useEffect, useContext, useRef } from 'react';
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
      <p className="text-white/60 text-[10px] font-bold mb-6 uppercase tracking-widest">
        The word was: <span className="text-white bg-white/10 px-2 py-1 rounded">{correctWord}</span>
      </p>

      <div className="flex gap-8 mb-8 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
        <div>
          <p className="text-[8px] text-gray-500 font-black">YOU</p>
          <p className="text-xl font-black text-[#2481cc]">{scores[username] || 0}</p>
        </div>
        <div className="w-px h-8 bg-white/10 self-center" />
        <div>
          <p className="text-[8px] text-gray-500 font-black uppercase text-center">{opponent?.split(' ')[1] || 'OPP'}</p>
          <p className="text-xl font-black text-red-500">{scores[opponent] || 0}</p>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3 max-w-[200px]">
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
  
  const gameEnded = useRef(false);

  const wordList = [
    "GALAXY", "ROCKET", "BATTLE", "PYTHON", "CHROME", "SERVER", 
    "MOBILE", "HIDDEN", "STRIKE", "MASTER", "CRYPTO", "WIZARD",
    "MATRIX", "ENERGY", "PIXELS", "BINARY", "SYSTEM", "DANGER"
  ];

  useEffect(() => {
    // Determine Host (Alphabetical first)
    const isHost = username < opponent;

    if (isHost && targetWord === "") {
      const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
      // Shuffle logic
      const sc = randomWord.split('')
        .sort(() => Math.random() - 0.5)
        .join('');
      
      setTargetWord(randomWord);
      setScrambled(sc);
      
      socket.emit('game-data', { 
        roomId, 
        type: 'SCRAMBLE_INIT', 
        word: randomWord, 
        scrambled: sc 
      });
    }

    const socketListener = (data) => {
      if (data.type === 'SCRAMBLE_INIT') {
        setTargetWord(data.word);
        setScrambled(data.scrambled);
      }
      if (data.type === 'SCRAMBLE_WIN') {
        setWinner(data.winner);
        gameEnded.current = true;
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, roomId, username, opponent, targetWord]);

  const handleInput = (val) => {
    if (winner || gameEnded.current) return;

    const entry = val.toUpperCase().replace(/[^A-Z]/g, '');
    setInput(entry);

    if (entry === targetWord && targetWord !== "") {
      gameEnded.current = true;
      setWinner(username);
      updateScore(username);
      socket.emit('game-data', { roomId, type: 'SCRAMBLE_WIN', winner: username });
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col items-center justify-center overflow-hidden">
      
      <div className="text-center mb-10">
        <p className="text-[10px] font-black text-[#2481cc] uppercase tracking-[0.4em] mb-4">Unscramble This</p>
        <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
          {scrambled.split('').map((char, i) => (
            <div 
              key={i} 
              className="w-10 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <span className="text-xl font-black text-white">{char}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-xs relative">
        <input 
          autoFocus
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="TYPE HERE..."
          disabled={!!winner}
          className={`
            w-full bg-black/40 border-2 rounded-2xl p-5 text-center text-2xl font-black tracking-[0.2em] outline-none transition-all
            ${input.length > 0 && targetWord.startsWith(input) 
              ? 'border-[#25D366]/50 text-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.1)]' 
              : input.length > 0 ? 'border-red-500/30 text-red-400' : 'border-white/10 text-white'}
          `}
        />
        
        <div className="mt-4 flex justify-between px-2 items-center">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-[#2481cc] rounded-full animate-ping" />
               <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                 {opponent?.split(' ')[1] || 'Opponent'} is typing...
               </p>
            </div>
            <p className="text-[8px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
              {input.length} / {targetWord.length}
            </p>
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-12 opacity-30">
        <p className="text-[9px] font-black text-white uppercase tracking-[0.5em]">Intellectual Duel</p>
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