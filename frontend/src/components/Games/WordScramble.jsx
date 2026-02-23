import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ChatContext } from '../../context/ChatContext';

export default function WordScramble() {
  const { 
    socket, roomId, username, opponent, 
    updateScore, scores, recordMatchWin, 
    settings, sendRematchRequest, closeGame 
  } = useContext(ChatContext);

  const [targetWord, setTargetWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [matchWinner, setMatchWinner] = useState(null);
  const [showAchievement, setShowAchievement] = useState(false);

  const WIN_TARGET = settings.winTarget || 10;
  const isHost = username < opponent;

  // Word pools for "Hurry Up" mode
  const wordsNormal = ["ROCKET", "BATTLE", "PYTHON", "CHROME", "SERVER", "MOBILE", "HIDDEN", "STRIKE", "MASTER", "BINARY"];
  const wordsHard = ["CYBERNETIC", "ALGORITHM", "FRAMEWORK", "BLOCKCHAIN", "ENCRYPTION", "JAVASCRIPT", "DATABASE"];

  // --- GENERATE WORD (Host Only) ---
  const generateNewWord = useCallback(() => {
    if (!isHost) return;

    const currentMax = Math.max(scores[username] || 0, scores[opponent] || 0);
    const pool = currentMax >= Math.floor(WIN_TARGET * 0.7) ? wordsHard : wordsNormal;
    
    const word = pool[Math.floor(Math.random() * pool.length)];
    const sc = word.split('').sort(() => Math.random() - 0.5).join('');
    
    socket.emit('game-data', { roomId, type: 'SCRAMBLE_NEXT', word, scrambled: sc });
  }, [isHost, scores, username, opponent, roomId, socket, WIN_TARGET]);

  // --- LISTENERS ---
  useEffect(() => {
    if (isHost && !targetWord) generateNewWord();

    const handleData = (data) => {
      if (data.type === 'SCRAMBLE_NEXT') {
        setTargetWord(data.word);
        setScrambled(data.scrambled);
        setInput("");
      }
      if (data.type === 'REQUEST_NEW_WORD' && isHost) {
        generateNewWord();
      }
      if (data.type === 'GAME_RESTART_SIGNAL') {
        setMatchWinner(null);
        setShowAchievement(false);
        setInput("");
        if (isHost) generateNewWord();
      }
      if (data.type === 'ACHIEVEMENT_UNLOCKED') {
        setShowAchievement(true);
      }
    };

    socket.on('game-data', handleData);
    return () => socket.off('game-data', handleData);
  }, [socket, isHost, targetWord, generateNewWord]);

  // --- INPUT HANDLER ---
  const handleInput = (val) => {
    if (matchWinner) return;
    const entry = val.toUpperCase().replace(/[^A-Z]/g, '');
    setInput(entry);

    if (entry === targetWord && targetWord !== "") {
      const myNewScore = (scores[username] || 0) + 1;
      updateScore(username);

      if (myNewScore >= WIN_TARGET) {
        setMatchWinner(username);
        recordMatchWin(username); // Update Trophy/Leaderboard
        
        // Flawless Victory Check
        if ((scores[opponent] || 0) === 0) {
          socket.emit('game-data', { roomId, type: 'ACHIEVEMENT_UNLOCKED', winner: username });
        }
      } else {
        if (isHost) generateNewWord();
        else socket.emit('game-data', { roomId, type: 'REQUEST_NEW_WORD' });
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] p-6 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Race Progress Header */}
      <div className="absolute top-6 w-full max-w-[320px] px-4 space-y-2">
        <div className="flex justify-between text-[10px] font-black tracking-widest">
          <span className="text-[#2481cc]">YOU: {scores[username] || 0}</span>
          <span className="text-red-500">{opponent?.substring(0,8).toUpperCase()}: {scores[opponent] || 0}</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden border border-white/5">
          <div className="h-full bg-[#2481cc] transition-all duration-500 shadow-[0_0_10px_#2481cc]" 
               style={{ width: `${((scores[username] || 0) / WIN_TARGET) * 100}%` }} />
          <div className="h-full bg-red-500/30 transition-all duration-500 ml-auto" 
               style={{ width: `${((scores[opponent] || 0) / WIN_TARGET) * 100}%` }} />
        </div>
        {Math.max(scores[username] || 0, scores[opponent] || 0) >= Math.floor(WIN_TARGET * 0.7) && (
          <p className="text-[8px] text-center font-black text-yellow-500 animate-pulse">⚠️ HURRY UP! HARDER WORDS ⚠️</p>
        )}
      </div>

      {/* Achievement Banner */}
      {showAchievement && (
        <div className="absolute top-24 z-50 bg-yellow-500 text-black px-4 py-1 rounded-full font-black text-[10px] animate-bounce shadow-[0_0_15px_#eab308]">
          🏆 FLAWLESS VICTORY UNLOCKED
        </div>
      )}

      {/* Scrambled Letters */}
      <div className="flex flex-wrap gap-2 justify-center mb-10 max-w-[280px]">
        {scrambled.split('').map((char, i) => (
          <div key={`${targetWord}-${i}`} className="w-10 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-xl animate-in zoom-in duration-300">
            <span className="text-2xl font-black text-white">{char}</span>
          </div>
        ))}
      </div>

      {/* Input Field */}
      <div className="w-full max-w-xs">
        <input 
          autoFocus
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="UNSCRAMBLE..."
          disabled={!!matchWinner}
          className="w-full bg-black/40 border-2 border-white/10 rounded-2xl p-5 text-center text-2xl font-black tracking-widest outline-none transition-all focus:border-[#2481cc]"
        />
      </div>

      {/* Match Over Overlay */}
      {matchWinner && (
        <div className="absolute inset-0 z-[100] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${matchWinner === username ? 'bg-yellow-500' : 'bg-gray-700'}`}>
            <span className="text-4xl">{matchWinner === username ? "👑" : "🏳️"}</span>
          </div>
          <h2 className="text-4xl font-black italic text-white mb-2">{matchWinner === username ? "VICTORY" : "DEFEAT"}</h2>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">Set complete at {WIN_TARGET} points</p>
          
          <div className="flex flex-col w-full max-w-[200px] gap-3">
            <button onClick={sendRematchRequest} className="bg-[#2481cc] py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform shadow-lg shadow-blue-500/20">
              Play Again
            </button>
            <button onClick={closeGame} className="bg-white/5 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-gray-400">
              Quit to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}