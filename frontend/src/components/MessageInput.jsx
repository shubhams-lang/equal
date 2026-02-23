import React, { useState, useRef, useContext } from "react";
import { ChatContext } from "../context/ChatContext";
import { STICKER_PACKS } from "../constants/stickers";
import { 
  PaperAirplaneIcon, 
  FaceSmileIcon, 
  CameraIcon, 
  MicrophoneIcon, 
  StopIcon,
  XMarkIcon,
  PlusIcon 
} from "@heroicons/react/24/outline";

export default function MessageInput() {
  const { 
    sendMessage, 
    socket, 
    roomId, 
    username, 
    createCustomSticker, 
    myStickers,
    deleteCustomSticker 
  } = useContext(ChatContext);
  
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const fileInputRef = useRef(null);

  // --- 1. TYPING & TEXT LOGIC ---
  const handleInputChange = (e) => {
    setText(e.target.value);
    if (socket && roomId) {
      socket.emit("typing", { roomId, username: e.target.value ? username : null });
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage({ type: "text", content: text });
    setText("");
    socket.emit("typing", { roomId, username: null });
  };

  // --- 2. STICKER LOGIC ---
  const sendSticker = (url) => {
    sendMessage({ type: "sticker", content: url });
    setShowStickers(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      createCustomSticker(file);
      e.target.value = ""; // Reset for next upload
    }
  };

  // --- 3. CAMERA LOGIC ---
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7); // Compression applied
    
    sendMessage({ type: "image", content: dataUrl });
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  // --- 4. AUDIO LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          sendMessage({ type: "audio", content: reader.result });
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone access denied"); }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="relative w-full">
      
      {/* CAMERA OVERLAY */}
      {showCamera && (
        <div className="absolute bottom-20 left-0 w-full max-w-sm bg-black rounded-3xl overflow-hidden border-2 border-blue-500 shadow-2xl z-50">
          <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
          <div className="p-4 flex justify-around bg-black/80">
            <button onClick={stopCamera} className="p-2 bg-white/10 rounded-full text-white"><XMarkIcon className="w-6 h-6" /></button>
            <button onClick={capturePhoto} className="p-4 bg-white rounded-full"><div className="w-4 h-4 bg-red-500 rounded-full" /></button>
          </div>
        </div>
      )}

      {/* STICKER TRAY */}
      {showStickers && (
        <div className="absolute bottom-20 left-0 w-full max-w-xs bg-[#1e272e] border border-white/10 rounded-3xl shadow-2xl z-50 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sticker Pack</span>
            <button 
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-1 text-[9px] font-black bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
            >
              <PlusIcon className="w-3 h-3" /> UPLOAD
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          <div className="grid grid-cols-4 gap-3 p-4 max-h-60 overflow-y-auto custom-scrollbar">
            {/* Custom User Stickers */}
            {myStickers.map((url, index) => (
              <div key={`custom-${index}`} className="group relative">
                <button onClick={() => sendSticker(url)} className="hover:scale-110 transition-transform bg-white/5 rounded-lg p-1">
                  <img src={url} alt="custom" className="w-full h-auto rounded-md" />
                </button>
                <button 
                  onClick={() => deleteCustomSticker(index)}
                  className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 bg-red-500 rounded-full items-center justify-center text-[8px] text-white"
                >✕</button>
              </div>
            ))}

            {/* Default Stickers */}
            {STICKER_PACKS.flatMap(pack => pack.stickers).map((sticker) => (
              <button key={sticker.id} onClick={() => sendSticker(sticker.url)} className="hover:scale-110 transition-transform">
                <img src={sticker.url} alt="sticker" className="w-full h-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN INPUT BAR */}
      <form onSubmit={handleSendText} className="flex items-center gap-2 bg-[#202c33] p-2 rounded-2xl border border-white/5">
        <button type="button" onClick={() => setShowStickers(!showStickers)} className="p-2 text-slate-400 hover:text-white transition-colors">
          <FaceSmileIcon className="w-6 h-6" />
        </button>

        <button type="button" onClick={startCamera} className="p-2 text-slate-400 hover:text-white transition-colors">
          <CameraIcon className="w-6 h-6" />
        </button>

        <input
          type="text"
          value={text}
          onChange={handleInputChange}
          placeholder={isRecording ? "Recording voice..." : "Type a message..."}
          disabled={isRecording}
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600 px-2"
        />

        {text.trim() ? (
          <button type="submit" className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        ) : (
          <button 
            type="button" 
            onMouseDown={startRecording} 
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-3 rounded-xl transition-all ${isRecording ? "bg-red-500 animate-pulse" : "bg-white/5 text-slate-400"}`}
          >
            {isRecording ? <StopIcon className="w-5 h-5 text-white" /> : <MicrophoneIcon className="w-5 h-5" />}
          </button>
        )}
      </form>
    </div>
  );
}