import React, { useContext, useState, useEffect } from "react";
import { ChatContext } from "../context/ChatContext";
import { 
  ArrowDownTrayIcon, 
  CheckIcon, 
  FaceSmileIcon 
} from "@heroicons/react/24/outline";

export default function Message({ msg, onReact }) {
  const { 
    id, 
    username: msgUser, 
    type, 
    timestamp, 
    system, 
    reactions = [] 
  } = msg;
  
  const content = msg.content || msg.message;
  const { username: currentUser } = useContext(ChatContext);
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
      <div className="flex justify-center my-6 animate-in fade-in zoom-in duration-500">
        <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 bg-slate-900/40 backdrop-blur-md rounded-full border border-white/5 shadow-inner">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group flex gap-3 items-end mb-6 relative transition-all duration-300 ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}
      onMouseEnter={() => !window.matchMedia("(pointer: coarse)").matches && setShowPicker(true)}
      onMouseLeave={() => setShowPicker(false)}
    >
      {/* AVATAR (Hidden for own messages to save space) */}
      {!isOwn && (
        <div className="relative w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-sm font-black text-white shadow-lg border border-white/10 transform transition-transform group-hover:scale-110">
          {msgUser ? msgUser.charAt(0).toUpperCase() : "?"}
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-4 border-[#0b1220] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
        </div>
      )}

      {/* MESSAGE CONTENT CONTAINER */}
      <div className="relative max-w-[80%] md:max-w-md">
        
        {/* REACTION PICKER (Floating Menu) */}
        {showPicker && (
          <div 
            className={`absolute -top-12 z-30 flex gap-1 p-1 bg-[#1c2733] backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-in slide-in-from-bottom-2 duration-200 ${
              isOwn ? "right-0" : "left-0"
            }`}
          >
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(id, emoji);
                  setShowPicker(false);
                }}
                className="hover:bg-white/10 p-2 rounded-full transition-transform hover:scale-125 active:scale-90 text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* SENDER NAME */}
        {!isOwn && (
          <span className="text-[10px] font-bold text-blue-400/80 ml-2 mb-1 block uppercase tracking-wider">
            {msgUser}
          </span>
        )}

        {/* BUBBLE BODY */}
        <div className={`relative p-1 rounded-2xl border backdrop-blur-md shadow-2xl transition-all ${
          isOwn
            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-400/20 rounded-tr-none shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]"
            : "bg-[#202c33]/90 text-slate-100 border-white/5 rounded-tl-none shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]"
        }`}>
          
          <div className="px-3 py-2">
            {/* TEXT */}
            {(type === "text" || !type) && (
              <p className="text-[14.5px] leading-relaxed break-words font-medium">
                {content}
              </p>
            )}

            {/* IMAGE */}
            {type === "image" && (
              <div className="group/img relative rounded-xl overflow-hidden border border-white/10 bg-black/40 mt-1">
                <img 
                  src={content} 
                  alt="Shared" 
                  className="max-w-full h-auto block transition-transform duration-700 group-hover/img:scale-105" 
                />
                <button 
                  onClick={() => downloadMedia(content, `img_${timestamp}.jpg`)}
                  className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-xl rounded-xl opacity-0 group-hover/img:opacity-100 transition-all hover:bg-blue-600"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* VIDEO */}
            {type === "video" && (
              <div className="group/vid relative rounded-xl overflow-hidden border border-white/10 bg-black/40 mt-1 aspect-video">
                <video src={content} controls className="w-full h-full object-cover" />
                <button 
                  onClick={() => downloadMedia(content, `vid_${timestamp}.mp4`)}
                  className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-xl rounded-xl opacity-0 group-hover/vid:opacity-100 transition-all z-10"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* STICKER */}
            {type === "sticker" && (
              <div className="w-32 h-32 p-1 animate-in zoom-in spin-in-3 duration-500">
                <img src={content} alt="Sticker" className="w-full h-full object-contain drop-shadow-2xl" />
              </div>
            )}

            {/* AUDIO */}
            {type === "audio" && (
              <div className={`flex items-center gap-3 p-2 rounded-xl bg-black/20 min-w-[240px] mt-1`}>
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <span className="animate-pulse">🎙️</span>
                </div>
                <audio src={content} controls className="h-8 w-full brightness-90 contrast-125 rounded-full" />
              </div>
            )}

            {/* TIMESTAMP & READ RECEIPT */}
            <div className={`flex items-center gap-1 mt-1.5 opacity-40 justify-end`}>
                <span className="text-[9px] font-bold">
                  {timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isOwn && <CheckIcon className="w-3 h-3 text-blue-200" />}
            </div>
          </div>
        </div>

        {/* REACTIONS DISPLAY (Small pills below bubble) */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
            {reactions.map((r, idx) => (
              <button
                key={idx}
                onClick={() => onReact(id, r.emoji)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border transition-all active:scale-90 ${
                  r.users?.includes(currentUser)
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-200"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-bold">{r.count}</span>
              </button>
            ))}
            {/* Mobile-friendly Add Reaction button */}
            <button 
              onClick={() => setShowPicker(!showPicker)}
              className="md:hidden flex items-center px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-slate-400"
            >
              <FaceSmileIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}