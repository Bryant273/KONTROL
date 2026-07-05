import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './frontend/App.tsx';
import './index.css';
import './i18n/config';

// --- LOCALSTORAGE 24H EXPIRATION OPTIMIZATION ---
(() => {
  const originalSetItem = Storage.prototype.setItem;
  const originalGetItem = Storage.prototype.getItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function(key: string, value: string) {
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const wrappedValue = {
      _v: value,
      _e: expiry,
      _w: true // Wrap indicator
    };
    originalSetItem.call(this, key, JSON.stringify(wrappedValue));
  };

  Storage.prototype.getItem = function(key: string): string | null {
    const rawValue = originalGetItem.call(this, key);
    if (rawValue === null) return null;

    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === 'object' && parsed._w === true) {
        if (Date.now() > parsed._e) {
          // Expired, delete the item and return null
          originalRemoveItem.call(this, key);
          return null;
        }
        return parsed._v;
      }
    } catch (e) {
      // Not JSON or legacy key, fall back to returning original value
    }
    return rawValue;
  };
})();

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
      <App />
    </StrictMode>,
  );
}
