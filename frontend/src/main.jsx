import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatProvider } from "./context/ChatContext";
import { HelmetProvider } from "react-helmet-async";
import "./styles/tailwind.css";

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

    // Optional: send errors to analytics / logging service
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
        <div className="flex items-center justify-center min-h-screen bg-black text-white text-center p-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm opacity-70">
              Please refresh the page to reconnect.
            </p>
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
        .then((reg) => {
          console.log("Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.log("Service Worker failed:", err);
        });
    });
  }
}

/* -----------------------------
   Performance Monitoring
-------------------------------- */
function reportWebVitals() {
  if (import.meta.env.PROD && window.performance) {
    const perf = performance.getEntriesByType("navigation")[0];

    console.log("Page Load Time:", perf.loadEventEnd - perf.startTime);
  }
}

/* -----------------------------
   React Root Initialization
-------------------------------- */
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root container missing in index.html");
}

const root = ReactDOM.createRoot(rootElement);

/* -----------------------------
   Render Application
-------------------------------- */
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

/* -----------------------------
   Initialize Extras
-------------------------------- */
registerServiceWorker();
reportWebVitals();