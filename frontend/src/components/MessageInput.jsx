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
  CloudArrowUpIcon,
  StarIcon 
} from "@heroicons/react/24/outline";

export default function MessageInput() {
  const { 
    sendMessage, 
    socket, 
    roomId, 
    username, 
    createCustomSticker, 
    myStickers = [], 
    favorites = [], 
    toggleFavorite,
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

  // Load recently used stickers from storage
  useEffect(() => {
    const saved = localStorage.getItem("recent_stickers");
    if (saved) setRecentStickers(JSON.parse(saved));
  }, []);

  // --- HANDLERS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && createCustomSticker) {
      createCustomSticker(file);
      e.target.value = ""; 
    }
  };

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

  const filteredDefaultStickers = useMemo(() => {
    return (STICKER_PACKS || []).flatMap(pack => pack.stickers).filter(s => 
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase())
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

  // --- MEDIA LOGIC ---
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
    <div className="relative w-full px-4 pb-4">
      {/* CAMERA OVERLAY */}
      {showCamera && (
        <div className="absolute bottom-24 left-4 right-4 bg-black rounded-3xl overflow-hidden border-2 border-blue-500 shadow-2xl z-50 max-w-sm mx-auto">
          <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
          <div className="p-4 flex justify-around bg-black/80">
            <button onClick={stopCamera} className="p-2 text-white"><XMarkIcon className="w-6 h-6"/></button>
            <button onClick={capturePhoto} className="p-4 bg-white rounded-full"><div className="w-4 h-4 bg-red-500 rounded-full"/></button>
          </div>
        </div>
      )}

      {/* STICKER TRAY (Fixed Positioning) */}
      {showStickers && (
        <div className="absolute bottom-[calc(100%+12px)] left-4 w-[320px] bg-[#1e272e] border border-white/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-visible animate-in slide-in-from-bottom-2 origin-bottom-left">
          
          {/* Header */}
          <div className="p-3 bg-black/20 flex items-center justify-between border-b border-white/5 rounded-t-3xl">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Studio</span>
              <div className="flex gap-2">
                <button onClick={backupStickers} className="text-[9px] text-blue-400 font-bold hover:underline">BACKUP</button>
                <button onClick={() => restoreInputRef.current.click()} className="text-[9px] text-green-400 font-bold hover:underline">RESTORE</button>
                <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={(e) => restoreStickers(e.target.files[0])} />
              </div>
            </div>
            <button onClick={() => fileInputRef.current.click()} className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl hover:bg-blue-500 transition-all">
              + CREATE
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          {/* Search */}
          <div className="p-2 border-b border-white/5">
            <div className="flex items-center bg-white/5 rounded-xl px-3 py-2 border border-white/5">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 mr-2" />
              <input type="text" placeholder="Search..." className="bg-transparent text-xs text-white outline-none w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {/* Sticker Content */}
          <div className="max-h-64 overflow-y-auto p-4 custom-scrollbar bg-[#1c242b]">
            {/* Favorites */}
            {favorites.length > 0 && searchTerm === "" && (
              <div className="mb-4">
                <div className="text-[9px] font-bold text-yellow-500 uppercase mb-2 flex items-center gap-1"><StarIcon className="w-3 h-3 fill-yellow-500"/> Favorites</div>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((url, i) => (
                    <button key={`fav-${i}`} onClick={() => sendSticker(url)} className="w-11 h-11 hover:scale-110 transition-transform">
                      <img src={url} className="w-full h-full object-contain" alt="fav" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-4 gap-3">
              {/* Custom Stickers */}
              {searchTerm === "" && myStickers.map((url, i) => (
                <div key={`custom-${i}`} className="group relative aspect-square">
                  <button onClick={() => sendSticker(url)} className="w-full h-full p-1 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <img src={url} className="w-full h-full object-cover rounded-md" alt="custom" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteCustomSticker(i); }} className="absolute -top-1 -right-1 hidden group-hover:flex w-5 h-5 bg-red-500 rounded-full text-[10px] items-center justify-center text-white shadow-lg">✕</button>
                </div>
              ))}

              {/* Default Library */}
              {filteredDefaultStickers.map((s) => (
                <div key={s.id} className="group relative aspect-square">
                  <button onClick={() => sendSticker(s.url)} className="w-full h-full hover:scale-110 transition-transform flex items-center justify-center">
                    <img src={s.url} alt={s.name} className="w-full h-full object-contain" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(s.url); }}
                    className={`absolute -top-1 -right-1 p-1 transition-opacity ${favorites.includes(s.url) ? 'opacity-100 text-yellow-500' : 'opacity-0 group-hover:opacity-100 text-white/40'}`}
                  >
                    <StarIcon className={`w-4 h-4 ${favorites.includes(s.url) ? 'fill-yellow-500' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pointer Triangle */}
          <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-[#1c242b] rotate-45 border-r border-b border-white/10"></div>
        </div>
      )}

      {/* INPUT BAR */}
      <form onSubmit={handleSendText} className="flex items-center gap-2 bg-[#202c33] p-2 rounded-2xl border border-white/5 shadow-xl">
        <button 
          type="button" 
          onClick={() => setShowStickers(!showStickers)} 
          className={`p-2 rounded-full transition-all ${showStickers ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-white'}`}
        >
          <FaceSmileIcon className="w-6 h-6"/>
        </button>
        
        <button type="button" onClick={startCamera} className="p-2 text-slate-400 hover:text-white transition-colors">
          <CameraIcon className="w-6 h-6" />
        </button>
        
        <input 
          type="text" 
          value={text} 
          onChange={handleInputChange} 
          placeholder={isRecording ? "Recording audio..." : "Type a message"} 
          className="flex-1 bg-transparent outline-none text-sm text-white px-2 placeholder:text-slate-500" 
          disabled={isRecording}
        />
        
        {text.trim() ? (
          <button type="submit" className="p-3 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20">
            <PaperAirplaneIcon className="w-5 h-5"/>
          </button>
        ) : (
          <button 
            type="button" 
            onMouseDown={startRecording} 
            onMouseUp={() => mediaRecorder.current?.stop()} 
            onTouchStart={startRecording} 
            onTouchEnd={() => mediaRecorder.current?.stop()} 
            className={`p-3 rounded-xl transition-all ${isRecording ? "bg-red-500 animate-pulse shadow-lg shadow-red-900/40" : "bg-white/5 text-slate-400 hover:text-white"}`}
          >
            {isRecording ? <StopIcon className="w-5 h-5 text-white" /> : <MicrophoneIcon className="w-5 h-5" />}
          </button>
        )}
      </form>
    </div>
  );
}