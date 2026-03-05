import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatProvider } from "./context/ChatContext";
import { HelmetProvider } from "react-helmet-async";
import "./styles/tailwind.css";

/* -----------------------------
   STRICT REFRESH RESET
   This runs BEFORE React starts.
-------------------------------- */
const resetSession = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isInvite = urlParams.has("join");

  // If the user refreshed without an invite link, nuke everything.
  // This ensures they always land on the "Landing" view.
  if (!isInvite) {
    localStorage.clear();
    sessionStorage.clear();
    console.log("Session reset: Storage cleared on refresh.");
  }
};

resetSession();

/* -----------------------------
   Error Boundary (Production Safety)
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
    if (window.gtag) {
      window.gtag("event", "exception", {
        description: error.toString(),
        fatal: true
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0b141a] text-white text-center p-6">
          <div className="max-w-md">
            <h1 className="text-4xl font-black mb-4 text-red-500 italic">SYSTEM HALT</h1>
            <p className="text-sm opacity-70 mb-8 uppercase tracking-widest">
              A critical synchronization error occurred.
            </p>
            <button 
              onClick={() => window.location.href = window.location.origin}
              className="bg-[#25D366] text-black px-8 py-3 rounded-2xl font-black"
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
   Service Worker (PWA Support)
-------------------------------- */
function registerServiceWorker() {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => console.log("SW registered"))
        .catch((err) => console.log("SW failed", err));
    });
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root container missing");

const root = ReactDOM.createRoot(rootElement);

root.render(
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

registerServiceWorker();