import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export default function Message({ msg }) {
  const { username: msgUser, type, timestamp, system } = msg;
  const content = msg.content || msg.message;
  const { username: currentUser } = useContext(ChatContext);
  const isOwn = msgUser === currentUser;

  // Helper to trigger file downloads for shared media
  const downloadMedia = (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || `media_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- SYSTEM MESSAGE RENDER ---
  if (type === "system" || system) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in zoom-in duration-500">
        <div className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 items-end mb-4 transition-all duration-300 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      
      {!isOwn && (
        <div className="relative w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/20 border border-white/10">
          {msgUser ? msgUser.split(' ').pop().charAt(0).toUpperCase() : "?"}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0b1220] rounded-full shadow-[0_0_8px_#22c55e]" />
        </div>
      )}

      <div className={`relative max-w-[75%] md:max-w-md rounded-2xl backdrop-blur-xl border transition-all ${
          isOwn
            ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white border-blue-400/30 shadow-[0_8px_25px_rgba(37,99,235,0.2)] rounded-tr-none"
            : "bg-white/5 text-slate-200 border-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.3)] rounded-tl-none"
        }`}>
        
        <div className="px-3 py-2">
          {!isOwn && (
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 flex justify-between items-center">
              <span>{msgUser}</span>
            </div>
          )}

          {/* --- MEDIA TYPE HANDLERS --- */}
          
          {/* TEXT */}
          {(type === "text" || !type) && (
            <div className="text-sm leading-relaxed break-words">{content}</div>
          )}

          {/* IMAGE / GALLERY PHOTO */}
          {type === "image" && (
            <div className="group relative rounded-xl overflow-hidden border border-white/10 mt-1 bg-black/20">
              <img 
                src={content} 
                alt="Shared" 
                className="max-w-full h-auto block hover:scale-105 transition-transform duration-500"
              />
              <button 
                onClick={() => downloadMedia(content, `img_${timestamp}.jpg`)}
                className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ArrowDownTrayIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* VIDEO (NEW) */}
          {type === "video" && (
            <div className="group relative rounded-xl overflow-hidden border border-white/10 mt-1 bg-black/20 max-w-[280px]">
              <video 
                src={content} 
                controls 
                className="w-full h-auto block"
              />
              <button 
                onClick={() => downloadMedia(content, `vid_${timestamp}.mp4`)}
                className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ArrowDownTrayIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* CUSTOM STICKER */}
          {type === "sticker" && (
            <div className="w-32 h-32 py-1 animate-in zoom-in duration-300">
              <img src={content} alt="Sticker" className="w-full h-full object-contain" />
            </div>
          )}

          {/* VOICE MESSAGE */}
          {type === "audio" && (
            <div className={`flex items-center gap-2 py-1 min-w-[200px] ${isOwn ? "brightness-125" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-sm">🎙️</span>
              </div>
              <audio src={content} controls className="h-8 w-full scale-90 origin-left" />
            </div>
          )}

          <div className={`text-[8px] mt-1 opacity-40 font-bold uppercase tracking-tighter ${isOwn ? "text-right" : "text-left"}`}>
             {timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}