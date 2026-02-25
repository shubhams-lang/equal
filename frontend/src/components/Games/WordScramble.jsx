import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { ChatContext } from '../../context/ChatContext';

const WORDS_NORMAL = ["ROCKET", "BATTLE", "PYTHON", "CHROME", "SERVER", "MOBILE", "HIDDEN", "STRIKE", "MASTER", "BINARY"];
const WORDS_HARD = ["CYBERNETIC", "ALGORITHM", "FRAMEWORK", "BLOCKCHAIN", "ENCRYPTION", "JAVASCRIPT", "DATABASE"];

export default function WordScramble() {
  const { 
    socket, roomId, username, opponent, 
    updateScore, scores, recordMatchWin, 
    settings, sendRematchRequest, closeGame 
  } = useContext(ChatContext);

  // --- STATE ---
  const [targetWord, setTargetWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [matchWinner, setMatchWinner] = useState(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [revealedIndices, setRevealedIndices] = useState([]);
  const [streak, setStreak] = useState(0);

  const WIN_TARGET = settings?.winTarget || 10;
  const isHost = opponent && username < opponent;

  // --- TIMER LOGIC (Host Only) ---
  useEffect(() => {
    if (!isHost || matchWinner) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateNewWord();
          socket.emit('game-data', { roomId, type: 'TIMER_RESET' });
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isHost, matchWinner, roomId, socket]);

  // --- WORD GENERATION ---
  const generateNewWord = useCallback(() => {
    if (!isHost) return;

    const currentMax = Math.max(scores[username] || 0, scores[opponent] || 0);
    const pool = currentMax >= Math.floor(WIN_TARGET * 0.7) ? WORDS_HARD : WORDS_NORMAL;
    const word = pool[Math.floor(Math.random() * pool.length)];
    
    let sc = word;
    while (sc === word) {
      sc = word.split('').sort(() => Math.random() - 0.5).join('');
    }
    
    setTargetWord(word);
    setScrambled(sc);
    setInput("");
    setRevealedIndices([]);
    setTimeLeft(15);

    socket.emit('game-data', { 
      roomId, 
      type: 'SCRAMBLE_NEXT', 
      word, 
      scrambled: sc 
    });
  }, [isHost, scores, username, opponent, roomId, socket, WIN_TARGET]);

  // --- HINT LOGIC ---
  const handleRequestHint = () => {
    if (matchWinner || revealedIndices.length >= targetWord.length - 1 || timeLeft <= 3) return;
    if (isHost) applyHint();
    else socket.emit('game-data', { roomId, type: 'REQUEST_HINT' });
  };

  const applyHint = () => {
    if (!isHost) return;
    const available = targetWord.split('').map((_, i) => i).filter(i => !revealedIndices.includes(i));
    if (available.length > 1) {
      const newIdx = available[Math.floor(Math.random() * available.length)];
      const newTime = Math.max(0, timeLeft - 3);
      
      socket.emit('game-data', { 
        roomId, 
        type: 'HINT_REVEALED', 
        index: newIdx, 
        newTime 
      });
      
      setRevealedIndices(prev => [...prev, newIdx]);
      setTimeLeft(newTime);
    }
  };

  // --- LISTENERS ---
  useEffect(() => {
    if (isHost && !targetWord) generateNewWord();

    const handleData = (data) => {
      switch(data.type) {
        case 'SCRAMBLE_NEXT':
          setTargetWord(data.word);
          setScrambled(data.scrambled);
          setInput("");
          setRevealedIndices([]);
          setTimeLeft(15);
          break;
        case 'HINT_REVEALED':
          setRevealedIndices(prev => [...prev, data.index]);
          setTimeLeft(data.newTime);
          break;
        case 'TIMER_RESET':
          setTimeLeft(15);
          setStreak(0); // Break streak on time-out
          break;
        case 'REQUEST_HINT':
          if (isHost) applyHint();
          break;
        case 'REQUEST_NEW_WORD':
          if (isHost) generateNewWord();
          break;
        case 'MATCH_OVER':
          setMatchWinner(data.winner);
          break;
        case 'ACHIEVEMENT_UNLOCKED':
          setShowAchievement(true);
          break;
        case 'GAME_RESTART_SIGNAL':
          setMatchWinner(null);
          setShowAchievement(false);
          setStreak(0);
          if (isHost) generateNewWord();
          break;
        default: break;
      }
    };

    socket.on('game-data', handleData);
    return () => socket.off('game-data', handleData);
  }, [socket, isHost, targetWord, generateNewWord, revealedIndices, timeLeft]);

  // --- INPUT HANDLER ---
  const handleInput = (val) => {
    if (matchWinner) return;
    const entry = val.toUpperCase().replace(/[^A-Z]/g, '');
    setInput(entry);

    if (entry === targetWord && targetWord !== "") {
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      // Multiplier: 3 in a row = 2 points, else 1 point
      const pointsToAdd = newStreak >= 3 ? 2 : 1;
      const myNewScore = (scores[username] || 0) + pointsToAdd;
      
      // Update score multiple times if streak bonus applies
      for(let i=0; i < pointsToAdd; i++) updateScore(username);

      if (myNewScore >= WIN_TARGET) {
        setMatchWinner(username);
        recordMatchWin(username);
        socket.emit('game-data', { roomId, type: 'MATCH_OVER', winner: username });
        if ((scores[opponent] || 0) === 0) {
          socket.emit('game-data', { roomId, type: 'ACHIEVEMENT_UNLOCKED', winner: username });
          setShowAchievement(true);
        }
      } else {
        if (isHost) generateNewWord();
        else socket.emit('game-data', { roomId, type: 'REQUEST_NEW_WORD' });
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Progress Header */}
      <div className="absolute top-6 w-full max-w-[320px] px-4 space-y-2">
        <div className="flex justify-between text-[10px] font-black tracking-widest">
          <span className="text-[#2481cc]">YOU: {scores[username] || 0} {streak >= 3 && "🔥"}</span>
          <span className="text-red-500">{opponent?.substring(0,8).toUpperCase()}: {scores[opponent] || 0}</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden border border-white/5">
          <div className="h-full bg-[#2481cc] transition-all duration-500 shadow-[0_0_10px_#2481cc]" 
               style={{ width: `${((scores[username] || 0) / WIN_TARGET) * 100}%` }} />
          <div className="h-full bg-red-500/30 transition-all duration-500 ml-auto" 
               style={{ width: `${((scores[opponent] || 0) / WIN_TARGET) * 100}%` }} />
        </div>
      </div>

      {/* Timer Bar */}
      <div className="absolute top-20 w-full max-w-[180px] flex flex-col items-center">
        <div className={`text-xs font-black mb-1 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white/40'}`}>
          {timeLeft}s
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-blue-500'}`}
               style={{ width: `${(timeLeft / 15) * 100}%` }} />
        </div>
      </div>

      {showAchievement && (
        <div className="absolute top-32 z-50 bg-yellow-500 text-black px-4 py-1 rounded-full font-black text-[10px] animate-bounce shadow-[0_0_15px_#eab308]">
          🏆 FLAWLESS VICTORY
        </div>
      )}

      {/* Scrambled Area */}
      <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-[280px]">
        {scrambled.split('').map((char, i) => (
          <div key={`${targetWord}-${i}`} className="w-10 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-xl">
            <span className="text-2xl font-black text-white">{char}</span>
          </div>
        ))}
      </div>

      {/* Hint Visualization */}
      <div className="flex gap-1 mb-6">
        {targetWord.split('').map((char, i) => (
          <div key={`hint-${i}`} className="w-6 h-8 border-b-2 border-white/10 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-400">
              {revealedIndices.includes(i) ? char : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xs flex flex-col items-center">
        <input 
          autoFocus
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="TYPE HERE..."
          disabled={!!matchWinner}
          className="w-full bg-black/40 border-2 border-white/10 rounded-2xl p-5 text-center text-2xl font-black tracking-widest outline-none transition-all focus:border-[#2481cc] mb-4"
        />
        
        <button 
          onClick={handleRequestHint}
          disabled={!!matchWinner || timeLeft <= 3 || revealedIndices.length >= targetWord.length - 1}
          className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-yellow-500 hover:bg-white/10 transition-all disabled:opacity-20"
        >
          💡 Hint (-3s)
        </button>
      </div>

      {/* Streak Notification */}
      {streak >= 3 && (
        <div className="mt-4 text-[#2481cc] font-black text-[10px] animate-pulse">
          🔥 {streak} STREAK! +2 PTS ACTIVE
        </div>
      )}

      {/* Match Over Overlay */}
      {matchWinner && (
        <div className="absolute inset-0 z-[100] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${matchWinner === username ? 'bg-yellow-500' : 'bg-gray-700'}`}>
            <span className="text-4xl">{matchWinner === username ? "👑" : "🏳️"}</span>
          </div>
          <h2 className="text-4xl font-black italic text-white mb-2">{matchWinner === username ? "VICTORY" : "DEFEAT"}</h2>
          <div className="flex flex-col w-full max-w-[200px] gap-3 mt-8">
            <button onClick={sendRematchRequest} className="bg-[#2481cc] py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform">
              Play Again
            </button>
            <button onClick={closeGame} className="bg-white/5 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-gray-400">
              Quit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}