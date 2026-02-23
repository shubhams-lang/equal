import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';

export default function WordScramble() {
  const { socket, roomId, username, opponent, updateScore, scores, resetScores, closeGame } = useContext(ChatContext);
  
  const [targetWord, setTargetWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [matchWinner, setMatchWinner] = useState(null);
  
  const WIN_TARGET = 10;
  
  // Normal words and "Hurry Up" hard words
  const wordsNormal = ["ROCKET", "BATTLE", "PYTHON", "CHROME", "SERVER", "MOBILE", "HIDDEN", "STRIKE", "MASTER", "BINARY"];
  const wordsHard = ["CYBERNETIC", "ALGORITHM", "FRAMEWORK", "BLOCKCHAIN", "ENCRYPTION", "JAVASCRIPT", "DATABASE"];

  const isHost = username < opponent;

  // --- GENERATION LOGIC ---
  const generateNewWord = useCallback(() => {
    if (!isHost) return;

    // Use hard words if someone is close to winning
    const currentMaxScore = Math.max(scores[username] || 0, scores[opponent] || 0);
    const pool = currentMaxScore >= 7 ? wordsHard : wordsNormal;
    
    const randomWord = pool[Math.floor(Math.random() * pool.length)];
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
  }, [isHost, scores, username, opponent, roomId, socket]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    // Initial start (Host only)
    if (isHost && targetWord === "") {
      generateNewWord();
    }

    const socketListener = (data) => {
      if (data.type === 'SCRAMBLE_NEXT') {
        setTargetWord(data.word);
        setScrambled(data.scrambled);
        setInput("");
      }
      if (data.type === 'REQUEST_NEW_WORD' && isHost) {
        generateNewWord();
      }
      if (data.type === 'SCRAMBLE_RESTART') {
        setMatchWinner(null);
        setInput("");
        if (isHost) generateNewWord();
      }
      if (data.type === 'MATCH_OVER') {
        setMatchWinner(data.winner);
      }
    };

    socket.on('game-data', socketListener);
    return () => socket.off('game-data', socketListener);
  }, [socket, isHost, targetWord, generateNewWord]);

  // --- INPUT HANDLING ---
  const handleInput = (val) => {
    if (matchWinner) return;
    const entry = val.toUpperCase().replace(/[^A-Z]/g, '');
    setInput(entry);

    if (entry === targetWord && targetWord !== "") {
      updateScore(username); // Tell context to increment
      
      const myNewScore = (scores[username] || 0) + 1;
      
      if (myNewScore >= WIN_TARGET) {
        setMatchWinner(username);
        socket.emit('game-data', { roomId, type: 'MATCH_OVER', winner: username });
      } else {
        // Tell host to generate the next word
        if (isHost) {
          generateNewWord();
        } else {
          socket.emit('game-data', { roomId, type: 'REQUEST_NEW_WORD' });
        }
      }
    }
  };

  const onRematch = () => {
    if (resetScores) resetScores(); // Ensure scores go back to 0
    socket.emit('game-data', { roomId, type: 'SCRAMBLE_RESTART' });
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Progress Bars */}
      <div className="absolute top-8 w-full max-w-[300px] px-4">
        <div className="flex justify-between text-[10px] font-black mb-2 tracking-tighter">
          <span className="text-[#2481cc]">YOU: {scores[username] || 0}</span>
          <span className="text-red-500">{opponent?.split(' ')[1]}: {scores[opponent] || 0}</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full flex overflow-hidden border border-white/5">
          <div className="h-full bg-[#2481cc] transition-all duration-500 shadow-[0_0_10px_#2481cc]" style={{ width: `${((scores[username] || 0) / WIN_TARGET) * 100}%` }} />
          <div className="h-full bg-red-500/40 transition-all duration-500 ml-auto" style={{ width: `${((scores[opponent] || 0) / WIN_TARGET) * 100}%` }} />
        </div>
      </div>

      {/* Hurry Up Mode Warning */}
      {Math.max(scores[username] || 0, scores[opponent] || 0) >= 7 && (
        <div className="mb-4 animate-pulse">
          <p className="text-[8px] font-black text-yellow-500 uppercase tracking-[0.5em]">⚠️ Hurry Up! Difficulty Increased ⚠️</p>
        </div>
      )}

      

      <div className="text-center mb-10">
        <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
          {scrambled.split('').map((char, i) => (
            <div key={`${targetWord}-${i}`} className="w-10 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
              <span className="text-2xl font-black text-white">{char}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-xs relative">
        <input 
          autoFocus
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="TYPE GUESS..."
          disabled={!!matchWinner}
          className="w-full bg-black/40 border-2 border-white/10 rounded-2xl p-5 text-center text-2xl font-black tracking-widest outline-none transition-all focus:border-[#2481cc] focus:bg-black/60"
        />
      </div>

      {/* Game Over Screen */}
      {matchWinner && (
        <div className="absolute inset-0 z-[130] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${matchWinner === username ? 'bg-yellow-500' : 'bg-gray-700'}`}>
            <span className="text-4xl">{matchWinner === username ? "👑" : "🏳️"}</span>
          </div>
          <h2 className="text-4xl font-black italic text-white mb-2">{matchWinner === username ? "VICTORY!" : "DEFEAT"}</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">Score: {scores[username]} - {scores[opponent]}</p>
          <button onClick={onRematch} className="bg-[#2481cc] px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-transform shadow-xl shadow-blue-500/20">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}