import React, { useState, useRef, useContext, useMemo, useEffect } from "react";
import { ChatContext } from "../context/ChatContext";
import { STICKER_PACKS } from "../constants/stickers";
import { 
  PaperAirplaneIcon, 
  FaceSmileIcon, 
  CameraIcon, 
  MicrophoneIcon, 
  StopIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon
} from "@heroicons/react/24/outline";

export default function MessageInput() {
  const { 
    sendMessage, 
    socket, 
    roomId, 
    username, 
    createCustomSticker, 
    myStickers,
    deleteCustomSticker,
    backupStickers,
    restoreStickers
  } = useContext(ChatContext);
  
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [recentStickers, setRecentStickers] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const fileInputRef = useRef(null);
  const restoreInputRef = useRef(null);

  // Load recently used from storage
  useEffect(() => {
    const saved = localStorage.getItem("recent_stickers");
    if (saved) setRecentStickers(JSON.parse(saved));
  }, []);

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

  // --- 2. STICKER LOGIC (WITH SEARCH & RECENT) ---
  const filteredDefaultStickers = useMemo(() => {
    return STICKER_PACKS.flatMap(pack => pack.stickers).filter(s => 
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.id || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const sendSticker = (url) => {
    sendMessage({ type: "sticker", content: url });
    setRecentStickers(prev => {
      const updated = [url, ...prev.filter(u => u !== url)].slice(0, 8);
      localStorage.setItem("recent_stickers", JSON.stringify(updated));
      return updated;
    });
    setShowStickers(false);
    setSearchTerm("");
  };

  // --- 3. CAMERA & AUDIO LOGIC ---
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { setShowCamera(false); alert("Camera access denied"); }
  };

  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    sendMessage({ type: "image", content: canvas.toDataURL("image/jpeg", 0.7) });
    stopCamera();
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const reader = new FileReader();
        reader.readAsDataURL(new Blob(audioChunks.current, { type: "audio/webm" }));
        reader.onloadend = () => sendMessage({ type: "audio", content: reader.result });
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone access denied"); }
  };

  return (
    <div className="relative w-full">
      {/* CAMERA OVERLAY */}
      {showCamera && (
        <div className="absolute bottom-20 left-0 w-full max-w-sm bg-black rounded-3xl overflow-hidden border-2 border-blue-500 shadow-2xl z-50">
          <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
          <div className="p-4 flex justify-around bg-black/80">
            <button onClick={stopCamera} className="p-2 text-white"><XMarkIcon className="w-6 h-6"/></button>
            <button onClick={capturePhoto} className="p-4 bg-white rounded-full"><div className="w-4 h-4 bg-red-500 rounded-full"/></button>
          </div>
        </div>
      )}

      {/* STICKER TRAY (UPGRADED) */}
      {showStickers && (
        <div className="absolute bottom-20 left-0 w-full max-w-xs bg-[#1e272e] border border-white/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden">
          <div className="p-3 bg-black/20 flex items-center justify-between border-b border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-500 uppercase">Stickers</span>
              <div className="flex gap-2">
                <button onClick={backupStickers} className="text-[8px] text-blue-400 font-bold"><CloudArrowDownIcon className="w-3 h-3 inline"/> BACKUP</button>
                <button onClick={() => restoreInputRef.current.click()} className="text-[8px] text-green-400 font-bold"><CloudArrowUpIcon className="w-3 h-3 inline"/> RESTORE</button>
                <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={(e) => restoreStickers(e.target.files[0])} />
              </div>
            </div>
            <button onClick={() => fileInputRef.current.click()} className="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-lg hover:bg-blue-500 transition-all">
              <PlusIcon className="w-3 h-3 inline" /> CREATE
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="p-2 border-b border-white/5">
            <div className="flex items-center bg-white/5 rounded-xl px-2 py-1.5 border border-white/5">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 mr-2" />
              <input type="text" placeholder="Search..." className="bg-transparent text-xs text-white outline-none w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-4 custom-scrollbar">
            {recentStickers.length > 0 && searchTerm === "" && (
              <div className="mb-4">
                <div className="text-[9px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><ClockIcon className="w-3 h-3"/> Recent</div>
                <div className="flex flex-wrap gap-2">
                  {recentStickers.map((u, i) => (
                    <button key={i} onClick={() => sendSticker(u)} className="w-10 h-10 hover:scale-110 transition-transform">
                      <img src={u} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-3">
              {searchTerm === "" && myStickers.map((url, i) => (
                <div key={i} className="group relative aspect-square">
                  <button onClick={() => sendSticker(url)} className="w-full h-full p-1 bg-white/5 rounded-lg"><img src={url} className="w-full h-full object-cover rounded-md" /></button>
                  <button onClick={() => deleteCustomSticker(i)} className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 bg-red-500 rounded-full text-[8px] items-center justify-center text-white">✕</button>
                </div>
              ))}
              {filteredDefaultStickers.map((s) => (
                <button key={s.id} onClick={() => sendSticker(s.url)} className="hover:scale-110 transition-transform"><img src={s.url} className="w-full h-auto" /></button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INPUT BAR */}
      <form onSubmit={handleSendText} className="flex items-center gap-2 bg-[#202c33] p-2 rounded-2xl border border-white/5 shadow-xl">
        <button type="button" onClick={() => setShowStickers(!showStickers)} className={`p-2 transition-colors ${showStickers ? 'text-blue-500' : 'text-slate-400'}`}><FaceSmileIcon className="w-6 h-6"/></button>
        <button type="button" onClick={startCamera} className="p-2 text-slate-400 hover:text-white transition-colors"><CameraIcon className="w-6 h-6" /></button>
        <input type="text" value={text} onChange={handleInputChange} placeholder={isRecording ? "Recording..." : "Message"} className="flex-1 bg-transparent outline-none text-sm text-white px-2" disabled={isRecording}/>
        {text.trim() ? (
          <button type="submit" className="p-3 bg-blue-600 rounded-xl text-white"><PaperAirplaneIcon className="w-5 h-5"/></button>
        ) : (
          <button type="button" onMouseDown={startRecording} onMouseUp={() => mediaRecorder.current?.stop() || setIsRecording(false)} onTouchStart={startRecording} onTouchEnd={() => mediaRecorder.current?.stop() || setIsRecording(false)} className={`p-3 rounded-xl transition-all ${isRecording ? "bg-red-500 animate-pulse" : "bg-white/5 text-slate-400"}`}>
            {isRecording ? <StopIcon className="w-5 h-5 text-white" /> : <MicrophoneIcon className="w-5 h-5" />}
          </button>
        )}
      </form>
    </div>
  );
}