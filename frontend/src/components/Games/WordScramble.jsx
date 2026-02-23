import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';

// --- GAME OVER OVERLAY ---
const GameOverOverlay = ({ winner, onRematch, onQuit, scores, opponent, username }) => {
  const isMe = winner === username;
  return (
    <div className="absolute inset-0 z-[110] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${isMe ? 'bg-yellow-500 animate-bounce' : 'bg-gray-700'}`}>
        <span className="text-4xl">{isMe ? "👑" : "🏁"}</span>
      </div>
      <h2 className={`text-3xl font-black italic tracking-tighter mb-1 ${isMe ? 'text-yellow-500' : 'text-red-500'}`}>
        {isMe ? "CHAMPION!" : "MATCH OVER"}
      </h2>
      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6">
        {isMe ? "You reached 10 words first" : `${opponent} was faster this time`}
      </p>

      <div className="flex gap-8 mb-8 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
        <div className="text-center">
          <p className="text-[8px] text-gray-500 font-black">YOU</p>
          <p className="text-xl font-black text-[#2481cc]">{scores[username] || 0}</p>
        </div>
        <div className="w-px h-8 bg-white/10 self-center" />
        <div className="text-center">
          <p className="text-[8px] text-gray-500 font-black uppercase">{opponent?.split(' ')[1] || 'OPP'}</p>
          <p className="text-xl font-black text-red-500">{scores[opponent] || 0}</p>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3 max-w-[200px]">
        <button onClick={onRematch} className="w-full bg-[#2481cc] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
          Play Again
        </button>
        <button onClick={onQuit} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400">
          Quit
        </button>
      </div>
    </div>
  );
};

export default function WordScramble() {
  const { socket, roomId, username, opponent, updateScore, scores, closeGame } = useContext(ChatContext);
  
  const [targetWord, setTargetWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [matchWinner, setMatchWinner] = useState(null);
  
  const WIN_TARGET = 10;
  const wordList = ["GALAXY", "ROCKET", "BATTLE", "PYTHON", "CHROME", "SERVER", "MOBILE", "HIDDEN", "STRIKE", "MASTER", "PIXELS", "BINARY", "SYSTEM", "DANGER", "MATRIX", "WIZARD", "CRYPTO", "ENERGY"];

  // --- HELPER: GENERATE WORD ---
  const generateNewWord = useCallback(() => {
    const isHost = username < opponent;
    if (isHost) {
      const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
      const sc = randomWord.split('').sort(() => Math.random() - 0.5).join('');
      
      socket.emit('game-data', { 
        roomId, 
        type: 'SCRAMBLE_NEXT', 
        word: randomWord, 
        scrambled: sc 
      });
      
      setTargetWord(randomWord);
      setScrambled(sc);
      setInput("");
    }
  }, [username, opponent, roomId, socket]);

  // --- EFFECT: INITIALIZE & LISTENERS ---
  useEffect(() => {
    if (targetWord === "") generateNewWord();

    const socketListener = (data) => {
      if (data.type === 'SCRAMBLE_NEXT') {
        setTargetWord(data.word);
        setScrambled(data.scrambled);
        setInput("");
      }
      if (data.type === 'SCRAMBLE_RESTART') {
        setMatchWinner(null);
        generateNewWord();
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, generateNewWord, targetWord]);

  // --- INPUT HANDLER ---
  const handleInput = (val) => {
    if (matchWinner) return;
    const entry = val.toUpperCase().replace(/[^A-Z]/g, '');
    setInput(entry);

    if (entry === targetWord && targetWord !== "") {
      // 1. Update Score in Context
      updateScore(username);
      
      // 2. Check if this was the 10th win
      const currentScore = (scores[username] || 0) + 1;
      if (currentScore >= WIN_TARGET) {
        setMatchWinner(username);
      } else {
        // 3. Just move to the next word
        generateNewWord();
      }
    }
  };

  const handleRematchTrigger = () => {
    socket.emit('game-data', { roomId, type: 'SCRAMBLE_RESTART' });
    setMatchWinner(null);
    generateNewWord();
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Race Progress Bar */}
      <div className="absolute top-6 w-full max-w-[280px] space-y-2">
        <div className="flex justify-between text-[8px] font-black text-gray-500 tracking-widest">
          <span>YOU: {scores[username] || 0}/{WIN_TARGET}</span>
          <span>{opponent?.split(' ')[1] || 'OPP'}: {scores[opponent] || 0}/{WIN_TARGET}</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-[#2481cc] transition-all duration-500 shadow-[0_0_8px_#2481cc]" 
            style={{ width: `${((scores[username] || 0) / WIN_TARGET) * 100}%` }}
          />
        </div>
      </div>

      <div className="text-center mb-8">
        <p className="text-[10px] font-black text-[#2481cc] uppercase tracking-[0.4em] mb-4">Unscramble</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {scrambled.split('').map((char, i) => (
            <div key={`${targetWord}-${i}`} className="w-10 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center animate-in zoom-in duration-300">
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
          placeholder="GUESS..."
          disabled={!!matchWinner}
          className={`
            w-full bg-black/40 border-2 rounded-2xl p-4 text-center text-xl font-black tracking-widest outline-none transition-all
            ${input.length > 0 && targetWord.startsWith(input) ? 'border-[#25D366]/40 text-[#25D366]' : 'border-white/10 text-white'}
          `}
        />
        <p className="mt-4 text-[9px] font-bold text-gray-600 text-center uppercase tracking-widest animate-pulse">
          First to 10 points wins the match
        </p>
      </div>

      {matchWinner && (
        <GameOverOverlay 
          winner={matchWinner}
          username={username}
          opponent={opponent}
          scores={scores}
          onRematch={handleRematchTrigger}
          onQuit={closeGame}
        />
      )}
    </div>
  );
}