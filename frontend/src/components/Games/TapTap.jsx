import { useState } from "react";
import useSocketGame from "../../utils/useSocketGame";

export default function TapTap({ socket, roomId }) {
  const [progress, setProgress] = useState(0);
  const sendMove = useSocketGame(socket, roomId, ({ game, payload }) => {
    if (game === "TapTap") setProgress(payload.progress);
  });

  const handleTap = () => {
    const newProgress = Math.min(progress + 5, 100);
    setProgress(newProgress);
    sendMove("TapTap", { progress: newProgress });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg w-64 text-white">
      <div className="mb-2">Tap to Fill the Bar!</div>
      <div className="bg-gray-700 h-6 rounded">
        <div className="bg-green-500 h-6 rounded" style={{ width: `${progress}%` }} />
      </div>
      <button onClick={handleTap} className="mt-2 bg-gray-600 px-3 py-1 rounded">TAP</button>
      {progress >= 100 && <div className="mt-2 text-green-300 font-bold">Winner!</div>}
    </div>
  );
}
