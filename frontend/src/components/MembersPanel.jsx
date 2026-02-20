import { useContext } from "react";
import { ChatContext } from "../context/ChatContext";

export default function MembersPanel() {
  const { members } = useContext(ChatContext);

  return (
    <div className="w-56 bg-slate-900 border-l border-slate-800 p-4">
      <h3 className="text-sm text-slate-400 mb-3">
        Online — {members.length}
      </h3>

      <div className="space-y-2">
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span>{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
