import { useState, useEffect } from "react";

// A mini-dictionary to keep the game fast and offline-capable
const VALID_WORDS = ["REACT", "REACTIVE", "ACTION", "TRACE", "CARE", "RACE", "ICE", "TEA", "EAT", "RATE", "CORE", "CREATIVE"];

export default function WordScramble({ socket, roomId, username, opponent }) {
  const [letters, setLetters] = useState([]);
  const [input, setInput] = useState("");
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [winner, setWinner] = useState(null);
  const [feedback, setFeedback] = useState(""); // For "Invalid Word" messages

  const isHost = username < opponent;
  const WINNING_SCORE = 30;

  useEffect(() => {
    if (isHost) {
      const sourceWord = "REACTIVE";
      const scrambled = sourceWord.split("").sort(() => Math.random() - 0.5);
      setLetters(scrambled);
      socket.emit("game-state-sync", {
        roomId,
        payload: { game: "WordScramble", type: "START", letters: scrambled, sender: username }
      });
    }

    socket.on("game-state-update", (payload) => {
      if (payload.game !== "WordScramble" || payload.sender !== opponent) return;
      if (payload.type === "START") setLetters(payload.letters);
      if (payload.type === "SCORE") {
        setOppScore(payload.score);
        if (payload.score >= WINNING_SCORE) setWinner(opponent);
      }
    });

    return () => socket.off("game-state-update");
  }, [socket, opponent, isHost, roomId, username]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const word = input.trim().toUpperCase();

    // Dictionary Validation
    if (!VALID_WORDS.includes(word)) {
      setFeedback("❌ NOT A WORD");
      setTimeout(() => setFeedback(""), 1000);
      setInput("");
      return;
    }

    if (word.length > 1 && !winner) {
      const newScore = myScore + word.length;
      setMyScore(newScore);
      setFeedback("✅ + " + word.length);
      setTimeout(() => setFeedback(""), 1000);

      socket.emit("game-state-sync", {
        roomId,
        payload: { game: "WordScramble", type: "SCORE", sender: username, score: newScore }
      });

      if (newScore >= WINNING_SCORE) setWinner(username);
    }
    setInput("");
  };

  return (
    <div className="bg-[#17212b] p-6 rounded-3xl w-full max-w-xs border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Score Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <p className="text-[10px] text-blue-400 font-bold uppercase">You</p>
          <p className="text-xl font-black text-white">{myScore}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-red-400 font-bold uppercase">{opponent || "Wait"}</p>
          <p className="text-xl font-black text-white">{oppScore}</p>
        </div>
      </div>

      {/* Visual Feedback Overlay */}
      <div className="h-6 text-center mb-2">
        <span className={`text-xs font-bold transition-opacity ${feedback ? "opacity-100" : "opacity-0"} ${feedback.includes('❌') ? 'text-red-500' : 'text-green-400'}`}>
          {feedback}
        </span>
      </div>

      {/* Scrambled Tiles */}
      <div className="bg-white/5 p-4 rounded-2xl mb-4">
        <div className="flex justify-center gap-2 flex-wrap">
          {letters.map((l, i) => (
            <span key={i} className="w-9 h-9 flex items-center justify-center bg-[#2481cc] text-white font-black rounded-xl shadow-md transform hover:scale-110 transition-transform">
              {l}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value.toUpperCase())} 
          placeholder="TYPE WORD..." 
          disabled={!!winner}
          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-center font-bold text-white focus:border-[#2481cc] outline-none"
        />
        <button 
          type="submit"
          disabled={!!winner}
          className="w-full bg-[#2481cc] py-3 rounded-xl font-black text-white active:scale-95 shadow-lg disabled:bg-gray-700"
        >
          SUBMIT WORD
        </button>
      </form>

      {winner && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-3xl mb-4">🏆</p>
          <p className="font-black text-white text-xl mb-4">
            {winner === username ? "YOU ARE THE WORD MASTER" : `${winner} DOMINATED`}
          </p>
          <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm">
            REMATCH
          </button>
        </div>
      )}
    </div>
  );
}