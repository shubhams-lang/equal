import { useState, useEffect } from "react";
import useSocketGame from "../../utils/useSocketGame";

export default function WordScramble({ socket, roomId }) {
  const [letters, setLetters] = useState([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const sendMove = useSocketGame(socket, roomId, ({ game, payload }) => {
    if (game === "WordScramble") setScore(payload.score);
  });

  useEffect(() => setLetters(shuffle("REACTVITE".split(""))), []);

  const shuffle = (arr) => arr.sort(() => Math.random()-0.5);

  const handleSubmit = () => {
    if (input.length > 1) {
      const newScore = score + input.length;
      setScore(newScore);
      sendMove("WordScramble", { score: newScore });
    }
    setInput("");
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg w-64 text-white">
      <div className="text-2xl mb-2">{letters.join(" ")}</div>
      <input value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="Type word" className="bg-gray-700 w-full p-1 rounded mb-2" />
      <button onClick={handleSubmit} className="bg-gray-600 px-2 py-1 rounded">Submit</button>
      <div className="mt-2">Score: {score}</div>
    </div>
  );
}
