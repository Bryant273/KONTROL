import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './frontend/App.tsx';
import './index.css';
import './i18n/config';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("KONTROL Application Crash caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0a0a0a',
          color: '#f0ede6',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '500px',
            backgroundColor: '#161616',
            border: '1px solid #2a2a2a',
            borderRadius: '1.5rem',
            padding: '2.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              color: '#ef4444',
              fontSize: '24px'
            }}>
              âš 
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#f0ede6' }}>
              KONTROL - DÃ©marrage du SystÃ¨me
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Un dysfonctionnement temporaire est survenu lors de l'initialisation de l'application. Veuillez rafraÃ®chir la page.
            </p>
            {this.state.error?.message && (
              <div style={{
                backgroundColor: '#0f0f0f',
                border: '1px solid #222',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                fontSize: '0.75rem',
                color: '#e24b4a',
                fontFamily: 'monospace',
                marginBottom: '1.5rem',
                wordBreak: 'break-word',
                textAlign: 'left'
              }}>
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#185FA5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

window.addEventListener('error', (event) => {
  console.error("!!! UNHANDLED ERROR DETECTED !!!");
  console.error("Message:", event.message);
  console.error("File:", event.filename);
  console.error("Line/Col:", `${event.lineno}:${event.colno}`);
  console.error("Error Object:", event.error);
  if (event.error?.stack) {
    console.error("Stack Trace:", event.error.stack);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  
  // Suppress benign development Vite WebSocket/HMR connection failures
  if (reason && typeof reason === 'object') {
    const msg = String(reason.message || '');
    const stack = String(reason.stack || '');
    if (msg.includes('WebSocket') || msg.includes('vite') || stack.includes('@vite/client')) {
      event.preventDefault();
      return;
    }
  }
  if (typeof reason === 'string' && (reason.includes('WebSocket') || reason.includes('vite') || reason.includes('HMR'))) {
    event.preventDefault();
    return;
  }

  console.group("%c!!! KONTROL CRITICAL REJECTION !!!", "color: white; background: #e11d48; font-weight: bold; padding: 6px; border-radius: 4px;");
  
  // Cross-context safe error detection
  const isErrorLike = reason && typeof reason === 'object' && ('message' in reason || 'stack' in reason);
  
  if (reason instanceof Error || isErrorLike) {
    let name = String(reason.name || (reason.constructor ? reason.constructor.name : "Error") || "Error").trim() || "Error";
    if (name === "Error") {
      name = "UnhandledPromiseRejection";
    }
    const rawMsg = (reason.message !== undefined && reason.message !== null) ? String(reason.message).trim() : "";
    const message = rawMsg === "" ? "[EMPTY_LIMIT_OR_BLANK_REJECTION_MSG]" : rawMsg;
    const rawStack = (reason.stack !== undefined && reason.stack !== null) ? String(reason.stack).trim() : "";
    const stack = rawStack === "" ? "[NO_STACK_TRACE]" : rawStack;

    // Log identifiers as clear single strings to prevent automatic terminal argument splitting on newlines
    console.error(`K-REJECTION-NAME (IDENTIFIED): ${name}`);
    console.error(`K-REJECTION-MSG (IDENTIFIED): ${message}`);
    console.error(`K-REJECTION-STACK (IDENTIFIED): ${stack}`);
    
    // Log the actual object for deep inspection if it's a generic Error or lacks message
    if (name === "UnhandledPromiseRejection" && rawMsg === "") {
      console.error("K-REJECTION-RAW-ERROR-OBJECT:", reason);
    }
    
    // Check for custom properties
    const customProps: any = {};
    Object.keys(reason).forEach(key => {
      if (key !== 'message' && key !== 'stack' && key !== 'name') {
        customProps[key] = (reason as any)[key];
      }
    });
    if (Object.keys(customProps).length > 0) {
      console.error("K-REJECTION-PROPS:", customProps);
    }
  } else if (typeof reason === 'string') {
    console.error("K-REJECTION-STRING:", reason || "[EMPTY_REASON_STRING]");
  } else if (reason && typeof reason === 'object') {
    console.error("K-REJECTION-OBJECT:", reason);
    try {
      const cache = new Set();
      const json = JSON.stringify(reason, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) return '[Circular]';
          cache.add(value);
        }
        return value;
      }, 2);
      console.error("K-REJECTION-JSON:", json);
    } catch (e) {
      console.error("K-REJECTION-SERIALIZATION-FAILED");
    }
  } else {
    console.error("K-REJECTION-RAW-VALUE:", reason === undefined ? "[UNDEFINED]" : (reason === null ? "[NULL]" : reason));
  }
  
  console.groupEnd();
});

console.log("[KONTROL] System Boot Initiated...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("ROOT ELEMENT NOT FOUND!");
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
