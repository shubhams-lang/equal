import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatProvider } from "./context/ChatContext";
import { HelmetProvider } from "react-helmet-async";
import "./styles/tailwind.css";

/* -----------------------------
   STRICT REFRESH RESET
   Moved inside a check to ensure it only runs once
-------------------------------- */
const resetSession = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isInvite = urlParams.has("join");

  // Only clear if we aren't in the middle of a room join or already active
  if (!isInvite && !sessionStorage.getItem("app_initialized")) {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("app_initialized", "true");
    console.log("Session reset: Storage cleared on fresh boot.");
  }
};

resetSession();

/* -----------------------------
   Error Boundary
-------------------------------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App Crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0b141a] text-white text-center p-6">
          <div className="max-w-md">
            <h1 className="text-4xl font-black mb-4 text-red-500 italic uppercase">
              System Halt
            </h1>
            <p className="text-sm opacity-70 mb-8 uppercase tracking-widest">
              A critical synchronization error occurred.
            </p>
            <button
              onClick={() => (window.location.href = window.location.origin)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* -----------------------------
   React Root
-------------------------------- */
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root container missing");

const root = ReactDOM.createRoot(rootElement);

root.render(
  // NOTE: If buttons still don't work, temporarily remove <React.StrictMode> 
  // to prevent double-socket initialization in development.
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <ChatProvider>
          <App />
        </ChatProvider>
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);

/* -----------------------------
   Service Worker (PWA)
-------------------------------- */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(console.error);
  });
}