import React from "react";

export default function Message({ username, message, system }) {
  if (system) {
    return (
      <div className="text-center text-sm text-slate-400">
        {message || username}
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
        {username?.charAt(0).toUpperCase()}
      </div>

      <div>
        <div className="font-semibold text-sm">{username}</div>
        <div className="text-slate-300">{message}</div>
      </div>
    </div>
  );
}
