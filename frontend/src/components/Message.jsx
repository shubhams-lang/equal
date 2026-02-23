import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";

export default function Message({ msg }) {
  // Destructure from the new msg object schema
  const { username: msgUser, content, type, timestamp, metadata, system } = msg;
  const { username: currentUser } = useContext(ChatContext);
  
  const isOwn = msgUser === currentUser;

  // --- 1. SYSTEM MESSAGE RENDER ---
  if (type === "system" || system) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in zoom-in duration-500">
        <div className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
          {content || msg.message}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 items-end transition-all duration-300 mb-4 ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* --- 2. AVATAR (Others only) --- */}
      {!isOwn && (
        <div className="relative w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/20">
          {msgUser?.charAt(0).toUpperCase()}
          {/* Online Indicator Glow */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0b1220] rounded-full shadow-[0_0_8px_#22c55e]" />
        </div>
      )}

      {/* --- 3. BUBBLE CONTENT --- */}
      <div
        className={`relative max-w-[75%] md:max-w-md px-1 py-1 rounded-2xl backdrop-blur-xl border transition-all ${
          isOwn
            ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white border-blue-400/30 shadow-[0_8px_25px_rgba(37,99,235,0.2)] rounded-tr-none"
            : "bg-white/5 text-slate-200 border-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.3)] rounded-tl-none"
        }`}
      >
        <div className="px-3 py-2">
          {!isOwn && (
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">
              {msgUser}
            </div>
          )}

          {/* --- MEDIA TYPE HANDLERS --- */}
          
          {/* TEXT */}
          {type === "text" && (
            <div className="text-sm leading-relaxed break-words">{content || msg.message}</div>
          )}

          {/* IMAGE / CAMERA PHOTO */}
          {type === "image" && (
            <div className="rounded-xl overflow-hidden border border-white/10 mt-1">
              <img src={content} alt="Shared" className="max-w-full h-auto block hover:scale-105 transition-transform duration-500" />
            </div>
          )}

          {/* VIDEO */}
          {type === "video" && (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black mt-1">
              <video src={content} controls className="max-w-full h-auto block" />
            </div>
          )}

          {/* VOICE MESSAGE */}
          {type === "audio" && (
            <div className={`flex items-center gap-2 py-2 px-1 min-w-[220px] ${isOwn ? "brightness-110" : ""}`}>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-lg">🎙️</span>
              </div>
              <audio src={content} controls className="h-8 w-full custom-audio-player" />
            </div>
          )}

          {/* CUSTOM STICKER */}
          {type === "sticker" && (
            <div className="w-32 h-32 py-2 animate-in zoom-in duration-300">
              <img src={content} alt="Sticker" className="w-full h-full object-contain" />
            </div>
          )}

          {/* --- TIMESTAMP --- */}
          <div className={`text-[9px] mt-1 opacity-50 font-medium ${isOwn ? "text-right text-blue-100" : "text-left text-slate-400"}`}>
             {timestamp}
          </div>
        </div>
      </div>
    </div>
  );
}