import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatProvider } from "./context/ChatContext";
import { HelmetProvider } from "react-helmet-async";
import "./styles/tailwind.css";

/* -----------------------------
   STRICT REFRESH RESET
-------------------------------- */
const resetSession = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isInvite = urlParams.has("join");

  if (!isInvite) {
    localStorage.clear();
    sessionStorage.clear();
    console.log("Session reset: Storage cleared on refresh.");
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
            <h1 className="text-4xl font-black mb-4 text-red-500 italic">
              SYSTEM HALT
            </h1>

            <p className="text-sm opacity-70 mb-8 uppercase tracking-widest">
              A critical synchronization error occurred.
            </p>

            <button
              onClick={() => (window.location.href = window.location.origin)}
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
   Service Worker (PWA)
-------------------------------- */
function registerServiceWorker() {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {

    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("/service-worker.js");

        console.log("Service Worker registered:", reg);

        /* Detect new updates */
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("New version available.");
            }
          });
        });

      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    });

    /* Reload page when SW updates */
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("New Service Worker activated");
      window.location.reload();
    });

    /* Detect when PWA installed */
    window.addEventListener("appinstalled", () => {
      console.log("PWA successfully installed");
    });

  }
}

/* -----------------------------
   React Root
-------------------------------- */
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root container missing");
}

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