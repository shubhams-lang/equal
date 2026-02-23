import React, { useState, useContext, useRef } from "react";
import { ChatContext } from "../context/ChatContext";
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  MicrophoneIcon, 
  FaceSmileIcon, 
  CameraIcon,
  StopIcon 
} from "@heroicons/react/24/outline";

export default function MessageInput() {
  const { sendMessage, handleTyping, createCustomSticker, myStickers } = useContext(ChatContext);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- Send Logic ---
  const handleSendText = (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text, "text");
    setText("");
  };

  // --- Media Processing (Images/Videos/Camera) ---
  const handleFileChange = (e, isSticker = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      if (isSticker) {
        createCustomSticker(file);
      } else {
        const type = file.type.startsWith("video") ? "video" : "image";
        sendMessage(base64, type);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Voice Message Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => sendMessage(reader.result, "audio");
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access is required for voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="relative space-y-3">
      
      {/* Sticker Tray */}
      {showStickers && (
        <div className="absolute bottom-full mb-4 left-0 w-72 bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400">Custom Stickers</span>
            <label className="cursor-pointer text-[10px] bg-blue-500/20 text-blue-400 border border-blue-400/30 px-2 py-1 rounded hover:bg-blue-500 hover:text-white transition">
              NEW +
              <input type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, true)} />
            </label>
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {myStickers?.map((src, i) => (
              <img 
                key={i} 
                src={src} 
                onClick={() => { sendMessage(src, "sticker"); setShowStickers(false); }}
                className="w-full h-12 object-cover rounded-lg cursor-pointer hover:scale-110 transition border border-white/5"
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Attachment Icons */}
        <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1 border border-white/10">
          <button type="button" onClick={() => setShowStickers(!showStickers)} className="p-2 text-slate-400 hover:text-white transition"><FaceSmileIcon className="w-5 h-5" /></button>
          <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-slate-400 hover:text-white transition"><PhotoIcon className="w-5 h-5" /></button>
          <button type="button" onClick={() => cameraInputRef.current.click()} className="p-2 text-slate-400 hover:text-white transition"><CameraIcon className="w-5 h-5" /></button>
        </div>

        {/* Hidden Inputs */}
        <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={handleFileChange} />
        <input type="file" hidden ref={cameraInputRef} accept="image/*" capture="user" onChange={handleFileChange} />

        {/* Main Input Wrapper */}
        <div className={`flex-1 flex items-center px-4 py-3 rounded-2xl transition-all backdrop-blur-xl border ${
          focused ? "bg-white/10 border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "bg-white/5 border-white/10"
        }`}>
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && handleSendText()}
            placeholder={isRecording ? "Recording voice note..." : "Type message..."}
            disabled={isRecording}
            className="flex-1 bg-transparent outline-none text-sm placeholder-slate-500"
          />
        </div>

        {/* Voice / Send Action */}
        {!text.trim() ? (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-2xl transition-all ${isRecording ? "bg-red-500 animate-pulse" : "bg-white/5 text-slate-400 hover:text-white border border-white/10"}`}
          >
            {isRecording ? <StopIcon className="w-5 h-5 text-white" /> : <MicrophoneIcon className="w-5 h-5" />}
          </button>
        ) : (
          <button
            onClick={handleSendText}
            className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-blue-500/30"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}