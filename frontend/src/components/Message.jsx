import React, { useContext, useState } from "react";
import { ChatContext } from "../context/ChatContext";
import { 
  ArrowDownTrayIcon, 
  CheckIcon, 
  FaceSmileIcon 
} from "@heroicons/react/24/outline";

export default function Message({ msg }) {
  const { 
    id, 
    username: msgUser, 
    type, 
    timestamp, 
    system, 
    reactions = [] 
  } = msg;
  
  // Normalizing content field names
  const content = msg.content || msg.message;
  const { username: currentUser, handleReaction } = useContext(ChatContext);
  const isOwn = msgUser === currentUser;

  const [showPicker, setShowPicker] = useState(false);
  const emojis = ["👍", "❤️", "😂", "😮", "🔥", "🚀"];

  // Helper to trigger file downloads
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
      <div className="flex justify-center my-8 animate-in fade-in zoom-in duration-700">
        <div className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/60 bg-blue-500/5 backdrop-blur-xl rounded-full border border-blue-500/10 shadow-xl shadow-blue-500/5">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group flex gap-4 items-end mb-8 relative transition-all duration-500 ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}
      onMouseEnter={() => setShowPicker(true)}
      onMouseLeave={() => setShowPicker(false)}
    >
      {/* AVATAR (Left side for others) */}
      {!isOwn && (
        <div className="relative w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-tr from-[#1e293b] to-[#334155] flex items-center justify-center text-sm font-black text-blue-400 border border-white/5 shadow-2xl transform transition-transform group-hover:scale-105 group-hover:border-blue-500/30">
          {msgUser ? msgUser.charAt(0).toUpperCase() : "?"}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-[3px] border-[#0b141a] rounded-full shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
        </div>
      )}

      {/* MESSAGE CONTENT CONTAINER */}
      <div className={`relative max-w-[85%] md:max-w-md ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        
        {/* REACTION PICKER (Floating Popup) */}
        {showPicker && (
          <div 
            className={`absolute -top-12 z-50 flex gap-1.5 p-1.5 bg-[#1c2733]/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-3 duration-300 ${
              isOwn ? "right-0" : "left-0"
            }`}
          >
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  handleReaction(id, emoji);
                  setShowPicker(false);
                }}
                className="hover:bg-white/10 p-2 rounded-full transition-all hover:scale-125 active:scale-90 text-xl"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* SENDER NAME */}
        {!isOwn && (
          <span className="text-[10px] font-black text-slate-500 ml-3 mb-1.5 block uppercase tracking-[0.15em]">
            {msgUser}
          </span>
        )}

        {/* BUBBLE BODY */}
        <div className={`relative group/bubble overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
          isOwn
            ? "bg-gradient-to-br from-blue-600/90 to-indigo-700/90 text-white border-blue-400/20 rounded-tr-none shadow-[0_15px_35px_-10px_rgba(37,99,235,0.3)] hover:shadow-[0_20px_45px_-10px_rgba(37,99,235,0.4)]"
            : "bg-[#202c33]/80 text-slate-100 border-white/10 rounded-tl-none shadow-[0_15px_35px_-10px_rgba(0,0,0,0.4)] hover:border-white/20"
        }`}>
          
          <div className="px-4 py-3">
            {/* TEXT CONTENT */}
            {(type === "text" || !type) && (
              <p className="text-[15px] leading-relaxed break-words font-medium tracking-tight">
                {content}
              </p>
            )}

            {/* IMAGE ATTACHMENT */}
            {type === "image" && (
              <div className="group/img relative rounded-xl overflow-hidden border border-white/10 bg-black/20 mb-1">
                <img 
                  src={content} 
                  alt="Shared" 
                  className="max-w-full h-auto block transition-transform duration-1000 group-hover/img:scale-110" 
                />
                <button 
                  onClick={() => downloadMedia(content, `img_${timestamp}.jpg`)}
                  className="absolute top-3 right-3 p-2.5 bg-black/60 backdrop-blur-xl rounded-xl opacity-0 group-hover/img:opacity-100 transition-all hover:bg-blue-600 scale-90 group-hover/img:scale-100"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* VIDEO ATTACHMENT */}
            {type === "video" && (
              <div className="group/vid relative rounded-xl overflow-hidden border border-white/10 bg-black/20 mb-1 aspect-video shadow-inner">
                <video src={content} controls className="w-full h-full object-cover" />
                <button 
                  onClick={() => downloadMedia(content, `vid_${timestamp}.mp4`)}
                  className="absolute top-3 right-3 p-2.5 bg-black/60 backdrop-blur-xl rounded-xl opacity-0 group-hover/vid:opacity-100 transition-all z-10 hover:bg-blue-600"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* CUSTOM STICKER */}
            {type === "sticker" && (
              <div className="w-36 h-36 p-2 animate-in zoom-in-50 duration-500 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                <img src={content} alt="Sticker" className="w-full h-full object-contain transform group-hover/bubble:scale-110 transition-transform" />
              </div>
            )}

            {/* VOICE NOTE */}
            {type === "audio" && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-black/30 min-w-[260px] border border-white/5 my-1">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/30 shadow-lg">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                </div>
                <audio src={content} controls className="h-8 w-full brightness-110 contrast-125" />
              </div>
            )}

            {/* METADATA (Time & Receipt) */}
            <div className={`flex items-center gap-1.5 mt-2 opacity-50 justify-end`}>
                <span className="text-[9px] font-black tracking-widest uppercase">
                  {timestamp}
                </span>
                {isOwn && <CheckIcon className="w-3.5 h-3.5 text-blue-300" />}
            </div>
          </div>
        </div>

        {/* REACTIONS DISPLAY */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 mt-2 ${isOwn ? "justify-end" : "justify-start"}`}>
            {reactions.map((r, idx) => {
              const hasReacted = r.users?.includes(currentUser);
              return (
                <button
                  key={idx}
                  onClick={() => handleReaction(id, r.emoji)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] border transition-all active:scale-90 shadow-lg ${
                    hasReacted
                      ? "bg-blue-500/30 border-blue-400/50 text-blue-100"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <span className="text-sm">{r.emoji}</span>
                  <span className="font-black text-xs">{r.count}</span>
                </button>
              );
            })}
            
            {/* Mobile Add-Reaction Quick Access */}
            <button 
              onClick={() => setShowPicker(!showPicker)}
              className="md:hidden flex items-center px-2 py-1 bg-white/5 border border-white/10 rounded-full text-slate-500 active:bg-blue-500/20 active:text-blue-400"
            >
              <FaceSmileIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}