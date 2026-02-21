import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../context/ChatContext";

const JoinModal = () => {
  const [inputRoomId, setInputRoomId] = useState("");
  const { createRoom } = useContext(ChatContext);
  const navigate = useNavigate();

  const handleCreate = () => {
    const newRoomId = createRoom(); // Generates unique UUID
    navigate(`/room/${newRoomId}`); // Moves user to unique URL
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (inputRoomId.trim()) {
      navigate(`/room/${inputRoomId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900 text-white rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-6">Start Chatting</h2>
      
      <button 
        onClick={handleCreate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mb-4 transition"
      >
        Create New Private Room
      </button>

      <div className="w-full flex items-center mb-4">
        <div className="flex-grow h-px bg-gray-700"></div>
        <span className="px-3 text-gray-500 text-sm">OR</span>
        <div className="flex-grow h-px bg-gray-700"></div>
      </div>

      <form onSubmit={handleJoin} className="w-full">
        <input 
          type="text" 
          placeholder="Enter Room ID to Join" 
          value={inputRoomId}
          onChange={(e) => setInputRoomId(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg mb-3 focus:outline-none focus:border-blue-500"
        />
        <button 
          type="submit"
          className="w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition"
        >
          Join Existing Room
        </button>
      </form>
    </div>
  );
};

export default JoinModal;