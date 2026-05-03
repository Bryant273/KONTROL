import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './frontend/App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  console.error("GLOBAL ERROR DETECTED:", event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("UNHANDLED REJECTION DETECTED");
  console.error("Reason:", event.reason);
  console.error("Type of reason:", typeof event.reason);
  
  if (event.reason instanceof Error) {
    console.error("Error Name:", event.reason.name || 'N/A');
    console.error("Error Message:", event.reason.message || '(empty message)');
    console.error("Stack trace:", event.reason.stack || 'N/A');
  } else if (typeof event.reason === 'object' && event.reason !== null) {
    try {
      console.error("Reason JSON:", JSON.stringify(event.reason, null, 2));
    } catch (e) {
      console.error("Reason could not be stringified (circular reference?)");
      console.error("Reason Keys:", Object.keys(event.reason));
    }
  } else {
    console.error("Reason value:", String(event.reason));
  }
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
