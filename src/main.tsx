import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './frontend/App.tsx';
import './index.css';
import './i18n/config';

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
  console.group("%c!!! KONTROL CRITICAL REJECTION !!!", "color: white; background: #e11d48; font-weight: bold; padding: 6px; border-radius: 4px;");
  
  const reason = event.reason;
  
  // Cross-context safe error detection
  const isErrorLike = reason && typeof reason === 'object' && ('message' in reason || 'stack' in reason);
  
  if (reason instanceof Error || isErrorLike) {
    const name = reason.name || (reason.constructor ? reason.constructor.name : "Error");
    const message = (reason.message === "" ? "[EMPTY_MESSAGE_STRING]" : (reason.message || "[NULL_OR_UNDEFINED_MESSAGE]"));
    const stack = reason.stack || "[NO_STACK_TRACE]";

    console.error("K-REJECTION-NAME (IDENTIFIED):", name);
    console.error("K-REJECTION-MSG (IDENTIFIED):", message);
    console.error("K-REJECTION-STACK (IDENTIFIED):", stack);
    
    // Log the actual object for deep inspection if it's a generic Error or lacks message
    if (name === "Error" && (message === "[EMPTY_MESSAGE_STRING]" || message === "[NULL_OR_UNDEFINED_MESSAGE]")) {
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
      <App />
    </StrictMode>,
  );
}
