import { useState } from "react";
import useSocketGame from "../../utils/useSocketGame";

export default function SlideRace({ socket, roomId }) {
  const [pos, setPos] = useState(0);
  const sendMove = useSocketGame(socket, roomId, ({ game, payload }) => {
    if (game === "SlideRace") setPos(payload.pos);
  });

  const handleMove = () => {
    const newPos = Math.min(pos + 5, 100);
    setPos(newPos);
    sendMove("SlideRace", { pos: newPos });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg w-64 text-white">
      <div className="h-6 bg-gray-700 rounded mb-2">
        <div className="bg-blue-500 h-6 rounded" style={{ width: `${pos}%` }} />
      </div>
      <button onClick={handleMove} className="bg-gray-600 px-2 py-1 rounded">Move</button>
      {pos >= 100 && <div className="mt-2 text-yellow-300 font-bold">Finished!</div>}
    </div>
  );
}
