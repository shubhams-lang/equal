import Message from "./Message";
import MessageInput from "./MessageInput";
import { useContext } from "react";
import { ChatContext } from "../context/ChatContext";


{typingUser && (
  <div className="px-6 py-2 text-sm text-slate-400">
    {typingUser} is typing...
  </div>
)}

export default function Chat() {
  const { messages } = useContext(ChatContext);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <Message key={i} {...msg} />
        ))}
      </div>
      <MessageInput />
    </div>
  );
}
const bottomRef = useRef();

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
<div ref={bottomRef} />
